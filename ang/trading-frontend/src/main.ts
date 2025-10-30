import './polyfills';
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { ShellComponent } from './app/shell.component';

bootstrapApplication(ShellComponent, {
  providers: [
    provideHttpClient(withFetch()),
    provideRouter(routes),
  ],
}).catch(err => console.error(err));
