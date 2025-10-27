import './polyfills';
import 'zone.js'; // ✅ nécessaire pour NG0908
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withFetch())],
}).catch(err => console.error(err));
