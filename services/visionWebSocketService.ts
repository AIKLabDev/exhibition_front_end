/**
 * WebSocket client for common Python (Vision) module.
 *
 * - 프론트는 백엔드(C++)에서 SET_SCENE 등을 받으면 여기서 SET_SCENE_PY를 Python에 전달.
 * - Game01/Game02 등은 request_detection 시 game_id를 넣어 요청.
 * - 공통 Python 한 연결에서 type / game_id 로 라우팅.
 *
 * @see docs/vision-python-websocket.md
 */

import type {
  SceneDefine,
  WSMessageV2,
  VisionMessageNameType,
  SceneData,
  VisionReqHandGesture,
  VisionResultHandGesture,
  VisionHeadPoseData,
} from '../protocol';
import {
  Sender,
  VisionMessageName,
} from '../protocol';

// Re-export for consumers
export type { SceneData, VisionReqHandGesture, VisionResultHandGesture, VisionHeadPoseData } from '../protocol';


/** 프론트 → Python 전송 시 sender는 FRONTEND */
function buildVisionMessage(name: VisionMessageNameType, data: unknown): WSMessageV2 {
  return {
    header: {
      id: crypto.randomUUID(),
      name,
      sender: Sender.FRONTEND,
      timestamp: Date.now(),
    },
    data,
  };
}

interface PendingRequest {
  requestId: string;
  resolve: (result: VisionResultHandGesture) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let globalInstance: VisionWebSocketService | null = null;
let globalWs: WebSocket | null = null;
let globalConnectPromise: Promise<void> | null = null;
let globalReconnectScheduled = false;

export function getVisionWsService(url?: string): VisionWebSocketService {
  const baseUrl = url ?? import.meta.env?.VITE_VISION_WS_URL ?? 'ws://localhost:9002';
  if (!globalInstance) {
    globalInstance = new VisionWebSocketService(baseUrl);
  }
  return globalInstance;
}

export function resetVisionWsService(): void {
  if (globalInstance) {
    globalInstance.disconnect();
    globalInstance = null;
  }
  globalConnectPromise = null;
  globalWs = null;
  globalReconnectScheduled = false;
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class VisionWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 3000;
  private shouldReconnect = true;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestTimeout = 10000;
  private isConnecting = false;

  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;
  private onGameStartCallback?: () => void;
  private onGameStopCallback?: () => void;
  private onPoseCallback?: (payload: { yaw: number; pitch: number }) => void;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    if (globalWs?.readyState === WebSocket.OPEN) {
      this.ws = globalWs;
      return Promise.resolve();
    }
    if (globalWs?.readyState === WebSocket.CONNECTING && globalConnectPromise) {
      this.ws = globalWs;
      return globalConnectPromise;
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (globalConnectPromise) {
      return globalConnectPromise;
    }

    globalConnectPromise = new Promise((resolve, reject) => {
      if (this.isConnecting || globalWs?.readyState === WebSocket.CONNECTING) {
        globalConnectPromise = null;
        resolve();
        return;
      }

      this.isConnecting = true;
      console.log('[VisionWS] Connecting to', this.url);

      try {
        this.ws = new WebSocket(this.url);
        globalWs = this.ws;
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('[VisionWS] Connected');
          this.isConnecting = false;
          this.shouldReconnect = true;
          globalConnectPromise = null;
          this.onConnectCallback?.();
          resolve();
        };

        this.ws.onmessage = (event) => this.handleMessage(event.data);

        this.ws.onerror = () => {
          this.isConnecting = false;
          globalConnectPromise = null;
          this.onErrorCallback?.(new Error('WebSocket error'));
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          console.log('[VisionWS] Disconnected', event.code, event.reason);
          this.isConnecting = false;
          globalConnectPromise = null;
          if (globalWs === this.ws) globalWs = null;
          this.ws = null;
          this.onDisconnectCallback?.();
          this.pendingRequests.forEach((p) => {
            clearTimeout(p.timeout);
            p.reject(new Error('Connection closed'));
          });
          this.pendingRequests.clear();
          if (this.shouldReconnect && event.code !== 1000) {
            this.scheduleReconnect();
          }
        };
      } catch (err) {
        this.isConnecting = false;
        globalConnectPromise = null;
        globalWs = null;
        reject(err);
      }
    });

    return globalConnectPromise;
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
    globalWs = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 백엔드에서 SET_SCENE 수신 시 호출. Python 공통 모듈에 현재 씬을 알린다. (WSMessageV2)
   */
  sendScene(sceneData: SceneData): void {
    if (!this.isConnected()) {
      console.warn('[VisionWS] sendScene skipped: not connected');
      return;
    }
    try {
      const msg = buildVisionMessage(VisionMessageName.SET_SCENE, sceneData);
      this.ws!.send(JSON.stringify(msg));
      console.log('[VisionWS] Sent SET_SCENE:', sceneData.scene);
    } catch (err) {
      console.warn('[VisionWS] sendScene failed:', err);
    }
  }

  /**
   * 백엔드에서 GAME_START 수신 시 프론트가 호출. Python에 GAME_START 이벤트 전달. (WSMessageV2)
   */
  sendGameStart(): void {
    if (!this.isConnected()) return;
    try {
      const msg = buildVisionMessage(VisionMessageName.GAME_START, {});
      this.ws!.send(JSON.stringify(msg));
      console.log('[VisionWS] Sent GAME_START to Python');
    } catch (err) {
      console.warn('[VisionWS] sendGameStart failed:', err);
    }
  }

  /**
   * 백엔드에서 GAME_STOP 수신 시 프론트가 호출. Python에 GAME_STOP 이벤트 전달. (WSMessageV2)
   */
  sendGameStop(): void {
    if (!this.isConnected()) return;
    try {
      const msg = buildVisionMessage(VisionMessageName.GAME_STOP, {});
      this.ws!.send(JSON.stringify(msg));
      console.log('[VisionWS] Sent GAME_STOP to Python');
    } catch (err) {
      console.warn('[VisionWS] sendGameStop failed:', err);
    }
  }

  /**
   * 손동작 감지 요청 (request-response).
   * - 여기서 REQ_HAND_GESTURE 메시지를 Python에 보내고, Promise를 반환.
   * - Python이 처리 후 RES_HAND_GESTURE 메시지로 응답하면, handleMessage에서 수신해
   *   request_id로 pendingRequests를 찾아 resolve(result)를 호출 → 이 Promise가 풀림.
   * - 따라서 handleMessage의 RES_HAND_GESTURE 분기에서 parsing하고 resolve하는 것은 필수.
   */
  async requestHandGesture(options?: { game_id?: string }): Promise<VisionResultHandGesture> {
    if (!this.isConnected()) {
      throw new Error('Not connected to vision server');
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const reqData: VisionReqHandGesture = {
      request_id: requestId,
      game_id: options?.game_id,
    };

    return new Promise<VisionResultHandGesture>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Hand gesture request timeout'));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, {
        requestId,
        resolve,
        reject,
        timeout,
      });

      try {
        const msg = buildVisionMessage(VisionMessageName.REQ_HAND_GESTURE, reqData);
        this.ws!.send(JSON.stringify(msg));
        console.log('[VisionWS] Sent REQ_HAND_GESTURE:', requestId, options?.game_id ?? '');
      } catch (err) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  /**
   * WebSocket onmessage에서 호출. Python에서 오는 모든 메시지는 여기서 한 번에 처리.
   * - RES_HAND_GESTURE: requestHandGesture()가 만든 Promise를 request_id로 찾아 resolve → await가 풀림.
   * - GAME_START / GAME_STOP / HEADPOSE: 콜백 호출.
   * - 파싱/분기 제거 시 request-response 결과를 받을 수 없으므로 반드시 유지.
   */
  private handleMessage(data: string | ArrayBuffer): void {
    const raw =
      data instanceof ArrayBuffer
        ? new TextDecoder().decode(data)
        : data;

    try {
      const message = JSON.parse(raw) as WSMessageV2;
      const { header, data: payload } = message;
      const name = header?.name;

      if (name === VisionMessageName.RES_HAND_GESTURE) {
        const result = payload as VisionResultHandGesture;
        const pending = this.pendingRequests.get(result.request_id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(result.request_id);
          pending.resolve(result);
          console.log('[VisionWS] Received RES_HAND_GESTURE:', result.request_id);
        } else {
          console.warn('[VisionWS] Unknown request_id:', result.request_id);
        }
      } else if (name === VisionMessageName.GAME_START) {
        this.onGameStartCallback?.();
      } else if (name === VisionMessageName.GAME_STOP) {
        this.onGameStopCallback?.();
      } else if (name === VisionMessageName.HEADPOSE) {
        const pose = payload as VisionHeadPoseData;
        if (typeof pose?.yaw === 'number' && typeof pose?.pitch === 'number') {
          this.onPoseCallback?.({ yaw: pose.yaw, pitch: pose.pitch });
        }
      } else if (name === VisionMessageName.ERROR) {
        console.error('[VisionWS] Server error:', payload);
      } else if (name === VisionMessageName.ACK) {
        // no-op
      } else {
        console.warn('[VisionWS] Unknown message name:', name);
      }
    } catch (err) {
      console.error('[VisionWS] Parse error:', err, raw);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || globalReconnectScheduled) return;
    if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) return;
    globalReconnectScheduled = true;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      globalReconnectScheduled = false;
      this.connect().catch(() => this.scheduleReconnect());
    }, this.reconnectDelay);
  }

  onConnect(cb: () => void): void {
    this.onConnectCallback = cb;
  }
  onDisconnect(cb: () => void): void {
    this.onDisconnectCallback = cb;
  }
  onError(cb: (error: Error) => void): void {
    this.onErrorCallback = cb;
  }
  onGameStart(cb: () => void): void {
    this.onGameStartCallback = cb;
  }
  onGameStop(cb: () => void): void {
    this.onGameStopCallback = cb;
  }

  /** Game02 HumanTrack: 헤드포즈 스트림 구독 (Python이 headpose 타입으로 전송) */
  onPose(cb: (payload: { yaw: number; pitch: number }) => void): () => void {
    this.onPoseCallback = cb;
    return () => { this.onPoseCallback = undefined; };
  }
}
