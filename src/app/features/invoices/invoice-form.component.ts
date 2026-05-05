import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { map } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { InvoiceStore } from '../../core/invoice.store';
import { Invoice, InvoiceStatus } from '../../models/domain.models';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(InvoiceStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly invoiceId = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), { initialValue: null });
  private hydratedForId: string | null = null;

  protected readonly form = this.fb.group({
    id: ['', Validators.required],
    customerId: ['', Validators.required],
    customerName: ['', Validators.required],
    date: ['', Validators.required],
    dueDate: ['', Validators.required],
    status: ['Pending', Validators.required],
    currency: ['USD', Validators.required],
    items: this.fb.array([this.createItemGroup()])
  });

  constructor() {
    effect(() => {
      const id = this.invoiceId();
      const invoices = this.store.scopedInvoices();

      if (!id) {
        if (this.hydratedForId !== null) this.resetBlank();
        this.hydratedForId = null;
        this.form.controls.id.enable({ emitEvent: false });
        return;
      }

      const inv = invoices.find((row) => row.id === id);
      if (!inv || this.hydratedForId === id) return;
      this.hydratedForId = id;
      this.patchFromInvoice(inv);
      this.form.controls.id.disable({ emitEvent: false });
    });
  }

  protected get items(): FormArray {
    return this.form.controls.items;
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid || !this.auth.currentUser()) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const items = payload.items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const taxRate = Number(item.taxRate);
      return { ...item, description: item.description ?? '', quantity, unitPrice, taxRate, total: quantity * unitPrice * (1 + taxRate) };
    });

    const subtotal = items.reduce((acc: number, item: { quantity: number; unitPrice: number }) => acc + item.quantity * item.unitPrice, 0);
    const taxTotal = items.reduce(
      (acc: number, item: { quantity: number; unitPrice: number; taxRate: number }) => acc + item.quantity * item.unitPrice * item.taxRate,
      0
    );

    const role = this.auth.role();
    const vendorId =
      role === 'Admin'
        ? (this.store.scopedInvoices().find((i) => i.id === payload.id)?.vendorId ?? 'vend_001')
        : (this.auth.currentUser()?.vendorId ?? 'vend_001');

    const body: Invoice = {
      id: payload.id ?? '',
      customerId: payload.customerId ?? '',
      customerName: payload.customerName ?? '',
      date: payload.date ?? '',
      dueDate: payload.dueDate ?? '',
      status: (payload.status ?? 'Pending') as InvoiceStatus,
      currency: payload.currency ?? 'USD',
      vendorId,
      items,
      subtotal,
      taxTotal,
      grandTotal: subtotal + taxTotal
    };

    this.store.saveInvoice(body);
    this.router.navigate(['/invoices']);
  }

  cancel(): void {
    this.router.navigate(['/invoices']);
  }

  /** Stable row keys for `@for`; indices match `FormArray` order. */
  protected trackLine(i: number): number {
    return i;
  }

  private patchFromInvoice(inv: Invoice): void {
    this.form.patchValue({
      id: inv.id,
      customerId: inv.customerId,
      customerName: inv.customerName,
      date: inv.date,
      dueDate: inv.dueDate,
      status: inv.status,
      currency: inv.currency
    });
    while (this.items.length) this.items.removeAt(0);
    inv.items.forEach((line) =>
      this.items.push(
        this.fb.group({
          description: [line.description, Validators.required],
          quantity: [line.quantity, [Validators.required, Validators.min(1)]],
          unitPrice: [line.unitPrice, [Validators.required, Validators.min(0)]],
          taxRate: [line.taxRate, [Validators.required, Validators.min(0)]]
        })
      )
    );
    if (!this.items.length) this.items.push(this.createItemGroup());
  }

  private resetBlank(): void {
    this.form.reset({
      id: '',
      customerId: '',
      customerName: '',
      date: '',
      dueDate: '',
      status: 'Pending',
      currency: 'USD'
    });
    while (this.items.length > 1) this.items.removeAt(1);
    this.items.at(0).reset({ description: '', quantity: 1, unitPrice: 0, taxRate: 0.1 });
  }

  private createItemGroup() {
    return this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [0.1, [Validators.required, Validators.min(0)]]
    });
  }
}
