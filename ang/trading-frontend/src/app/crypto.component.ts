import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { createChart, IChartApi, CandlestickData, Time } from 'lightweight-charts';

@Component({
  selector: 'app-crypto',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './crypto.component.html',
  styleUrls: ['./crypto.component.css']
})
export class CryptoComponent implements OnInit, AfterViewInit {
  apiKey = '652777447d4c44b8b608ee40fc40cbe0'; // 🔑 ta clé TwelveData
  symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD'];
  selectedSymbol = 'BTC/USD';
  price: number | null = null;
  amount: number = 0;
  side: 'BUY' | 'SELL' = 'BUY';
  trades: any[] = [];

  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef<HTMLDivElement>;
  chart!: IChartApi;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPrice();
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.loadCandlestickData();
  }

  loadPrice() {
    const url = `https://api.twelvedata.com/price?symbol=${this.selectedSymbol}&apikey=${this.apiKey}`;
    this.http.get<any>(url).subscribe({
      next: (res) => (this.price = parseFloat(res.price)),
      error: (err) => console.error('Erreur API:', err)
    });
  }

  executeTrade() {
    if (!this.price || this.amount <= 0) return alert('Entrée invalide');
    const trade = {
      time: new Date().toLocaleTimeString(),
      symbol: this.selectedSymbol,
      side: this.side,
      amount: this.amount,
      price: this.price,
      total: this.amount * this.price
    };
    this.trades.unshift(trade);
  }

  private initChart() {
    this.chart = createChart(this.chartContainer.nativeElement, {
      width: this.chartContainer.nativeElement.clientWidth,
      height: 400,
      layout: {
        background: { color: '#111827' },
        textColor: '#e5e7eb'
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' }
      },
      timeScale: {
        borderColor: '#374151'
      },
    });
  }

  loadCandlestickData() {
    const [base, quote] = this.selectedSymbol.split('/');
    const url = `https://api.twelvedata.com/time_series?symbol=${base}/${quote}&interval=1h&outputsize=60&apikey=${this.apiKey}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (!res?.values) return;
        const data: CandlestickData[] = res.values.reverse().map((v: any) => ({
          time: (new Date(v.datetime).getTime() / 1000) as Time,
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
        }));

        const series = this.chart.addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444'
        });
        series.setData(data);
      },
      error: (err) => console.error('Erreur graphique:', err)
    });
  }
}
