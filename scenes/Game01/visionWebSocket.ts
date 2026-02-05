/**
 * WebSocket client for Vision Server communication
 * 
 * Connects to Python vision backend WebSocket server and handles
 * detection requests/responses.
 */

import type { RpsChoice } from './Game01.types';

// Singleton instance to prevent multiple connections in React StrictMode
let globalWebSocketInstance: VisionWebSocket | null = null;
let globalWebSocketRaw: WebSocket | null = null;
let globalConnectionPromise: Promise<void> | null = null;
let globalReconnectScheduled = false;

export interface DetectionRequest {
  type: 'request_detection';
  request_id: string;
  timestamp: number;
}

export interface DetectionResult {
  type: 'detection_result';
  request_id: string;
  success: boolean;
  data: {
    class_name: string;
    confidence: number;
    center?: { x: number; y: number; z: number };
    rotation?: { rx: number; ry: number; rz: number };
    size?: { w: number; h: number; d: number };
  };
  error_message?: string;
  timestamp: number;
}

type MessageType = 'request_detection' | 'detection_result' | 'game_start' | 'game_stop' | 'error' | 'ack';

interface PendingRequest {
  requestId: string;
  resolve: (result: DetectionResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class VisionWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay: number = 3000;
  private shouldReconnect: boolean = true;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestTimeout: number = 10000;
  private isConnecting: boolean = false;

  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;
  private onGameStartCallback?: () => void;
  private onGameStopCallback?: () => void;

  constructor(url: string = 'ws://localhost:9002') {
    this.url = url;
  }

  static getInstance(url: string = 'ws://localhost:9002'): VisionWebSocket {
    if (!globalWebSocketInstance) {
      globalWebSocketInstance = new VisionWebSocket(url);
    }
    return globalWebSocketInstance;
  }

  static resetInstance(): void {
    if (globalWebSocketInstance) {
      globalWebSocketInstance.disconnect();
      globalWebSocketInstance = null;
    }
    globalConnectionPromise = null;
    globalWebSocketRaw = null;
    globalReconnectScheduled = false;
  }

  connect(): Promise<void> {
    if (globalWebSocketRaw) {
      if (globalWebSocketRaw.readyState === WebSocket.OPEN) {
        console.log('[VisionWebSocket] Already connected, reusing...');
        this.ws = globalWebSocketRaw;
        return Promise.resolve();
      }
      if (globalWebSocketRaw.readyState === WebSocket.CONNECTING) {
        console.log('[VisionWebSocket] Already connecting, waiting...');
        this.ws = globalWebSocketRaw;
        if (globalConnectionPromise) {
          return globalConnectionPromise;
        }
      }
      if (globalWebSocketRaw.readyState === WebSocket.CLOSED) {
        globalWebSocketRaw = null;
      }
    }

    if (globalConnectionPromise) {
      console.log('[VisionWebSocket] Connection promise exists, reusing...');
      return globalConnectionPromise;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[VisionWebSocket] Already connected, skipping...');
      return Promise.resolve();
    }

    globalConnectionPromise = new Promise((resolve, reject) => {
      if (this.isConnecting || globalWebSocketRaw?.readyState === WebSocket.CONNECTING) {
        console.log('[VisionWebSocket] Connection already in progress, skipping...');
        globalConnectionPromise = null;
        resolve();
        return;
      }

      this.isConnecting = true;
      console.log('[VisionWebSocket] Starting new connection to', this.url);

      try {
        this.ws = new WebSocket(this.url);
        globalWebSocketRaw = this.ws;
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('[VisionWebSocket] Connected to', this.url);
          this.isConnecting = false;
          this.shouldReconnect = true;
          globalConnectionPromise = null;
          this.onConnectCallback?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[VisionWebSocket] Error:', error);
          this.isConnecting = false;
          globalConnectionPromise = null;
          this.onErrorCallback?.(new Error('WebSocket error'));
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          console.log('[VisionWebSocket] Disconnected', event.code, event.reason);
          this.isConnecting = false;
          globalConnectionPromise = null;

          if (globalWebSocketRaw === this.ws) {
            globalWebSocketRaw = null;
          }

          this.ws = null;
          this.onDisconnectCallback?.();

          this.pendingRequests.forEach((pending) => {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
          });
          this.pendingRequests.clear();

          if (this.shouldReconnect && event.code !== 1000) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        globalConnectionPromise = null;
        globalWebSocketRaw = null;
        reject(error);
      }
    });

    return globalConnectionPromise;
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    globalReconnectScheduled = false;
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    globalWebSocketRaw = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async requestDetection(): Promise<DetectionResult> {
    if (!this.isConnected()) {
      throw new Error('Not connected to vision server');
    }

    const requestId = this.generateRequestId();
    const request: DetectionRequest = {
      type: 'request_detection',
      request_id: requestId,
      timestamp: Date.now() / 1000,
    };

    return new Promise<DetectionResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Detection request timeout'));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, {
        requestId,
        resolve,
        reject,
        timeout,
      });

      try {
        this.ws!.send(JSON.stringify(request));
        console.log('[VisionWebSocket] Sent detection request:', requestId);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private handleMessage(data: string | ArrayBuffer): void {
    let messageStr: string;

    if (data instanceof ArrayBuffer) {
      messageStr = new TextDecoder().decode(data);
    } else {
      messageStr = data;
    }

    try {
      const message = JSON.parse(messageStr);
      const messageType = message.type as MessageType;

      if (messageType === 'detection_result') {
        const result = message as DetectionResult;
        const pending = this.pendingRequests.get(result.request_id);

        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(result.request_id);
          pending.resolve(result);
          console.log('[VisionWebSocket] Received detection result:', result.request_id);
        } else {
          console.warn('[VisionWebSocket] Received result for unknown request:', result.request_id);
        }
      } else if (messageType === 'game_start') {
        console.log('[VisionWebSocket] game_start from robot -> trigger start');
        this.onGameStartCallback?.();
      } else if (messageType === 'game_stop') {
        console.log('[VisionWebSocket] game_stop from robot');
        this.onGameStopCallback?.();
      } else if (messageType === 'error') {
        console.error('[VisionWebSocket] Server error:', message);
      } else if (messageType === 'ack') {
        console.log('[VisionWebSocket] Received ACK');
      } else {
        console.warn('[VisionWebSocket] Unknown message type:', messageType);
      }
    } catch (error) {
      console.error('[VisionWebSocket] Failed to parse message:', error, messageStr);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || globalReconnectScheduled) {
      console.log('[VisionWebSocket] Reconnect already scheduled, skipping...');
      return;
    }

    if (globalWebSocketRaw?.readyState === WebSocket.OPEN ||
      globalWebSocketRaw?.readyState === WebSocket.CONNECTING) {
      console.log('[VisionWebSocket] Already connected/connecting, skipping reconnect...');
      return;
    }

    globalReconnectScheduled = true;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      globalReconnectScheduled = false;
      console.log('[VisionWebSocket] Attempting to reconnect...');
      this.connect().catch((error) => {
        console.error('[VisionWebSocket] Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, this.reconnectDelay);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onGameStart(callback: () => void): void {
    this.onGameStartCallback = callback;
  }

  onGameStop(callback: () => void): void {
    this.onGameStopCallback = callback;
  }
}

/**
 * Convert DetectionResult class_name to RpsChoice
 */
export function classNameToChoice(class_name: string): RpsChoice | null {
  const normalized = class_name.toLowerCase().trim();

  if (normalized === 'rock' || normalized === 'stone') {
    return 'rock';
  } else if (normalized === 'paper') {
    return 'paper';
  } else if (normalized === 'scissors' || normalized === 'scissor') {
    return 'scissors';
  }

  return null;
}
