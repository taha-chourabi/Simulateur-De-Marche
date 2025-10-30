import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { PriceChartComponent } from './chart.component';
import { RouterModule } from '@angular/router'; // ✅ nécessaire


type Quote = { ticker: string; price: number; ts: string };
type Side =
  | 'BUY'
  | 'SELL'
  | 'PUT'
  | 'CALL'
  | 'STRADDLE'
  | 'STRANGLE'
  | 'SPREAD';
type Status = 'NEW' | 'FILLED' | 'REJECTED';

interface Order {
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
  gainMarginPct?: number;
  stopLoss?: number;
  takeProfit?: number;
  breakeven?: number | string;
  beLow?: number;
  beHigh?: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, PriceChartComponent , RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
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
    quantity: undefined,
    stopLoss: undefined,
    takeProfit: undefined,
  };

  selectedOrder?: Order;
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
    this.http.get<string[]>('/api/symbols').subscribe({
      next: (syms) => {
        this.symbols = syms ?? [];
        if (!this.form.ticker && this.symbols.length)
          this.form.ticker = this.symbols[0];
      },
      error: (_) => {
        this.symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];
        if (!this.form.ticker) this.form.ticker = this.symbols[0];
      },
    });
  }

  private loadOrders() {
    this.http.get<Order[]>('/api/orders').subscribe((list) => {
      this.orders = list;
      this.recompute();
    });
  }

placeOrder(event?: Event) {
  if (event) event.preventDefault();
  if (this.isSubmitting) return;

  if (!this.form.quantity || this.form.quantity <= 0) {
    alert('Quantité invalide');
    return;
  }

  this.isSubmitting = true;

  const body = {
    user: this.form.user ?? 'alice',
    ticker: this.form.ticker!,
    side: this.form.side as Side,
    quantity: Number(this.form.quantity),
    limitPrice: this.form.limitPrice ?? undefined,
    strike: this.form.strike ?? this.form.limitPrice ?? undefined,
    premium: this.form.premium ?? undefined,
  };

  this.http.post<Order>('/api/orders', body).subscribe({
    next: (o) => {
      // ✅ Conserve les champs stopLoss et takeProfit saisis dans le formulaire
      o.stopLoss = this.form.stopLoss;
      o.takeProfit = this.form.takeProfit;

      // ✅ Évite les doublons (remplace l'ordre si déjà présent)
      this.orders = [o, ...this.orders.filter(x => x.id !== o.id)];

      // ✅ Met à jour le calcul local
      this.recompute();

      this.isSubmitting = false;
      console.log('✅ Ordre ajouté avec Stop Loss et Take Profit');
    },
    error: () => (this.isSubmitting = false),
  });
}




  private connectWs() {
    this.stomp = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
    });

    this.stomp.onConnect = () => {
      this.stomp?.subscribe('/topic/quotes', (msg: IMessage) => {
        const q: Quote = JSON.parse(msg.body);
        const i = this.quotes.findIndex((x) => x.ticker === q.ticker);
        if (i >= 0) this.quotes[i] = q;
        else this.quotes.push(q);
        this.quotes = [...this.quotes];
        this.recompute();
      });

      this.stomp?.subscribe('/topic/orders', (msg: IMessage) => {
        const o: Order = JSON.parse(msg.body);
        this.orders = [o, ...this.orders];
        this.recompute();
      });
    };

    this.stomp.activate();
  }

  private recompute() {
    const prices: Record<string, number> = Object.fromEntries(
      this.quotes.map((q) => [q.ticker, q.price])
    );
    this.orders = this.orders.map((o) =>
      this.computeOrder(o, prices[o.ticker] ?? NaN)
    );
  }

  private computeOrder(o: Order, spot: number): Order {
    const Q = o.quantity ?? 0;
    const K = o.strike ?? o.limitPrice ?? NaN;
    const P = o.premium ?? 0;

    switch (o.side) {
      case 'BUY': {
        const cost = o.limitPrice ?? spot;
        o.pnl = (spot - cost) * Q;
        o.breakeven = cost;
        o.maxProfit = '∞';
        o.maxLoss = -cost * Q;
        break;
      }

      case 'SELL': {
        const px = o.limitPrice ?? spot;
        o.pnl = (px - spot) * Q;
        o.breakeven = px;
        o.maxProfit = px * Q;
        o.maxLoss = '∞';
        break;
      }

      case 'CALL': {
        const intrinsic = Math.max(spot - K, 0);
        o.pnl = (intrinsic - P) * Q;
        o.breakeven = K + P;
        o.maxProfit = '∞';
        o.maxLoss = -P * Q;
        break;
      }

      case 'PUT': {
        const intrinsic = Math.max(K - spot, 0);
        o.pnl = (intrinsic - P) * Q;
        o.breakeven = K - P;
        o.maxProfit = (K - P) * Q;
        o.maxLoss = -P * Q;
        break;
      }

      case 'STRADDLE': {
        const intrinsicCall = Math.max(spot - K, 0);
        const intrinsicPut = Math.max(K - spot, 0);
        const total = intrinsicCall + intrinsicPut;
        o.pnl = (total - 2 * P) * Q;
        o.beLow = K - P;
        o.beHigh = K + P;
        o.breakeven = `${o.beLow.toFixed(2)} / ${o.beHigh.toFixed(2)}`;
        o.maxProfit = '∞';
        o.maxLoss = -2 * P * Q;
        break;
      }

      case 'STRANGLE': {
        const kPut = K * 0.98;
        const kCall = K * 1.02;
        const total = Math.max(spot - kCall, 0) + Math.max(kPut - spot, 0);
        o.pnl = (total - 2 * P) * Q;
        o.beLow = kPut - P;
        o.beHigh = kCall + P;
        o.breakeven = `${o.beLow.toFixed(2)} / ${o.beHigh.toFixed(2)}`;
        o.maxProfit = '∞';
        o.maxLoss = -2 * P * Q;
        break;
      }

      case 'SPREAD': {
        const kHigh = K * 1.05;
        const spread = Math.max(spot - K, 0) - Math.max(spot - kHigh, 0);
        o.pnl = (spread - P) * Q;
        o.breakeven = K + P;
        o.maxProfit = (kHigh - K - P) * Q;
        o.maxLoss = -P * Q;
        break;
      }
    }

    // === Stop Loss & Take Profit logic ===
    if (isFinite(spot)) {
      if (o.stopLoss != null) {
        if ((o.side === 'BUY' || o.side === 'CALL') && spot <= o.stopLoss) {
          o.status = 'FILLED';
          o.pnl = (o.stopLoss - (o.limitPrice ?? o.stopLoss)) * o.quantity;
        }
        if ((o.side === 'SELL' || o.side === 'PUT') && spot >= o.stopLoss) {
          o.status = 'FILLED';
          o.pnl = ((o.limitPrice ?? spot) - o.stopLoss) * o.quantity;
        }
      }

      if (o.takeProfit != null) {
        if ((o.side === 'BUY' || o.side === 'CALL') && spot >= o.takeProfit) {
          o.status = 'FILLED';
          o.pnl = (o.takeProfit - (o.limitPrice ?? o.takeProfit)) * o.quantity;
        }
        if ((o.side === 'SELL' || o.side === 'PUT') && spot <= o.takeProfit) {
          o.status = 'FILLED';
          o.pnl = ((o.limitPrice ?? spot) - o.takeProfit) * o.quantity;
        }
      }
    }

    // === Gain % calculation ===
    if (isFinite(spot) && spot !== 0 && o.limitPrice) {
      o.gainMarginPct = ((spot - o.limitPrice) / o.limitPrice) * 100;
    }

    return o;
  }

  selectOrder(o: Order) {
    this.selectedOrder = o;
  }

  deleteOrder(o: Order, e: Event) {
    e.stopPropagation();
    if (confirm(`Supprimer l’ordre #${o.id}?`)) {
      this.orders = this.orders.filter((x) => x.id !== o.id);
      if (this.selectedOrder?.id === o.id) this.selectedOrder = undefined;
    }
  }
}
