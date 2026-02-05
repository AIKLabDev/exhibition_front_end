
export enum Scene {
  WELCOME = 'WELCOME',
  QR = 'QR',
  SELECT_MINIGAME = 'SELECT_MINIGAME',
  GAME01 = 'GAME01',
  GAME02 = 'GAME02',
  GAME_RESULT = 'GAME_RESULT',
  PICK_GIFT = 'PICK_GIFT',
  LASER_STYLE = 'LASER_STYLE',
  LASER_PROCESS = 'LASER_PROCESS'
}

// New Standardized Protocol
export interface WSMessageHeader {
  id: string;        // Unique Command ID
  name: string;      // Command Name (e.g., 'SET_SCENE', 'CAMERA_FRAME')
  sender: 'BACKEND' | 'FRONTEND';
  timestamp: number;
}

export interface WSMessageV2 {
  header: WSMessageHeader;
  data: any;         // Generic payload
}

// Specific Data Payloads
export interface CameraFrameData {
  image: string;     // Base64 string (JPEG/PNG payload, or raw RGB bytes for format 'raw')
  format: 'jpeg' | 'png' | 'webp' | 'raw';
  width?: number;    // Required for 'raw'
  height?: number;   // Required for 'raw'
}

export interface SceneData {
  scene: Scene;
  text?: string;
  result?: 'WIN' | 'LOSE';
}

export interface ProgressData {
  value: number;     // 0.0 ~ 1.0
  label?: string;
}

export type UIEventName =
  | 'START'
  | 'CANCEL'
  | 'MINIGAME_SELECTED'
  | 'GIFT_SELECTED'
  | 'STYLE_SELECTED'
  | 'GAME_ACTION'
  | 'GAME_RESULT'
  | 'ANIMATION_COMPLETE';

export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED'
}
