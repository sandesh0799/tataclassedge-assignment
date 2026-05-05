# ERP Dashboard (Angular assignment)

Production-style **Invoice & Reporting** app: **standalone components**, **Signals** (`signal` / `computed` / `effect`), **`OnPush`**, **`json-server`**, functional **RBAC guards**, ApexCharts dashboards, skeleton loading, global error toasts.

## Prerequisites

- Node 18+
- Angular CLI (`npx ng ...` works from this repo)

## Run locally

Terminal 1 — mock REST API:

```bash
npm install
npm run mock:api
```

Terminal 2 — Angular app:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200).

API base: `src/environments/environment.ts` → `http://localhost:3000` (see `src/db.json`).

## Role preview (RBAC demo)

Use **Preview role** in the **header** to switch Admin / Vendor / Customer without re-login.

| Role       | Dashboard | Invoices                         | Reports   | Notes |
|-----------|-----------|----------------------------------|-----------|--------|
| **Admin** | Global KPIs: **Paid / Unpaid / Overdue**, monthly trend + donut + top counterparties | Full list · create · edit (`roleGuard`) · delete (API `DELETE`) | Filters + summary + CSV / print mock | Permissions in `users` (`db.json`). |
| **Vendor**| Earnings / pending payouts, stacked bars by month | Scoped to `vendorId` · create / edit allowed | Scoped report + CSV / print mock | `.canViewReports()` |
| **Customer** | Spending + outstanding balance + line chart | **View-only**: list + detail; **no** new/edit routes (`roleGuard`) | Route hidden (`canActivate` Vendor+Admin only) | `READ_OWN` only. |

Evidence of RBAC:

- Guards: `src/app/core/role.guard.ts`  
- Routes: `src/app/app.routes.ts`, `src/app/features/invoices/invoices.routes.ts`  
- Scoped data: `InvoiceStore.scopedInvoices`, `InvoiceStore.effect` syncing pages on role switch  
- Buttons: invoices list / detail gated with `AuthService` helpers  

## Requirement checklist (assignment spec)

### §2 Architecture & stack

| Requirement | Implementation |
|-------------|------------------|
| Angular 17+ standalone | All feature components `standalone: true`; shell + lazy routes (`loadComponent` / `loadChildren`). See `angular.json`. |
| State: Signals (+ optional RxJS HTTP) | `InvoiceStore`: `signal` / `computed` / `effect`; HTTP in `ApiService` + RxJS `.pipe()` only for API streams. |
| UI | **Angular Material** + ERP palette in `:root` (`src/styles.scss`): teal header `#1a7a8c`, highlight `#d0e8ed`, page bg `#f4f7f8`, sidebar `#eceff1`, white cards. |
| **`OnPush`** | Feature components declare `ChangeDetectionStrategy.OnPush` (Angular schematics default in `angular.json`). |
| Mock API | **`json-server`**: `npm run mock:api` watches `src/db.json`. |
| Lazy routes + guards | `app.routes.ts`, `INVOICES_ROUTES` + functional `roleGuard`. |
| Toast / errors UI | **`ngx-toastr`** (`provideToastr` in `app.config.ts`, styles in `angular.json`); `NotificationService` wraps `ToastrService` for **success / error / info** used by `InvoiceStore` + `error.interceptor`. |

### §3 Roles

Covered via `src/db.json` `users.permissions` + `AuthService` + `roleGuard`; navigation adapts per role in `shell.component.html`.

### §4 Modules

#### 4.1 Dashboard

| Item | Implementation |
|------|----------------|
| KPIs | Admin: Paid / **Unpaid** (Pending totals) / Overdue (`InvoiceStore.kpis`). Customer/Vendor variants in `dashboard.component.html`. |
| Charts (ApexCharts) | Pure `apexcharts` (no Angular wrapper dependency): Customer line, Vendor stacked bars, Admin area + donut. `dashboard.component.ts`. |
| Role adaptation | `@switch(auth.role())` in dashboard template hides/show layouts. |

#### 4.2 Invoices

| Item | Implementation |
|------|----------------|
| List | Sorting, status filter, page size + pagination (`invoice.store.ts`). |
| Detail | `invoice-detail.component` — metadata + lines. |
| Upsert reactive form | `invoice-form.component` dynamic `FormArray` line items, computed totals on save. |
| **trackBy** | `invoices.component.ts` (`trackById`), `reports`, invoice lines (`trackLineItem` / `trackLine`), `@for (... track ...)` |

#### 4.3 Reports

| Item | Implementation |
|------|----------------|
| Filters | Date range + status + client/vendor text (`InvoiceStore.reportFilters`, `reports.component.html`). Separated list vs reports dataset in store (`listFilteredInvoices` vs `reportFilteredInvoices`). |
| Derived insights | `reportSummary`: totals, collection rate, period growth (`computed`). |
| Export | CSV blob + window.print (“PDF mock”). |

### §5 Technical design

| Item | Evidence |
|------|----------|
| Single source of truth | `InvoiceStore` holds fetched invoices + filters; KPIs/dashboard/reports/read from `computed` slices. |
| Skeleton / loading | Material progress bars (`mat-progress-bar`) shown during `invoiceStore.loadInvoices()` and route-level loading states. |
| Errors | Global `HttpInterceptorFn`: `src/app/core/error.interceptor.ts` pushes toasts. Success toasts for saves still from `InvoiceStore` where configured. |
| Responsiveness | Mobile-first layouts via CSS Grid/Flex; sidenav switches `side`/`over` with `BreakpointObserver`; tables/charts wrap or scroll on narrow screens. |

### §6 Polish

Modernized Material UI polish:

- Consistent ERP theme tokens in `src/styles.scss` (teal header, soft neutral surfaces, readable contrast)
- Unified cards/forms/tables in feature SCSS (`dashboard`, `invoices`, `reports`, `invoice-form`, `invoice-detail`)
- Toast notifications styled for visibility with `ngx-toastr`

### §7 Tests & submission

| Submission item | Status |
|----------------|--------|
| Public GitHub repo | — *push your fork* |
| README (architecture + setup) | This file |
| Screenshots Admin / Vendor / Customer | Capture after `mock:api` + `npm start` |
| OnPush & Signals proof | Inspect component files + store as above |
| Optional unit tests | `src/app/core/invoice-totals.spec.ts` (invoice line math sanity) |

```bash
npm test
```

## Project layout (orientation)

```
src/app/core/          InvoiceStore (signals), AuthService, guards, interceptor, ApiService
src/app/features/       dashboard · invoices (+ routes) · reports
src/app/layout/         Shell (header, sidebar)
src/db.json             json-server mock data
```

## Licence

Submission / coursework use.
