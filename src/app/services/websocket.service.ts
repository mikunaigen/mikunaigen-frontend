import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, ReplaySubject } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private readonly stompClient: Client;
  private readonly connectionSubject = new ReplaySubject<boolean>(1);

  constructor() {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      reconnectDelay: 5000,
      debug: () => {},
    });

    this.stompClient.onConnect = () => {
      this.connectionSubject.next(true);
    };

    this.stompClient.onStompError = () => {};

    this.stompClient.activate();
  }

  subscribeToTopic(topic: string): Observable<string> {
    return new Observable<string>((observer) => {
      let stompSub: { unsubscribe: () => void } | null = null;
      const connectSub = this.connectionSubject.subscribe((connected) => {
        if (!connected || stompSub) return;
        stompSub = this.stompClient.subscribe(topic, (message: Message) => {
          observer.next(message.body);
        });
      });
      if (this.stompClient.connected && !stompSub) {
        stompSub = this.stompClient.subscribe(topic, (message: Message) => {
          observer.next(message.body);
        });
      }
      return () => {
        connectSub.unsubscribe();
        if (stompSub) {
          stompSub.unsubscribe();
        }
      };
    });
  }
}
