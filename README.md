# ERP Dashboard

Production-style ERP Dashboard built with Angular (standalone components) for **Invoices** + **Reports**, with role-based access control.

## Tech stack

- Angular 17+/18 (standalone + lazy routes)
- Angular Signals (`signal` / `computed` / `effect`) as the main store
- Angular Material UI
- Mock API: `json-server` (`src/db.json`)
- Charts: `apexcharts`
- Toasts: `ngx-toastr`
- Skeleton loaders: `ngx-skeleton-loader`

## Setup & run

Install dependencies:

```bash
npm install
```

Terminal 1 (mock API on 3000):

```bash
npm run mock:api
```

Terminal 2 (Angular app on 4200):

```bash
npm start
```

Open `http://localhost:4200`.

## Roles (RBAC)

Use the **Role** dropdown in the header to switch roles.

- **Admin**
  - Dashboard: global KPIs + charts
  - Invoices: full access (create/edit/delete)
  - Reports: access allowed
- **Vendor**
  - Dashboard: earnings + vendor charts
  - Invoices: scoped to vendor, create/edit allowed
  - Reports: access allowed (scoped)
- **Customer**
  - Dashboard: spending + balance
  - Invoices: view-only (scoped)
  - Reports: blocked

Routing enforcement:

- `src/app/core/role.guard.ts`
- `src/app/app.routes.ts`
- `src/app/features/invoices/invoices.routes.ts`

## Features

### Dashboard

- KPI cards: Paid / Unpaid / Overdue (role-aware)
- Charts: trends + distributions (role-aware)

### Invoices

- List: status filter + sorting + pagination
- Detail view
- Upsert form: reactive form + dynamic line items

### Reports

- Filters: date range + status + client/vendor keyword
- Computed summary: totals + growth %
- Export mock: CSV + Print/PDF

## Testing

Run unit tests:

```bash
npm test
```

Key tests:

- `src/app/core/invoice-totals.spec.ts`
- `src/app/core/invoice.store.spec.ts`

## Project structure

```
src/app/core/            store, auth, guards, interceptor, api service
src/app/features/        dashboard, invoices, reports
src/app/layout/          shell (header + sidenav)
src/db.json              json-server data
src/environments/        api base url config
```
