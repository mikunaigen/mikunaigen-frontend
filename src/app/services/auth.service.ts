import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '@env/environment';

const AUTH_KEY = 'rb_auth';

export type AuthSession = {
  token?: string;
  email?: string;
  userId?: string;
  role?: string;
  firstLogin?: boolean;
  darkMode?: boolean;
  [key: string]: unknown;
};

const ROLES_USUARIO = ['estudiante', 'emprendedor', 'nutricionista', 'CLIENTE'];
const ROL_ADMIN = 'administrador';

export type EstadoUsuariosDto = {
  hayUsuarios: boolean;
  sinUsuarios: boolean;
  hasAdmin?: boolean;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  setSession(user: AuthSession): void {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
  }

  patchSession(partial: Partial<AuthSession>): void {
    const cur = this.getSession();
    if (!cur) return;
    this.setSession({ ...cur, ...partial });
  }

  getSession(): AuthSession | null {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    const s = this.getSession();
    if (!s?.token) return false;
    if (this.isTokenExpired(s.token)) {
      this.clearSession();
      return false;
    }
    return true;
  }

  clearSession(): void {
    sessionStorage.removeItem(AUTH_KEY);
  }

  getToken(): string | null {
    const s = this.getSession();
    if (!s?.token) return null;
    if (this.isTokenExpired(s.token)) {
      this.clearSession();
      return null;
    }
    return s.token;
  }

  esAdministrador(role?: string): boolean {
    const r = role ?? this.getSession()?.role;
    return r === ROL_ADMIN || r === 'ADMIN';
  }

  esUsuarioFormulacion(role?: string): boolean {
    const r = role ?? this.getSession()?.role;
    return !!r && (ROLES_USUARIO.includes(r) || r === 'CLIENTE');
  }

  getPostLoginPath(): string {
    const s = this.getSession();
    if (!s) return '/login';
    if (s.firstLogin === true) return '/confirmar-cuenta';
    if (this.esAdministrador(s.role)) return '/gestion-administrador';
    if (this.esUsuarioFormulacion(s.role)) return '/menu';
    return '/login';
  }

  getPostLoginQueryParams(): Record<string, string> | undefined {
    const s = this.getSession();
    if (s?.firstLogin === true && s.email) {
      return { email: String(s.email) };
    }
    return undefined;
  }

  getWorkPanelPath(): string | null {
    if (this.esAdministrador()) return '/gestion-administrador';
    return null;
  }

  puedeComprar(): boolean {
    return this.isLoggedIn() && this.esUsuarioFormulacion();
  }

  obtenerEstadoUsuarios(): Observable<EstadoUsuariosDto> {
    return this.http.get<EstadoUsuariosDto>(`${environment.apiUrl}/auth/estado-usuarios`);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<{ exp?: number }>(token);
      if (!decoded.exp) return true;
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
}
