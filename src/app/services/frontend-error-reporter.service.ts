import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

export type FrontendErrorPayload = {
  level: 'ERROR' | 'WARN';
  source: 'angular' | 'http';
  message: string;
  stack?: string;
  routeUrl?: string;
  pageUrl?: string;
  requestUrl?: string;
  requestMethod?: string;
  httpStatus?: number;
  traceId?: string;
};

@Injectable({ providedIn: 'root' })
export class FrontendErrorReporterService {
  private readonly http: HttpClient;
  private readonly endpoint = `${environment.apiUrl}/client-errors/report`;

  constructor(
    backend: HttpBackend,
    private auth: AuthService,
  ) {
    this.http = new HttpClient(backend);
  }

  report(payload: FrontendErrorPayload): void {
    const session = this.auth.getSession();
    const body = {
      ...payload,
      routeUrl: payload.routeUrl ?? window.location.pathname + window.location.search + window.location.hash,
      pageUrl: payload.pageUrl ?? window.location.href,
      userId: typeof session?.userId === 'string' ? session.userId : undefined,
      userEmail: typeof session?.email === 'string' ? session.email : undefined,
      userRole: typeof session?.role === 'string' ? session.role : undefined,
      sessionId: this.readSessionId(),
      userAgent: navigator.userAgent,
      appVersion: 'web',
    };

    const token = this.auth.getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    this.http.post(this.endpoint, body, { headers }).subscribe({
      next: () => {},
      error: () => {},
    });
  }

  private readSessionId(): string | undefined {
    try {
      const raw = sessionStorage.getItem('rb_auth');
      return raw ? String(raw).slice(0, 80) : undefined;
    } catch {
      return undefined;
    }
  }
}
