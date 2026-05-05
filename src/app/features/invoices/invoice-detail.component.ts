import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { map } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { InvoiceStore } from '../../core/invoice.store';
import { InvoiceItem } from '../../models/domain.models';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink, MatCardModule, MatButtonModule, MatChipsModule, MatDividerModule, MatProgressBarModule],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(InvoiceStore);

  private readonly invoiceId = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), { initialValue: null });

  protected readonly invoice = computed(() => {
    const id = this.invoiceId();
    if (!id) return undefined;
    return this.store.scopedInvoices().find((i) => i.id === id);
  });

  deleteInvoice(id: string): void {
    this.store.deleteInvoice(id);
    this.router.navigate(['/invoices']);
  }

  protected trackLineItem(index: number, item: InvoiceItem): string {
    return `${index}-${item.description}`;
  }

  statusTone(status: string): 'primary' | 'accent' | 'warn' {
    const s = status.toLowerCase();
    if (s === 'paid') return 'primary';
    if (s === 'pending') return 'accent';
    return 'warn';
  }
}
