import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { createChart, IChartApi, ISeriesApi, LineData ,UTCTimestamp } from 'lightweight-charts';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Component({
  selector: 'app-price-chart',
  standalone: true,
  template: `<div #chartContainer style="height:400px;width:100%;"></div>`,
})
export class PriceChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef<HTMLDivElement>;
  @Input() ticker: string = 'AAPL';

  private chart!: IChartApi;
  private lineSeries!: ISeriesApi<'Line'>;
  private data: LineData[] = [];
  private stomp?: Client;

  ngAfterViewInit(): void {
    // Création du graphique
    this.chart = createChart(this.chartContainer.nativeElement, {
      layout: { background: { color: '#ffffff' }, textColor: '#222' },
      grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    // ✅ Nouvelle syntaxe (v5)
    this.lineSeries = this.chart.addLineSeries({
      color: '#2962FF',
      lineWidth: 2,
    });

    this.connectWs();
  }

  private connectWs() {
    this.stomp = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
    });

    this.stomp.onConnect = () => {
      console.log(`✅ WebSocket connecté pour ${this.ticker}`);
      this.stomp?.subscribe('/topic/quotes', (msg: IMessage) => {
        const q = JSON.parse(msg.body);
        if (q.ticker === this.ticker) {
          // ✅ Correction du type Time
          const point: LineData = {
  time: Math.floor(Date.now() / 1000) as UTCTimestamp, // ✅
  value: q.price,
};

          this.data.push(point);
          if (this.data.length > 200) this.data.shift();
         this.lineSeries.update(point);

        }
      });
    };

    this.stomp.onWebSocketClose = () => {
      console.warn('🔌 WebSocket fermé, tentative de reconnexion...');
    };

    this.stomp.activate();
  }

  ngOnDestroy(): void {
    this.stomp?.deactivate();
    this.chart.remove();
  }
  ngOnChanges(): void {
  if (this.chart && this.lineSeries) {
    this.data = [];
    this.lineSeries.setData([]);
    console.log(`🔄 Nouveau ticker sélectionné : ${this.ticker}`);
  }
}

}
