import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { createChart, IChartApi, ISeriesApi, LineData, CrosshairMode, UTCTimestamp } from 'lightweight-charts';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type QuoteMsg = { ticker: string; price: number; ts?: string | number };

@Component({
  selector: 'app-price-chart',
  standalone: true,
  template: `
    <div class="chart-wrap" #chartContainer>
      <div class="legend">{{ legend }}</div>
    </div>
  `,
  styles: [`
    .chart-wrap { position: relative; width: 100%; height: 420px; }
    .legend {
      position: absolute; left: 8px; top: 8px; padding: 4px 8px;
      font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      background: rgba(0,0,0,.55); color: #fff; border-radius: 6px;
      pointer-events: none;
    }
  `]
})
export class PriceChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef<HTMLDivElement>;

  private _ticker = 'AAPL';
  @Input() set ticker(v: string) {
    if (v && v !== this._ticker) {
      this._ticker = v;
      this.resetSeries();
    }
  }
  get ticker() { return this._ticker; }

  private chart!: IChartApi;
  private line!: ISeriesApi<'Line'>;
  private data: LineData[] = [];
  private stomp?: Client;
  private ro?: ResizeObserver;
  legend = '—';

  ngAfterViewInit(): void {
    this.chart = createChart(this.chartContainer.nativeElement, {
      layout: { background: { color: '#ffffff' }, textColor: '#111827' },
      grid: { vertLines: { color: '#e5e7eb' }, horzLines: { color: '#e5e7eb' } },
      rightPriceScale: { borderVisible: true, autoScale: true, scaleMargins: { top: 0.1, bottom: 0.15 } },
      timeScale: { borderVisible: true, timeVisible: true, secondsVisible: true, rightBarStaysOnScroll: true },
      crosshair: { mode: CrosshairMode.Normal },
      localization: {
  priceFormatter: (p: number): string => p.toFixed(2),
  timeFormatter: (t: number | UTCTimestamp): string =>
    new Date((t as number) * 1000).toLocaleTimeString()
}

    });

    this.line = this.chart.addLineSeries({
      color: '#2563eb',
      lineWidth: 2,
      lastValueVisible: true,
      priceLineVisible: true
    });

    this.connectWs();
    this.setupResize();
  }

  private setupResize() {
    this.ro = new ResizeObserver(() => {
      const el = this.chartContainer.nativeElement;
      this.chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    this.ro.observe(this.chartContainer.nativeElement);
  }

  private resetSeries() {
    if (!this.chart) return;
    this.data = [];
    this.line.setData(this.data);
    this.legend = `${this.ticker} — en attente…`;
  }

  private toTs(v?: string | number): UTCTimestamp {
    if (typeof v === 'number') return Math.floor(v) as UTCTimestamp;
    if (typeof v === 'string') return Math.floor(Date.parse(v) / 1000) as UTCTimestamp;
    return Math.floor(Date.now() / 1000) as UTCTimestamp;
  }

  private connectWs() {
    this.stomp = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000
    });

    this.stomp.onConnect = () => {
      this.stomp?.subscribe('/topic/quotes', (msg: IMessage) => {
        const q = JSON.parse(msg.body) as QuoteMsg;
        if (q.ticker !== this.ticker) return;

        const point: LineData = { time: this.toTs(q.ts), value: q.price };
        this.data.push(point);
        if (this.data.length > 600) this.data.shift(); // limite l'historique

        // mise à jour incrémentale + légende
        this.line.update(point);
        this.legend = `${this.ticker}  |  ${q.price.toFixed(2)}  @  ${new Date((point.time as number)*1000).toLocaleTimeString()}`;
      });
    };

    this.stomp.activate();
  }

  ngOnDestroy(): void {
    this.stomp?.deactivate();
    this.ro?.disconnect();
    this.chart.remove();
  }
}
