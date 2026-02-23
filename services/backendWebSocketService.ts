/**
 * WebSocket client for C++ backend communication.
 * Handles scene control, progress updates, and camera frames (V2 protocol).
 * Camera frames are received as binary (faster): [4 bytes JSON length LE][JSON][image bytes].
 */

import { WSMessageV2, UIEventName, CameraFrameData, Sender } from '../types';

type MessageListener = (msg: WSMessageV2) => void;
type FrameListener = (frame: CameraFrameData) => void;

const defaultWsUrl = 'ws://127.0.0.1:8080';

/**
 * Parse binary CAMERA_FRAME: [4 bytes uint32 LE = jsonLen][json][image bytes].
 * Returns CameraFrameData with imageBlob (jpeg/png/webp) or imageBuffer (raw).
 */
function parseBinaryCameraFrame(buffer: ArrayBuffer): CameraFrameData | null {
  if (buffer.byteLength < 4) return null;
  const view = new DataView(buffer);
  const jsonLen = view.getUint32(0, true);
  if (4 + jsonLen > buffer.byteLength) return null;
  const jsonBytes = new Uint8Array(buffer, 4, jsonLen);
  const jsonStr = new TextDecoder().decode(jsonBytes);
  try {
    const msg = JSON.parse(jsonStr) as WSMessageV2;
    if (msg?.header?.name !== 'CAMERA_FRAME' || !msg.data || typeof msg.data !== 'object') return null;
    const data = msg.data as Record<string, unknown>;
    const format = ((data.format as string) || 'jpeg') as CameraFrameData['format'];
    const width = typeof data.width === 'number' ? data.width : undefined;
    const height = typeof data.height === 'number' ? data.height : undefined;
    const imageBytes = buffer.slice(4 + jsonLen);
    //. uncompressed raw image. currently uses jpeg format. if compress time is a problem, use raw format.
    if (format === 'raw') {
      return { format: 'raw', width, height, imageBuffer: imageBytes };
    }
    //. fallback.
    //const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    const mime = 'image/jpeg';
    return { format, width, height, imageBlob: new Blob([imageBytes], { type: mime }) };
  } catch {
    return null;
  }
}

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
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        console.log('[Backend WS] Connected (V2 Protocol)');
        this.onStatusChangeCallback('CONNECTED');
      };

      //. websocket message is either binary or text
      this.socket.onmessage = (event) => {
        try {

          //. currently, binary message is only CAMERA_FRAME
          if (event.data instanceof ArrayBuffer) {
            const frame = parseBinaryCameraFrame(event.data);
            if (frame) this.frameListeners.forEach(fn => fn(frame));
            return;
          }

          const msg: WSMessageV2 = JSON.parse(event.data as string);
          this.messageListeners.forEach(fn => fn(msg));
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
