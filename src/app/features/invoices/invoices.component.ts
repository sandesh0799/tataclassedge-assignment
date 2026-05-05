import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AuthService } from '../../core/auth.service';
import { InvoiceStore } from '../../core/invoice.store';
import { InvoiceStatus } from '../../models/domain.models';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    DatePipe,
    CurrencyPipe,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCardModule,
    MatChipsModule,
    NgxSkeletonLoaderModule
  ],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoicesComponent {
  protected readonly store = inject(InvoiceStore);
  protected readonly auth = inject(AuthService);
  protected readonly statuses: (InvoiceStatus | 'All')[] = ['All', 'Paid', 'Pending', 'Overdue'];
  protected readonly sortState = signal<{ key: 'date' | 'dueDate' | 'grandTotal'; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  protected readonly pageSizeOptions = [5, 10, 25];

  protected readonly displayedColumns = ['id', 'date', 'dueDate', 'customer', 'amount', 'status', 'actions'];

  private readonly router = inject(Router);

  onStatusChange(value: string): void {
    this.store.setStatusFilter(value as InvoiceStatus | 'All');
  }

  onSort(key: 'date' | 'dueDate' | 'grandTotal'): void {
    const current = this.sortState();
    const dir = current.key === key && current.dir === 'asc' ? 'desc' : 'asc';
    this.sortState.set({ key, dir });
    this.store.setSort(key, dir);
  }

  sortIndicator(key: 'date' | 'dueDate' | 'grandTotal'): string {
    if (this.sortState().key !== key) return '';
    return this.sortState().dir === 'asc' ? '↑' : '↓';
  }

  onPage(ev: PageEvent): void {
    this.store.setPage(ev.pageIndex, ev.pageSize);
  }

  onPageSizeChange(size: number): void {
    this.store.setPage(0, size);
  }

  openDetail(id: string): void {
    this.router.navigate(['/invoices', id]);
  }

  createInvoice(): void {
    this.router.navigate(['/invoices/new']);
  }

  trackById(_: number, invoice: { id: string }): string {
    return invoice.id;
  }

  statusTone(status: string): 'primary' | 'accent' | 'warn' {
    const s = status.toLowerCase();
    if (s === 'paid') return 'primary';
    if (s === 'pending') return 'accent';
    return 'warn';
  }
}
