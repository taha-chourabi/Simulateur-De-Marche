import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { CryptoComponent } from './crypto.component';

export const routes: Routes = [
  { path: '', component: AppComponent },
  { path: 'crypto', component: CryptoComponent },
];
