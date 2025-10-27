import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { PriceChartComponent } from './chart.component';



type Quote = { ticker: string; price: number; ts: string };
type Side = 'BUY' | 'SELL' | 'PUT' | 'CALL';
type Status = 'NEW' | 'FILLED' | 'REJECTED';

type Order = {
  id: number;
  user: string;
  ticker: string;
  quantity: number;
  limitPrice?: number;
  side: Side;
  status: Status;
  ts: string;
  strike?: number;
  premium?: number;
  expiryDays?: number;
  pnl?: number;
  maxProfit?: number | '∞';
  maxLoss?: number | '∞';
  breakeven?: number;
  gainMarginPct?: number;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule,PriceChartComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  symbols: string[] = [];
  quotes: Quote[] = [];
  orders: Order[] = [];
  private stomp?: Client;

  form: Partial<Order> = {
    user: 'alice',
    ticker: '',
    side: 'BUY',
    quantity: 1
  };

  isSubmitting = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSymbols();
    this.loadOrders();
    this.connectWs();
  }

  ngOnDestroy(): void {
    this.stomp?.deactivate();
  }

  private loadSymbols() {
    this.http.get<string[]>('/api/symbols').subscribe(syms => {
      this.symbols = syms;
      if (!this.form.ticker && syms.length) this.form.ticker = syms[0];
    });
  }

  private loadOrders() {
    this.http.get<Order[]>('/api/orders').subscribe(list => {
      this.orders = list;
      this.recompute();
    });
  }

  // --- correction ici ---
  placeOrder(event?: Event) {
    if (event) event.preventDefault();
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const body = {
      user: this.form.user ?? 'alice',
      ticker: this.form.ticker!,
      side: this.form.side as Side,
      quantity: Number(this.form.quantity ?? 1),
      limitPrice: this.form.limitPrice ?? null,
      strike: this.form.strike ?? this.form.limitPrice ?? null,
      premium: this.form.premium ?? null
    };

    // on NE met plus l’ordre ici pour éviter le doublon
    this.http.post<Order>('/api/orders', body).subscribe({
      next: () => {
        console.log('✅ Ordre envoyé, en attente du WS');
        this.isSubmitting = false;
      },
      error: () => (this.isSubmitting = false)
    });
  }
  // --- fin correction ---

  private connectWs() {
    this.stomp = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (msg) => console.log('[STOMP]', msg)
    });

    this.stomp.onConnect = () => {
      console.log('✅ WebSocket connecté');

      this.stomp?.subscribe('/topic/quotes', (msg: IMessage) => {
        const q: Quote = JSON.parse(msg.body);
        const i = this.quotes.findIndex(x => x.ticker === q.ticker);
        if (i >= 0) this.quotes[i] = q; else this.quotes.push(q);
        this.quotes = [...this.quotes];
        this.recompute();
      });

      this.stomp?.subscribe('/topic/orders', (msg: IMessage) => {
        const o: Order = JSON.parse(msg.body);
        this.orders = [o, ...this.orders];
        this.recompute();
      });
    };

    this.stomp.onWebSocketClose = () => {
      console.warn('🔌 WebSocket fermé, tentative de reconnexion...');
    };

    this.stomp.activate();
  }

  private recompute() {
    const S: Record<string, number> = Object.fromEntries(
      this.quotes.map(q => [q.ticker, q.price])
    );
    this.orders = this.orders.map(o => this.computeOrder(o, S[o.ticker] ?? NaN));
  }

  private computeOrder(o: Order, spot: number): Order {
    const Q = o.quantity ?? 0;
    const K = o.strike ?? o.limitPrice ?? NaN;
    const premium = o.premium ?? 0;

    if (o.side === 'BUY') {
      const cost = o.limitPrice ?? spot;
      o.pnl = isFinite(spot) ? (spot - cost) * Q : 0;
      o.breakeven = cost;
      o.maxProfit = '∞';
      o.maxLoss = isFinite(cost) ? -cost * Q : undefined;
      o.gainMarginPct = isFinite(spot) && spot !== 0
        ? ((spot - cost) / spot) * 100
        : undefined;
      return o;
    }

    if (o.side === 'SELL') {
      const sellPx = o.limitPrice ?? spot;
      o.pnl = isFinite(spot) ? (sellPx - spot) * Q : 0;
      o.breakeven = sellPx;
      o.maxProfit = isFinite(sellPx) ? sellPx * Q : undefined;
      o.maxLoss = '∞';
      o.gainMarginPct = isFinite(sellPx) && sellPx !== 0
        ? ((sellPx - spot) / sellPx) * 100
        : undefined;
      return o;
    }

    if (o.side === 'CALL') {
      const k = isFinite(K) ? K : 0;
      const intrinsic = isFinite(spot) ? Math.max(spot - k, 0) : 0;
      o.pnl = (intrinsic - premium) * Q;
      o.breakeven = k + premium;
      o.maxProfit = '∞';
      o.maxLoss = -premium * Q;
      o.gainMarginPct = premium !== 0
        ? ((intrinsic - premium) / Math.abs(premium)) * 100
        : undefined;
      return o;
    }

    if (o.side === 'PUT') {
      const k = isFinite(K) ? K : 0;
      const intrinsic = isFinite(spot) ? Math.max(k - spot, 0) : 0;
      o.pnl = (intrinsic - premium) * Q;
      o.breakeven = k - premium;
      o.maxProfit = k * Q - premium * Q;
      o.maxLoss = -premium * Q;
      o.gainMarginPct = premium !== 0
        ? ((intrinsic - premium) / Math.abs(premium)) * 100
        : undefined;
      return o;
    }

    return o;
  }
}
