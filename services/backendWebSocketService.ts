/**
 * WebSocket client for C++ backend communication.
 * Handles scene control, progress updates, and camera frames (V2 protocol).
 */

import { WSMessageV2, UIEventName, CameraFrameData, Sender } from '../types';

type MessageListener = (msg: WSMessageV2) => void;
type FrameListener = (frame: CameraFrameData) => void;

const defaultWsUrl = 'ws://127.0.0.1:8080';

class BackendWebSocketService {
  private socket: WebSocket | null = null;
  private url: string = import.meta.env?.VITE_WS_URL ?? defaultWsUrl;
  private reconnectTimeout: number = 3000;

  private messageListeners: Set<MessageListener> = new Set();
  private frameListeners: Set<FrameListener> = new Set();
  private onStatusChangeCallback: (status: string) => void = () => { };

  constructor() {
    this.connect();
  }

  public connect() {
    this.onStatusChangeCallback('CONNECTING');
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('[Backend WS] Connected (V2 Protocol)');
        this.onStatusChangeCallback('CONNECTED');
      };

      this.socket.onmessage = (event) => {
        try {
          const msg: WSMessageV2 = JSON.parse(event.data);

          // Handle Camera Frames separately for high-performance routing
          if (msg.header.name === 'CAMERA_FRAME') {
            this.frameListeners.forEach(fn => fn(msg.data as CameraFrameData));
          } else {
            this.messageListeners.forEach(fn => fn(msg));
          }
        } catch (e) {
          console.error('[Backend WS] Failed to parse message', e);
        }
      };

      this.socket.onclose = () => {
        this.onStatusChangeCallback('DISCONNECTED');
        setTimeout(() => this.connect(), this.reconnectTimeout);
      };

      this.socket.onerror = (err) => {
        console.error('[Backend WS] Error', err);
        this.socket?.close();
      };
    } catch (err) {
      console.error('[Backend WS] Connection failed', err);
      setTimeout(() => this.connect(), this.reconnectTimeout);
    }
  }

  // Listen for general commands (Scene changes, progress, etc.)
  public addMessageListener(fn: MessageListener) {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  // Listen for real-time camera frames
  public addFrameListener(fn: FrameListener) {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  public setStatusCallback(fn: (status: string) => void) {
    this.onStatusChangeCallback = fn;
  }

  public sendCommand(name: UIEventName, data: any = {}) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const msg: WSMessageV2 = {
        header: {
          id: crypto.randomUUID(),
          name: name,
          sender: Sender.FRONTEND,
          timestamp: Date.now()
        },
        data: data
      };
      this.socket.send(JSON.stringify(msg));
    }
  }
}

export const backendWsService = new BackendWebSocketService();
