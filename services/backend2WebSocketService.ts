/**
 * WebSocket client for Backend2 communication.
 * Backend1(C++)과 동일한 WSMessageV2 프로토콜을 사용하지만, 별도 서버(포트)에 연결.
 * 카메라 프레임(바이너리) 처리는 불필요하므로 JSON 텍스트 메시지만 처리.
 *
 * 기본 URL: ws://127.0.0.1:8081 (환경변수 VITE_WS2_URL로 변경 가능)
 */

import { WSMessageV2, Sender } from '../types';

type MessageListener = (msg: WSMessageV2) => void;

const defaultWsUrl = 'ws://127.0.0.1:8081';

class Backend2WebSocketService {
  private socket: WebSocket | null = null;
  private url: string = import.meta.env?.VITE_WS2_URL ?? defaultWsUrl;
  private reconnectTimeout: number = 3000;

  private messageListeners: Set<MessageListener> = new Set();
  private onStatusChangeCallback: (status: string) => void = () => {};

  constructor() {
    this.connect();
  }

  public connect() {
    this.onStatusChangeCallback('CONNECTING');
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('[Backend2 WS] Connected');
        this.onStatusChangeCallback('CONNECTED');
      };

      this.socket.onmessage = (event) => {
        try {
          const msg: WSMessageV2 = JSON.parse(event.data as string);
          this.messageListeners.forEach((fn) => fn(msg));
        } catch (e) {
          console.error('[Backend2 WS] Failed to parse message', e);
        }
      };

      this.socket.onclose = () => {
        this.onStatusChangeCallback('DISCONNECTED');
        setTimeout(() => this.connect(), this.reconnectTimeout);
      };

      this.socket.onerror = (err) => {
        console.error('[Backend2 WS] Error', err);
        this.socket?.close();
      };
    } catch (err) {
      console.error('[Backend2 WS] Connection failed', err);
      setTimeout(() => this.connect(), this.reconnectTimeout);
    }
  }

  public addMessageListener(fn: MessageListener) {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  public setStatusCallback(fn: (status: string) => void) {
    this.onStatusChangeCallback = fn;
  }

  /**
   * Backend2에 메시지 전송.
   * name: 메시지 이름 (문자열), data: 페이로드 (자유 형식)
   */
  public sendCommand(name: string, data: unknown = {}) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const msg: WSMessageV2 = {
        header: {
          id: crypto.randomUUID(),
          name,
          sender: Sender.FRONTEND,
          timestamp: Date.now(),
        },
        data,
      };
      this.socket.send(JSON.stringify(msg));
      console.log('[Backend2 WS] Sent:', name);
    } else {
      console.warn('[Backend2 WS] Not connected, cannot send:', name);
    }
  }
}

export const backend2WsService = new Backend2WebSocketService();
