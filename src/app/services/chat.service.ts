import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type ModoChat = 'usuario' | 'admin';

export interface MensajeChatUi {
  sender: string;
  content: string;
  timestamp?: string;
}

export interface SesionChatDto {
  sessionId: string;
  closed: boolean;
  userMessageCount: number;
  maxUserMessages: number;
  canContinue?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  messages: MensajeChatUi[];
}

export interface ItemListaSesionChatDto {
  sessionId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  closed: boolean;
  userMessageCount: number;
  maxUserMessages: number;
  preview: string;
  canContinue: boolean;
}

export interface RespuestaEnvioChatDto {
  sessionId: string;
  reply: string;
  closed: boolean;
  sessionExpired?: boolean;
  uiAction?: string;
  messages?: MensajeChatUi[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/chat';

  obtenerSesion(modo: ModoChat): Observable<SesionChatDto> {
    return this.http.get<SesionChatDto>(`${this.base}/${modo}/sesion`);
  }

  nuevaSesion(modo: ModoChat): Observable<SesionChatDto> {
    return this.http.post<SesionChatDto>(`${this.base}/${modo}/nueva-sesion`, {});
  }

  listarSesiones(modo: ModoChat): Observable<ItemListaSesionChatDto[]> {
    return this.http.get<ItemListaSesionChatDto[]>(`${this.base}/${modo}/sesiones`);
  }

  obtenerSesionPorId(modo: ModoChat, sessionId: string): Observable<SesionChatDto> {
    return this.http.get<SesionChatDto>(`${this.base}/${modo}/sesiones/${encodeURIComponent(sessionId)}`);
  }

  enviarMensaje(
    modo: ModoChat,
    sessionId: string | null,
    message: string,
  ): Observable<RespuestaEnvioChatDto> {
    return this.http.post<RespuestaEnvioChatDto>(`${this.base}/${modo}/mensaje`, {
      sessionId,
      message,
    });
  }
}
