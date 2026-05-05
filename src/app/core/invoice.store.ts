import { Injectable, computed, effect, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { Invoice, InvoiceStatus, ReportFilters } from '../models/domain.models';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class InvoiceStore {
  private readonly invoices = signal<Invoice[]>([]);
  private readonly loading = signal(false);
  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(5);
  private readonly sortKey = signal<'date' | 'dueDate' | 'grandTotal'>('date');
  private readonly sortDirection = signal<'asc' | 'desc'>('desc');
  private readonly statusFilter = signal<InvoiceStatus | 'All'>('All');

  readonly reportFilters = signal<ReportFilters>({ status: 'All', fromDate: '', toDate: '', clientOrVendor: '' });
  readonly isLoading = computed(() => this.loading());

  readonly scopedInvoices = computed(() => {
    const role = this.auth.role();
    const user = this.auth.currentUser();
    const data = this.invoices();
    if (role === 'Admin' || !user) return data;
    if (role === 'Vendor') return data.filter((i) => i.vendorId === user.vendorId);
    return data.filter((i) => i.customerId === user.customerId);
  });

  readonly kpis = computed(() => {
    const scoped = this.scopedInvoices();
    return {
      paid: scoped.filter((i) => i.status === 'Paid').reduce((a, b) => a + b.grandTotal, 0),
      unpaid: scoped.filter((i) => i.status === 'Pending').reduce((a, b) => a + b.grandTotal, 0),
      overdue: scoped.filter((i) => i.status === 'Overdue').reduce((a, b) => a + b.grandTotal, 0)
    };
  });

  readonly monthlyTrend = computed(() => {
    const grouped = new Map<string, { paid: number; pending: number; overdue: number }>();
    this.scopedInvoices().forEach((invoice) => {
      const ym = invoice.date.slice(0, 7);
      const bucket = grouped.get(ym) ?? { paid: 0, pending: 0, overdue: 0 };
      if (invoice.status === 'Paid') bucket.paid += invoice.grandTotal;
      if (invoice.status === 'Pending') bucket.pending += invoice.grandTotal;
      if (invoice.status === 'Overdue') bucket.overdue += invoice.grandTotal;
      grouped.set(ym, bucket);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, value]) => ({
        month: new Date(`${ym}-01T12:00:00`).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        ...value
      }));
  });

  readonly listFilteredInvoices = computed(() => {
    let list = [...this.scopedInvoices()];
    if (this.statusFilter() !== 'All') list = list.filter((i) => i.status === this.statusFilter());
    return this.sortInvoiceList(list);
  });

  readonly reportFilteredInvoices = computed(() => {
    let list = [...this.scopedInvoices()];
    const reportFilter = this.reportFilters();
    if (reportFilter.status !== 'All') list = list.filter((i) => i.status === reportFilter.status);
    if (reportFilter.fromDate) list = list.filter((i) => i.date >= reportFilter.fromDate);
    if (reportFilter.toDate) list = list.filter((i) => i.date <= reportFilter.toDate);
    if (reportFilter.clientOrVendor) {
      const keyword = reportFilter.clientOrVendor.toLowerCase();
      list = list.filter((i) => i.customerName.toLowerCase().includes(keyword) || i.vendorId.toLowerCase().includes(keyword));
    }
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return list;
  });

  readonly pagedInvoices = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.listFilteredInvoices().slice(start, start + this.pageSize());
  });

  readonly totalInvoices = computed(() => this.listFilteredInvoices().length);

  readonly totalListPages = computed(() => Math.max(1, Math.ceil(this.totalInvoices() / this.pageSize())));

  readonly currentListPageDisplay = computed(() => this.pageIndex() + 1);

  readonly listPageSize = computed(() => this.pageSize());

  readonly listPageIndex = computed(() => this.pageIndex());

  readonly listStatusFilter = computed(() => this.statusFilter());

  readonly reportSummary = computed(() => {
    const invoices = this.reportFilteredInvoices();
    const total = invoices.reduce((acc, invoice) => acc + invoice.grandTotal, 0);
    const paid = invoices.filter((i) => i.status === 'Paid').reduce((acc, invoice) => acc + invoice.grandTotal, 0);
    const pending = invoices.filter((i) => i.status === 'Pending').reduce((acc, invoice) => acc + invoice.grandTotal, 0);
    const overdue = invoices.filter((i) => i.status === 'Overdue').reduce((acc, invoice) => acc + invoice.grandTotal, 0);
    const collectionRate = total > 0 ? (paid / total) * 100 : 0;
    const sorted = [...invoices].sort((a, b) => a.date.localeCompare(b.date));
    const mid = Math.max(1, Math.floor(sorted.length / 2));
    const olderSlice = sorted.slice(0, mid);
    const newerSlice = sorted.slice(mid);
    const sum = (rows: Invoice[]) => rows.reduce((s, i) => s + i.grandTotal, 0);
    const olderSum = sum(olderSlice);
    const newerSum = sum(newerSlice);
    const periodGrowth = olderSum > 0 ? ((newerSum - olderSum) / olderSum) * 100 : newerSum > 0 ? 100 : 0;
    return { total, paid, pending, overdue, collectionRate, periodGrowth };
  });

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly notify: NotificationService
  ) {
    effect(
      () => {
        this.auth.role();
        this.pageIndex.set(0);
      },
      { allowSignalWrites: true }
    );
  }

  loadInvoices(): void {
    this.loading.set(true);
    this.api.getInvoices().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (invoices) => this.invoices.set(invoices)
    });
  }

  saveInvoice(invoice: Invoice): void {
    const existing = this.invoices().find((i) => i.id === invoice.id);
    const request$ = existing ? this.api.updateInvoice(invoice) : this.api.createInvoice(invoice);
    request$.subscribe({
      next: (saved) => {
        this.invoices.update((state) =>
          existing ? state.map((invoiceItem) => (invoiceItem.id === saved.id ? saved : invoiceItem)) : [saved, ...state]);
        this.notify.push(existing ? 'Invoice updated successfully' : 'Invoice created successfully', 'success');
      }
    });
  }

  deleteInvoice(id: string): void {
    this.api.deleteInvoice(id).subscribe({
      next: () => {
        this.invoices.update((state) => state.filter((i) => i.id !== id));
        this.notify.push('Invoice removed', 'success');
      }
    });
  }

  setStatusFilter(status: InvoiceStatus | 'All'): void {
    this.statusFilter.set(status);
    this.pageIndex.set(0);
  }

  setSort(sortKey: 'date' | 'dueDate' | 'grandTotal', direction: 'asc' | 'desc'): void {
    this.sortKey.set(sortKey);
    this.sortDirection.set(direction);
  }

  setPage(index: number, size: number): void {
    this.pageIndex.set(index);
    this.pageSize.set(size);
  }

  updateReportFilters(filters: Partial<ReportFilters>): void {
    this.reportFilters.update((current) => ({ ...current, ...filters }));
  }

  private sortInvoiceList(list: Invoice[]): Invoice[] {
    return list.sort((a, b) => {
      const key = this.sortKey();
      const first = a[key];
      const second = b[key];
      const result = first > second ? 1 : first < second ? -1 : 0;
      return this.sortDirection() === 'asc' ? result : -result;
    });
  }
}
