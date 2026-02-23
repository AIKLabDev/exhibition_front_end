/**
 * 프로토콜 정의 모음
 * Backend(C++) ↔ Frontend, Frontend ↔ Python(Vision) 규격을 한 파일에서 비교·관리.
 *
 * 모든 채널에서 공통 메시지 구조: WSMessageV2 (header + data).
 * - Backend: PROTOCOL.md, C++/Qt
 * - Vision:  docs/vision-python-websocket.md, Python 공통 모듈
 */

// =============================================================================
// 공통 메시지 구조 (Backend / Frontend / Vision 공통)
// =============================================================================


export enum Sender {
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  VISION = 'VISION',
}

export interface WSMessageHeader {
  id: string;
  name: string;
  sender: Sender;
  timestamp: number;
}

export interface WSMessageV2 {
  header: WSMessageHeader;
  data: unknown;
}

// =============================================================================
// Backend (C++) ↔ Frontend
// =============================================================================

export enum SceneDefine {
  WELCOME = 'WELCOME',
  QR = 'QR',
  SELECT_MINIGAME = 'SELECT_MINIGAME',
  GAME01 = 'GAME01',
  GAME02 = 'GAME02',
  GAME03 = 'GAME03',
  GAME04 = 'GAME04',
  GAME05 = 'GAME05',
  GAME_RESULT = 'GAME_RESULT',
  PICK_GIFT = 'PICK_GIFT',
  LASER_STYLE = 'LASER_STYLE',
  LASER_PROCESS = 'LASER_PROCESS',
}

/** Backend → Frontend: header.name (C++와 맞출 것) */
export const BackendMessageName = {
  SET_SCENE: 'SET_SCENE',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CAMERA_FRAME: 'CAMERA_FRAME',
  GAME_START: 'GAME_START',
  GAME_STOP: 'GAME_STOP',
  GAME02_ALIGNMENT_COMPLETE: 'GAME02_ALIGNMENT_COMPLETE',
  /** Game02 뷰 제어: 백엔드(C++)가 기준 로봇 대비 yaw, pitch 전송 (Python HEAD_POSE 대체) */
  HEAD_POSE: 'HEAD_POSE',
} as const;
export type BackendMessageNameType = (typeof BackendMessageName)[keyof typeof BackendMessageName];

/** Frontend → Backend: header.name (C++와 맞출 것) */
export const UIEventName = {
  START: 'START',
  CANCEL: 'CANCEL',
  MINIGAME_SELECTED: 'MINIGAME_SELECTED',
  GIFT_SELECTED: 'GIFT_SELECTED',
  STYLE_SELECTED: 'STYLE_SELECTED',
  GAME_ACTION: 'GAME_ACTION',
  GAME_RESULT: 'GAME_RESULT',
  ANIMATION_COMPLETE: 'ANIMATION_COMPLETE',
  /** Vision에서 human 감지 시(Welcome 씬) 프론트가 백엔드에 알림 → 백엔드가 SET_SCENE QR 전송 */
  HUMAN_DETECTED: 'HUMAN_DETECTED',
  /** Game02 헤드포즈(yaw, pitch, forward, center_depth_m) → Exhibition에서 로봇 제어 등에 사용 */
  GAME02_HEAD_POSE: 'GAME02_HEAD_POSE',
  /** Game02: 게임 시작 클릭 후 얼굴 정렬 UI 진입. Exhibition이 정렬 phase 시작 */
  GAME02_ALIGNMENT_START: 'GAME02_ALIGNMENT_START',
  /** Vision에서 QR 인식 시(QR 씬) 프론트가 백엔드에 전달. data, bbox 포함 */
  QR_SCANNED: 'QR_SCANNED',
} as const;
export type UIEventNameType = (typeof UIEventName)[keyof typeof UIEventName];
export type UIEventName = UIEventNameType;

export interface CameraFrameData {
  format: 'jpeg' | 'png' | 'webp' | 'raw';
  width?: number;
  height?: number;
  /** Encoded image (jpeg/png/webp). Use with URL.createObjectURL() for <img>. */
  imageBlob?: Blob;
  /** Raw RGBA bytes when format === 'raw'. Length = width * height * 4 (backend sends RGBA for direct canvas use). */
  imageBuffer?: ArrayBuffer;
}

export interface SceneData {
  scene: SceneDefine;
  text?: string;
  result?: 'WIN' | 'LOSE';
}

export interface ProgressData {
  value: number;
  label?: string;
}

// =============================================================================
// Frontend ↔ Vision (Python) — header.name 및 data 페이로드
// WSMessageV2 공통 사용: header.name = VisionMessageName.XXX, data = 아래 타입
// =============================================================================

/** Vision 채널 메시지 타입 (header.name). Python과 맞출 것 */
export const VisionMessageName = {
  SET_SCENE: 'SET_SCENE',
  REQ_HAND_GESTURE: 'REQ_HAND_GESTURE',
  RES_HAND_GESTURE: 'RES_HAND_GESTURE',
  GAME_START: 'GAME_START',
  GAME_STOP: 'GAME_STOP',
  HEAD_POSE: 'HEAD_POSE',
  ERROR: 'ERROR',
  ACK: 'ACK',
  /** Welcome 씬에서 human 감지 시 Python → 프론트. 프론트는 백엔드에 HUMAN_DETECTED 전달 → 백엔드가 SET_SCENE QR */
  HUMAN_DETECTED: 'HUMAN_DETECTED',
  /** GAME04 씬에서 python vision module이 head의 왼쪽 오른쪽 방향만 제시 */
  GAME04_DIRECTION: 'GAME04_DIRECTION',
  /** QR 씬에서 Python이 QR 인식 시 → 프론트는 백엔드에 QR_SCANNED 전달 */
  QR_SCANNED: 'QR_SCANNED',
} as const;
export type VisionMessageNameType = (typeof VisionMessageName)[keyof typeof VisionMessageName];


/** VisionReqHandGesture 메시지의 data (프론트 → Python) */
export interface VisionReqHandGesture {
  request_id: string;
  game_id?: string;
}

/** DETECTION_RESULT 메시지의 data (Python → 프론트) */
export interface VisionResultHandGesture {
  request_id: string;
  game_id?: string;
  data: {
    gesture: string;
    confidence: number;
  };
  success: boolean;
  error_message?: string;
}

/** HEAD_POSE 메시지의 data (Python → 프론트). Python은 primary 안에 담아 보냄. */
export interface VisionHeadPoseData {
  yaw: number;
  pitch: number;
  /** 얼굴 방향 전방 벡터 (선택) */
  forward?: number;
  /** 코 중심점 깊이(m). 선택, 없으면 null */
  center_depth_m?: number | null;
}

/** ERROR 메시지의 data (Python → 프론트) */
export interface VisionErrorData {
  message?: string;
}

/** HUMAN_DETECTED 메시지의 data (Python → 프론트, Welcome 씬에서 human 감지 시) */
export interface VisionHumanDetectedData {
  detected: boolean;
}

export interface VisionGame04DirectionData {
  direction: 'LEFT' | 'RIGHT';
  yaw: number;
  pitch: number;
}

/** QR_SCANNED 메시지의 data (Python → 프론트). 프론트는 그대로 백엔드에 전달. */
export interface VisionQRScannedData {
  data: string;
  bbox?: unknown;
  type?: string;
}

/** @deprecated VisionMessageType 대신 VisionMessageName 사용 */
export const VisionMessageType = {
  SET_SCENE_PY: VisionMessageName.SET_SCENE,
  REQ_HAND_GESTURE: VisionMessageName.REQ_HAND_GESTURE,
  RES_HAND_GESTURE: VisionMessageName.RES_HAND_GESTURE,
  GAME_START: VisionMessageName.GAME_START,
  GAME_STOP: VisionMessageName.GAME_STOP,
  HEAD_POSE: VisionMessageName.HEAD_POSE,
  HUMAN_DETECTED: VisionMessageName.HUMAN_DETECTED,
  GAME04_DIRECTION: VisionMessageName.GAME04_DIRECTION,
  QR_SCANNED: VisionMessageName.QR_SCANNED,
} as const;
export type VisionMessageTypeValue = (typeof VisionMessageType)[keyof typeof VisionMessageType];
