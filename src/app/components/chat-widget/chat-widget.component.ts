import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { finalize } from 'rxjs/operators';
import {
  ChatService,
  type ItemListaSesionChatDto,
  type MensajeChatUi,
  type ModoChat,
} from '../../services/chat.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, MarkdownPipe],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css',
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @Input({ required: true }) modo!: ModoChat;

  private readonly chat = inject(ChatService);

  abierto = signal(false);
  vistaLista = signal(false);
  cargandoLista = signal(false);
  listaChats = signal<ItemListaSesionChatDto[]>([]);
  sessionId = signal<string | null>(null);
  mensajes = signal<MensajeChatUi[]>([]);
  cerrada = signal(false);
  mensajesUsuario = signal(0);
  maxMensajesUsuario = signal(3);
  procesando = signal(false);
  textoProcesando = signal('Procesando.');
  textoEntrada = '';

  private procesandoTimer: ReturnType<typeof setInterval> | null = null;
  private procesandoPaso = 0;
  private readonly procesandoVariantes = [
    'Procesando.',
    'Procesando..',
    'Procesando...',
    'Procesando.',
  ];

  ngOnInit(): void {
    this.chat.obtenerSesion(this.modo).subscribe({
      next: (s) => this.aplicarSesion(s),
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    this.detenerAnimacionProcesando();
  }

  togglePanel(): void {
    this.abierto.update((v) => !v);
    if (!this.abierto()) {
      this.vistaLista.set(false);
    }
  }

  iniciarNuevoChat(): void {
    this.vistaLista.set(false);
    this.chat.nuevaSesion(this.modo).subscribe({
      next: (s) => {
        this.aplicarSesion(s);
        this.cerrada.set(false);
      },
    });
  }

  abrirListaChats(): void {
    this.vistaLista.set(true);
    this.cargarListaChats();
  }

  volverAlChat(): void {
    this.vistaLista.set(false);
  }

  seleccionarChat(item: ItemListaSesionChatDto): void {
    this.cargandoLista.set(true);
    this.chat
      .obtenerSesionPorId(this.modo, item.sessionId)
      .pipe(finalize(() => this.cargandoLista.set(false)))
      .subscribe({
        next: (s) => {
          this.aplicarSesion(s);
          this.vistaLista.set(false);
        },
        error: () => {},
      });
  }

  enviar(): void {
    const txt = (this.textoEntrada || '').trim();
    if (!txt || this.procesando() || this.cerrada()) {
      return;
    }
    this.mensajes.update((m) => [...m, { sender: 'USER', content: txt }]);
    this.textoEntrada = '';
    this.iniciarAnimacionProcesando();
    this.chat
      .enviarMensaje(this.modo, this.sessionId(), txt)
      .pipe(finalize(() => this.detenerAnimacionProcesando()))
      .subscribe({
        next: (r) => {
          this.sessionId.set(r.sessionId);
          if (r.messages && r.messages.length > 0) {
            this.mensajes.set(r.messages);
          } else if (r.reply) {
            this.mensajes.update((m) => [...m, { sender: 'ASSISTANT', content: r.reply }]);
          }
          this.cerrada.set(!!r.closed || !!r.sessionExpired);
          const conteo = (r.messages ?? this.mensajes()).filter((x) => x.sender === 'USER').length;
          this.mensajesUsuario.set(conteo);
        },
        error: () => {
          this.mensajes.update((m) => [
            ...m,
            { sender: 'ASSISTANT', content: 'No puedo realizar ello.' },
          ]);
        },
      });
  }

  tituloPanel(): string {
    return this.modo === 'admin' ? 'Consultor de plataforma' : 'Asistente Mikunaigen';
  }

  tituloVista(): string {
    return this.vistaLista() ? 'Mis chats' : this.tituloPanel();
  }

  mensajesRestantes(): number {
    return Math.max(0, this.maxMensajesUsuario() - this.mensajesUsuario());
  }

  formatoFechaLista(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  estadoLista(item: ItemListaSesionChatDto): string {
    if (item.canContinue) {
      return `${item.userMessageCount}/${item.maxUserMessages} mensajes`;
    }
    return 'Completado';
  }

  private cargarListaChats(): void {
    this.cargandoLista.set(true);
    this.chat
      .listarSesiones(this.modo)
      .pipe(finalize(() => this.cargandoLista.set(false)))
      .subscribe({
        next: (items) => this.listaChats.set(items ?? []),
        error: () => this.listaChats.set([]),
      });
  }

  private aplicarSesion(s: {
    sessionId: string;
    closed: boolean;
    userMessageCount: number;
    maxUserMessages: number;
    canContinue?: boolean;
    messages: MensajeChatUi[];
  }): void {
    this.sessionId.set(s.sessionId);
    const agotada = s.closed || s.userMessageCount >= (s.maxUserMessages ?? 3);
    this.cerrada.set(s.canContinue === false ? true : agotada);
    this.mensajesUsuario.set(s.userMessageCount);
    this.maxMensajesUsuario.set(s.maxUserMessages ?? 3);
    this.mensajes.set(s.messages ?? []);
  }

  private iniciarAnimacionProcesando(): void {
    this.procesando.set(true);
    this.procesandoPaso = 0;
    this.textoProcesando.set(this.procesandoVariantes[0]);
    this.limpiarTimerProcesando();
    this.procesandoTimer = setInterval(() => {
      this.procesandoPaso = (this.procesandoPaso + 1) % this.procesandoVariantes.length;
      this.textoProcesando.set(this.procesandoVariantes[this.procesandoPaso]);
    }, 500);
  }

  private detenerAnimacionProcesando(): void {
    this.limpiarTimerProcesando();
    this.procesando.set(false);
  }

  private limpiarTimerProcesando(): void {
    if (this.procesandoTimer) {
      clearInterval(this.procesandoTimer);
      this.procesandoTimer = null;
    }
  }
}
