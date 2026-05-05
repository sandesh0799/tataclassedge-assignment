import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { InvoiceStore } from '../core/invoice.store';
import { UserRole } from '../models/domain.models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent implements OnInit {
  protected readonly roles: UserRole[] = ['Admin', 'Vendor', 'Customer'];
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);

  protected readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 900px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  private readonly api = inject(ApiService);
  private readonly invoiceStore = inject(InvoiceStore);

  ngOnInit(): void {
    this.api.getUsers().subscribe((users) => this.auth.setUsers(users));
    this.invoiceStore.loadInvoices();
  }

  protected drawerOpened(): boolean {
    return this.isMobile() ? this.menuOpen() : true;
  }

  protected drawerMode(): 'over' | 'side' {
    return this.isMobile() ? 'over' : 'side';
  }

  toggleMenu(): void {
    if (this.isMobile()) this.menuOpen.update((open) => !open);
  }

  onDrawerChange(opened: boolean): void {
    if (this.isMobile()) this.menuOpen.set(opened);
  }

  onNavigate(): void {
    if (this.isMobile()) this.menuOpen.set(false);
  }

  trackRole(_index: number, role: UserRole): string {
    return role;
  }
}
