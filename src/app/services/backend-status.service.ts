import { Injectable, signal } from '@angular/core';
import { Observable, catchError, defer, EMPTY, finalize, from, map, of, shareReplay, switchMap, take, timer } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class BackendStatusService {
  private readonly pingUrl = `${environment.apiUrl}/ping`;
  private sharedWake$?: Observable<void>;

  readonly isOffline = signal(false);

  waitUntilAwake(): Observable<void> {
    return defer(() => {
      if (!this.sharedWake$) {
        this.isOffline.set(true);
        this.sharedWake$ = this.createWakeStream().pipe(
          shareReplay({ bufferSize: 1, refCount: true }),
        );
      }
      return this.sharedWake$.pipe(take(1));
    });
  }

  private createWakeStream(): Observable<void> {
    return timer(0, 2500).pipe(
      switchMap(() =>
        from(
          fetch(this.pingUrl, { cache: 'no-store', credentials: 'include' }),
        ).pipe(
          switchMap((r) => (r.ok ? of(undefined) : EMPTY)),
          catchError(() => EMPTY),
        ),
      ),
      take(1),
      map(() => void 0),
      finalize(() => {
        this.isOffline.set(false);
        this.sharedWake$ = undefined;
      }),
    );
  }
}
