import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '@env/environment'; 

const AUTH_KEY = 'rb_auth';
const THEME_LS = 'rb_theme_dark';
const GUEST_THEME_SS = 'rb_guest_dark';

const API_AUTH = environment.apiUrl + '/auth';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly themeChanged$ = new Subject<void>();
  readonly themeChanged = this.themeChanged$.asObservable();

  initSync(): void {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) {
      this.applyDark(sessionStorage.getItem(GUEST_THEME_SS) === '1');
      return;
    }
    try {
      const s = JSON.parse(raw) as { darkMode?: boolean };
      if (typeof s.darkMode === 'boolean') {
        this.applyDark(s.darkMode);
        return;
      }
    } catch {
      
    }
    this.applyDark(localStorage.getItem(THEME_LS) === '1');
  }

  isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  applyDark(on: boolean): void {
    document.documentElement.classList.toggle('dark', on);
    this.themeChanged$.next();
  }

  persistLoginTheme(dark: boolean, email: string): void {
    this.applyDark(dark);
    localStorage.setItem(THEME_LS, dark ? '1' : '0');
    if (!email) return;
    this.http.patch(`${API_AUTH}/dark-mode`, { email, darkMode: dark }).subscribe({
      error: () => {
      },
    });
  }

  toggle(): void {
    const next = !this.isDark();
    this.applyDark(next);

    const raw = sessionStorage.getItem(AUTH_KEY);
    const loggedIn = !!raw;

    if (!loggedIn) {
      sessionStorage.setItem(GUEST_THEME_SS, next ? '1' : '0');
      return;
    }

    localStorage.setItem(THEME_LS, next ? '1' : '0');
    this.auth.patchSession({ darkMode: next });

    let email = '';
    try {
      const s = JSON.parse(raw!) as { email?: string };
      if (s.email) email = String(s.email);
    } catch {
      
    }
    if (!email) return;

    this.http.patch(`${API_AUTH}/dark-mode`, { email, darkMode: next }).subscribe({
      error: () => {
        
      },
    });
  }

  onLogout(): void {
    const keepDark = this.isDark();
    sessionStorage.setItem(GUEST_THEME_SS, keepDark ? '1' : '0');
    localStorage.removeItem(THEME_LS);
    this.applyDark(keepDark);
  }
}
