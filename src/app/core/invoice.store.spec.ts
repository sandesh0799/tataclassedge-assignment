import { EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InvoiceStore } from './invoice.store';
import type { Invoice, ReportFilters, User, UserRole } from '../models/domain.models';

class MockApiService {
  getInvoices() {
    return { pipe: () => ({ subscribe: () => undefined }) } as any;
  }
  createInvoice() {
    return { subscribe: () => undefined } as any;
  }
  updateInvoice() {
    return { subscribe: () => undefined } as any;
  }
  deleteInvoice() {
    return { subscribe: () => undefined } as any;
  }
}

class MockNotificationService {
  push() {
    /* noop */
  }
}

class MockAuthService {
  private readonly usersSig = signal<User[]>([]);
  private readonly activeRoleSig = signal<UserRole>('Admin');

  readonly currentUser = () => this.usersSig().find((u) => u.role === this.activeRoleSig()) ?? null;
  readonly role = () => (this.currentUser()?.role ?? 'Customer') as UserRole;

  setUsers(users: User[]) {
    this.usersSig.set(users);
  }
  switchRole(role: UserRole) {
    this.activeRoleSig.set(role);
  }
}

describe('InvoiceStore (signals single source of truth)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const users: User[] = [
    { id: 'u1', name: 'Admin', email: 'a@a.com', role: 'Admin', permissions: ['READ_ALL', 'WRITE_ALL', 'DELETE_ANY', 'VIEW_REPORTS'] },
    { id: 'u2', name: 'Vendor', email: 'v@v.com', role: 'Vendor', vendorId: 'vend_001', permissions: ['READ_OWN', 'WRITE_OWN', 'VIEW_OWN_REPORTS'] },
    { id: 'u3', name: 'Customer', email: 'c@c.com', role: 'Customer', customerId: 'cust_101', permissions: ['READ_OWN'] }
  ];

  const invoices: Invoice[] = [
    {
      id: 'INV-001',
      vendorId: 'vend_001',
      customerId: 'cust_101',
      customerName: 'Alpha Corp',
      date: '2024-03-15',
      dueDate: '2024-04-15',
      status: 'Paid',
      currency: 'USD',
      items: [{ description: 'A', quantity: 1, unitPrice: 100, taxRate: 0.1, total: 110 }],
      subtotal: 100,
      taxTotal: 10,
      grandTotal: 110
    },
    {
      id: 'INV-002',
      vendorId: 'vend_001',
      customerId: 'cust_102',
      customerName: 'Beta Industries',
      date: '2024-04-01',
      dueDate: '2024-05-01',
      status: 'Pending',
      currency: 'USD',
      items: [{ description: 'B', quantity: 2, unitPrice: 50, taxRate: 0, total: 100 }],
      subtotal: 100,
      taxTotal: 0,
      grandTotal: 100
    },
    {
      id: 'INV-003',
      vendorId: 'vend_002',
      customerId: 'cust_101',
      customerName: 'Gamma Systems',
      date: '2024-04-10',
      dueDate: '2024-05-10',
      status: 'Overdue',
      currency: 'USD',
      items: [{ description: 'C', quantity: 1, unitPrice: 200, taxRate: 0, total: 200 }],
      subtotal: 200,
      taxTotal: 0,
      grandTotal: 200
    }
  ];

  function makeStore(auth: MockAuthService) {
    const injector = TestBed.inject(EnvironmentInjector);
    const store = runInInjectionContext(injector, () => new InvoiceStore(new MockApiService() as any, auth as any, new MockNotificationService() as any));
    (store as any).invoices.set(invoices);
    return store;
  }

  it('scopes invoices by role (Admin sees all)', () => {
    const auth = new MockAuthService();
    auth.setUsers(users);
    auth.switchRole('Admin');
    const store = makeStore(auth);
    expect(store.scopedInvoices().length).toBe(3);
  });

  it('scopes invoices by vendorId for Vendor', () => {
    const auth = new MockAuthService();
    auth.setUsers(users);
    auth.switchRole('Vendor');
    const store = makeStore(auth);
    const scoped = store.scopedInvoices();
    expect(scoped.length).toBe(2);
    expect(scoped.every((i) => i.vendorId === 'vend_001')).toBeTrue();
  });

  it('scopes invoices by customerId for Customer', () => {
    const auth = new MockAuthService();
    auth.setUsers(users);
    auth.switchRole('Customer');
    const store = makeStore(auth);
    const scoped = store.scopedInvoices();
    expect(scoped.length).toBe(2);
    expect(scoped.every((i) => i.customerId === 'cust_101')).toBeTrue();
  });

  it('computes KPIs from scoped invoices', () => {
    const auth = new MockAuthService();
    auth.setUsers(users);
    auth.switchRole('Admin');
    const store = makeStore(auth);
    expect(store.kpis().paid).toBe(110);
    expect(store.kpis().unpaid).toBe(100);
    expect(store.kpis().overdue).toBe(200);
  });

  it('filters list by status and resets paging when filter changes', () => {
    const auth = new MockAuthService();
    auth.setUsers(users);
    auth.switchRole('Admin');
    const store = makeStore(auth);

    store.setPage(1, 1);
    expect(store.listPageIndex()).toBe(1);
    store.setStatusFilter('Paid');
    expect(store.listPageIndex()).toBe(0);
    expect(store.listFilteredInvoices().length).toBe(1);
    expect(store.listFilteredInvoices()[0].status).toBe('Paid');
  });

  it('sorts list by configured key + direction', () => {
    const auth = new MockAuthService();
    auth.setUsers(users);
    auth.switchRole('Admin');
    const store = makeStore(auth);

    store.setSort('grandTotal', 'asc');
    const listAsc = store.listFilteredInvoices().map((i) => i.grandTotal);
    expect(listAsc).toEqual([100, 110, 200]);

    store.setSort('grandTotal', 'desc');
    const listDesc = store.listFilteredInvoices().map((i) => i.grandTotal);
    expect(listDesc).toEqual([200, 110, 100]);
  });

  it('paginates the list like server-side paging would', () => {
    const auth = new MockAuthService();
    auth.setUsers(users);
    auth.switchRole('Admin');
    const store = makeStore(auth);

    store.setSort('date', 'asc');
    store.setPage(0, 2);
    expect(store.pagedInvoices().length).toBe(2);
    store.setPage(1, 2);
    expect(store.pagedInvoices().length).toBe(1);
  });

  it('filters reports by date range/status/keyword and computes summary', () => {
    const auth = new MockAuthService();
    auth.setUsers(users);
    auth.switchRole('Admin');
    const store = makeStore(auth);

    const patch: Partial<ReportFilters> = { fromDate: '2024-04-01', toDate: '2024-04-30', status: 'All', clientOrVendor: 'beta' };
    store.updateReportFilters(patch);
    const rows = store.reportFilteredInvoices();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('INV-002');

    const sum = store.reportSummary();
    expect(sum.total).toBe(100);
    expect(sum.paid).toBe(0);
    expect(sum.pending).toBe(100);
  });
});

