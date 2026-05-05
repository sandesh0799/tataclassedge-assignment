import { Injectable, computed, signal } from '@angular/core';

import { User, UserRole } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly users = signal<User[]>([]);
  private readonly activeRole = signal<UserRole>('Admin');

  readonly currentUser = computed(() => this.users().find((u) => u.role === this.activeRole()) ?? null);
  readonly role = computed(() => this.currentUser()?.role ?? 'Customer');

  setUsers(users: User[]): void {
    this.users.set(users);
  }

  switchRole(role: UserRole): void {
    this.activeRole.set(role);
  }

  hasPermission(permission: string): boolean {
    return this.currentUser()?.permissions.includes(permission) ?? false;
  }

  canViewReports(): boolean {
    return this.hasPermission('VIEW_REPORTS') || this.hasPermission('VIEW_OWN_REPORTS');
  }

  canCreateOrEditInvoices(): boolean {
    return this.hasPermission('WRITE_ALL') || this.hasPermission('WRITE_OWN');
  }

  canDeleteInvoices(): boolean {
    return this.hasPermission('DELETE_ANY');
  }
}
