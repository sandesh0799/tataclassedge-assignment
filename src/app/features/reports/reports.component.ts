import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { InvoiceStore } from '../../core/invoice.store';
import { Invoice, InvoiceStatus, ReportFilters } from '../../models/domain.models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent {
  protected readonly store = inject(InvoiceStore);

  protected readonly displayedColumns = ['id', 'date', 'customer', 'vendor', 'total', 'status'];

  private readonly vendorLabels: Record<string, string> = {
    vend_001: 'Global Vendor Co.',
    vend_002: 'Tech Partners LLC',
    vend_003: 'Cloud Logistics Ltd.'
  };

  vendorLabel(vendorId: string): string {
    return this.vendorLabels[vendorId] ?? vendorId;
  }

  patchFilters(patch: Partial<ReportFilters>): void {
    this.store.updateReportFilters(patch);
  }

  setReportStatus(status: InvoiceStatus | 'All'): void {
    this.patchFilters({ status });
  }

  applyDate(ev: Event, key: 'fromDate' | 'toDate'): void {
    const value = (ev.target as HTMLInputElement).value;
    this.patchFilters({ [key]: value });
  }

  applySearch(ev: Event): void {
    this.patchFilters({ clientOrVendor: (ev.target as HTMLInputElement).value });
  }

  exportCSV(): void {
    const rows = this.store.reportFilteredInvoices();
    const csv = [
      'id,date,customer,vendor,status,amount',
      ...rows.map((r) => `${r.id},${r.date},${r.customerName},${r.vendorId},${r.status},${r.grandTotal}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'erp-invoice-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  exportPDFMock(): void {
    window.print();
  }

  protected trackRow(_: number, row: Invoice): string {
    return row.id;
  }

  statusTone(status: string): 'primary' | 'accent' | 'warn' {
    const s = status.toLowerCase();
    if (s === 'paid') return 'primary';
    if (s === 'pending') return 'accent';
    return 'warn';
  }

  protected readonly statusOptions: (InvoiceStatus | 'All')[] = ['All', 'Paid', 'Pending', 'Overdue'];
}
