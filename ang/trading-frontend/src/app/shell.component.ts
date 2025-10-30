import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterModule],
  template: `
    <nav style="display:flex;gap:16px;padding:10px;background:#0d1117;color:white">
      <a routerLink="/" routerLinkActive="active">🏠 Dashboard</a>
      <a routerLink="/crypto" routerLinkActive="active">🪙 Crypto</a>
    </nav>

    <!-- C’est ici que les pages changent -->
    <router-outlet></router-outlet>
  `,
})
export class ShellComponent {}
