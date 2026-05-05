import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AuthService } from '../../core/auth.service';
import { InvoiceStore } from '../../core/invoice.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, MatCardModule, NgxSkeletonLoaderModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('customerLineHost') private customerLineHost?: ElementRef<HTMLDivElement>;
  @ViewChild('vendorStackHost') private vendorStackHost?: ElementRef<HTMLDivElement>;
  @ViewChild('adminTrendHost') private adminTrendHost?: ElementRef<HTMLDivElement>;
  @ViewChild('adminDonutHost') private adminDonutHost?: ElementRef<HTMLDivElement>;
  @ViewChild('adminBarHost') private adminBarHost?: ElementRef<HTMLDivElement>;

  private charts: ApexCharts[] = [];

  private readonly viewChartsReady = signal(false);

  private rafRedraw = 0;

  protected readonly store = inject(InvoiceStore);
  protected readonly auth = inject(AuthService);
  protected readonly kpis = this.store.kpis;

  protected readonly pageTitle = computed(() => {
    switch (this.auth.role()) {
      case 'Customer':
        return 'KPI Customer';
      case 'Vendor':
        return 'KPI Vendor';
      default:
        return 'Executive overview';
    }
  });

  protected readonly customerMetrics = computed(() => {
    const scoped = this.store.scopedInvoices();
    return {
      recentPurchases: scoped.filter((i) => i.status === 'Paid').reduce((a, i) => a + i.grandTotal, 0),
      currentBalance: scoped.filter((i) => i.status !== 'Paid').reduce((a, i) => a + i.grandTotal, 0)
    };
  });

  protected readonly vendorMetrics = computed(() => {
    const scoped = this.store.scopedInvoices();
    return {
      totalEarnings: scoped.filter((i) => i.status === 'Paid').reduce((a, i) => a + i.grandTotal, 0),
      pendingPayouts: scoped.filter((i) => i.status === 'Pending').reduce((a, i) => a + i.grandTotal, 0)
    };
  });

  protected readonly customerSpendSeries = computed(() => {
    const grouped = new Map<string, number>();
    this.store.scopedInvoices().forEach((inv) => {
      const ym = inv.date.slice(0, 7);
      grouped.set(ym, (grouped.get(ym) ?? 0) + inv.grandTotal);
    });
    const sorted = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
    return {
      categories: sorted.map(([ym]) => new Date(`${ym}-01T12:00:00`).toLocaleString('en-US', { month: 'short' })),
      data: sorted.map(([, v]) => Math.round(v))
    };
  });

  protected readonly vendorStackedSeries = computed(() => {
    const grouped = new Map<string, { paid: number; open: number }>();
    this.store.scopedInvoices().forEach((inv) => {
      const ym = inv.date.slice(0, 7);
      const bucket = grouped.get(ym) ?? { paid: 0, open: 0 };
      if (inv.status === 'Paid') bucket.paid += inv.grandTotal;
      else bucket.open += inv.grandTotal;
      grouped.set(ym, bucket);
    });
    const sorted = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    return {
      categories: sorted.map(([ym]) => new Date(`${ym}-01T12:00:00`).toLocaleString('en-US', { month: 'short' })),
      completed: sorted.map(([, v]) => Math.round(v.paid)),
      pending: sorted.map(([, v]) => Math.round(v.open))
    };
  });

  protected readonly topCounterparties = computed(() => {
    const tally = new Map<string, number>();
    this.store.scopedInvoices().forEach((inv) => tally.set(inv.customerName, (tally.get(inv.customerName) ?? 0) + inv.grandTotal));
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  });

  constructor() {
    effect(() => {
      if (!this.viewChartsReady()) return;
      if (this.store.isLoading()) return;

      this.auth.role();
      this.store.scopedInvoices();
      this.store.monthlyTrend();
      this.store.kpis();

      this.scheduleRedrawCharts();
    });
  }

  private getChartColors(): { primary: string; secondary: string; tertiary: string; quaternary: string } {
    const style = getComputedStyle(document.documentElement);
    return {
      primary: style.getPropertyValue('--erp-chart-primary').trim(),
      secondary: style.getPropertyValue('--erp-chart-secondary').trim(),
      tertiary: style.getPropertyValue('--erp-chart-tertiary').trim(),
      quaternary: style.getPropertyValue('--erp-chart-quaternary').trim()
    };
  }

  ngAfterViewInit(): void {
    this.viewChartsReady.set(true);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafRedraw);
    void this.disposeCharts();
  }

  private scheduleRedrawCharts(): void {
    cancelAnimationFrame(this.rafRedraw);
    this.rafRedraw = requestAnimationFrame(() => {
      this.rafRedraw = 0;
      void this.redrawCharts();
    });
  }

  private clearHost(ref?: ElementRef<HTMLDivElement>): void {
    const host = ref?.nativeElement;
    if (host) host.innerHTML = '';
  }

  private async disposeCharts(): Promise<void> {
    await Promise.all(this.charts.map((chart) => Promise.resolve(chart.destroy())));
    this.charts = [];

    this.clearHost(this.customerLineHost);
    this.clearHost(this.vendorStackHost);
    this.clearHost(this.adminTrendHost);
    this.clearHost(this.adminDonutHost);
    this.clearHost(this.adminBarHost);
  }

  private async redrawCharts(): Promise<void> {
    await this.disposeCharts();

    switch (this.auth.role()) {
      case 'Customer':
        this.mountCustomer();
        break;
      case 'Vendor':
        this.mountVendor();
        break;
      default:
        this.mountAdmin();
        break;
    }
  }

  private pushChart(chart: ApexCharts): void {
    this.charts.push(chart);
    void chart.render();
  }

  private readonly lightChrome: Pick<ApexOptions, 'theme' | 'grid' | 'tooltip' | 'legend'> = {
    theme: { mode: 'light' },
    grid: { borderColor: 'rgba(0,0,0,0.08)' },
    legend: { labels: { colors: 'rgba(0,0,0,0.60)' } },
    tooltip: { theme: 'light' }
  };
  
  private readonly chartResponsiveXY: ApexOptions['responsive'] = [
    {
      breakpoint: 640,
      options: {
        chart: { height: 268 },
        legend: { position: 'bottom', horizontalAlign: 'center', offsetY: 2 },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '62%' } }
      }
    },
    {
      breakpoint: 420,
      options: {
        chart: { height: 232 },
        xaxis: { labels: { rotate: -35, hideOverlappingLabels: true } }
      }
    }
  ];

  private readonly chartResponsiveCompact: ApexOptions['responsive'] = [
    { breakpoint: 640, options: { chart: { height: 252 }, plotOptions: { pie: { donut: { size: '62%' } } } } },
    {
      breakpoint: 420,
      options: {
        chart: { height: 216 },
        legend: { position: 'bottom', offsetY: 0 },
        plotOptions: { pie: { donut: { size: '56%' } } }
      }
    }
  ];

  private readonly chartResponsiveHBar: ApexOptions['responsive'] = [
    { breakpoint: 640, options: { chart: { height: 280 } } },
    { breakpoint: 420, options: { chart: { height: 320 } } }
  ];

  private mountCustomer(): void {
    const el = this.customerLineHost?.nativeElement;
    const { categories, data } = this.customerSpendSeries();
    if (!el || categories.length === 0) return;

    const colors = this.getChartColors();
    const options: ApexOptions = {
      ...this.lightChrome,
      chart: {
        type: 'area',
        height: 300,
        toolbar: { show: false },
        foreColor: 'rgba(0,0,0,0.68)',
        background: 'var(--erp-surface)',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      series: [{ name: 'Spending', data }],
      xaxis: { categories },
      stroke: { curve: 'smooth', width: 2 },
      colors: [colors.primary],
      fill: {
        type: 'gradient',
        gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.35, opacityFrom: 0.45, opacityTo: 0.05 }
      },
      dataLabels: { enabled: false },
      responsive: this.chartResponsiveXY
    };
    this.pushChart(new ApexCharts(el, options));
  }

  private mountVendor(): void {
    const el = this.vendorStackHost?.nativeElement;
    const s = this.vendorStackedSeries();
    if (!el || s.categories.length === 0) return;

    const colors = this.getChartColors();
    const options: ApexOptions = {
      ...this.lightChrome,
      chart: {
        type: 'bar',
        height: 320,
        stacked: true,
        toolbar: { show: false },
        foreColor: 'rgba(0,0,0,0.68)',
        background: 'var(--erp-surface)',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      series: [
        { name: 'Completed invoices', data: s.completed },
        { name: 'Pending', data: s.pending }
      ],
      xaxis: { categories: s.categories },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      colors: [colors.primary, colors.secondary],
      dataLabels: { enabled: false },
      responsive: this.chartResponsiveXY
    };
    this.pushChart(new ApexCharts(el, options));
  }

  private mountAdmin(): void {
    const trend = this.store.monthlyTrend();
    const series = [
      { name: 'Paid', data: trend.map((m) => m.paid) },
      { name: 'Unpaid', data: trend.map((m) => m.pending) },
      { name: 'Overdue', data: trend.map((m) => m.overdue) }
    ];
    const kpis = this.kpis();
    const colors = this.getChartColors();

    if (trend.length > 0) {
      const el = this.adminTrendHost?.nativeElement;
      if (el) {
        const options: ApexOptions = {
          ...this.lightChrome,
          chart: {
            type: 'area',
            height: 300,
            toolbar: { show: false },
            stacked: false,
            foreColor: 'rgba(0,0,0,0.68)',
            background: 'var(--erp-surface)',
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          series,
          xaxis: { categories: trend.map((m) => m.month) },
          stroke: { curve: 'smooth' },
          dataLabels: { enabled: false },
          colors: [colors.primary, colors.tertiary, colors.quaternary],
          responsive: this.chartResponsiveXY
        };
        this.pushChart(new ApexCharts(el, options));
      }
    }

    const donutEl = this.adminDonutHost?.nativeElement;
    if (donutEl) {
      const options: ApexOptions = {
        ...this.lightChrome,
        chart: {
          type: 'donut',
          height: 280,
          foreColor: 'rgba(0,0,0,0.68)',
          background: 'var(--erp-surface)',
          fontFamily: 'Inter, system-ui, sans-serif'
        },
        series: [kpis.paid, kpis.unpaid, kpis.overdue],
        labels: ['Paid', 'Unpaid', 'Overdue'],
        colors: [colors.primary, colors.tertiary, colors.quaternary],
        plotOptions: { pie: { donut: { size: '68%' } } },
        responsive: this.chartResponsiveCompact
      };
      this.pushChart(new ApexCharts(donutEl, options));
    }

    const rows = this.topCounterparties();
    if (rows.length > 0) {
      const el = this.adminBarHost?.nativeElement;
      if (el) {
        const options: ApexOptions = {
          ...this.lightChrome,
          chart: {
            type: 'bar',
            height: 300,
            toolbar: { show: false },
            foreColor: 'rgba(0,0,0,0.68)',
            background: 'var(--erp-surface)',
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          series: [{ name: 'Invoice total', data: rows.map((r) => Math.round(r[1])) }],
          xaxis: { categories: rows.map(([name]) => (name.length > 16 ? `${name.slice(0, 14)}...` : name)) },
          plotOptions: { bar: { borderRadius: 4, horizontal: true } },
          colors: [colors.primary],
          dataLabels: { enabled: false },
          legend: { show: false },
          responsive: this.chartResponsiveHBar
        };
        this.pushChart(new ApexCharts(el, options));
      }
    }
  }
}
