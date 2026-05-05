import { Routes } from '@angular/router';

import { roleGuard } from '../../core/role.guard';
import { InvoiceDetailComponent } from './invoice-detail.component';
import { InvoiceFormComponent } from './invoice-form.component';
import { InvoicesComponent } from './invoices.component';

export const INVOICES_ROUTES: Routes = [
  { path: '', component: InvoicesComponent },
  { path: 'new', component: InvoiceFormComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'Vendor'] } },
  { path: ':id/edit', component: InvoiceFormComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'Vendor'] } },
  { path: ':id', component: InvoiceDetailComponent }
];
