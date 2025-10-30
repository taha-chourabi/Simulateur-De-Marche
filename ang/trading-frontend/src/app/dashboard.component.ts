import { Component } from '@angular/core';
import { AppComponent } from './app.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AppComponent],
  template: `<app-root></app-root>`,
})
export class DashboardComponent {}
