import { Routes } from '@angular/router';

import { roleGuard } from './core/role.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'invoices', loadChildren: () => import('./features/invoices/invoices.routes').then((m) => m.INVOICES_ROUTES) },
      { path: 'reports', canActivate: [roleGuard], data: { roles: ['Admin', 'Vendor'] }, loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
