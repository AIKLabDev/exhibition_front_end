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
  FAREWELL = 'FAREWELL',
  QR = 'QR',
  SELECT_MINIGAME = 'SELECT_MINIGAME',
  GAME01 = 'GAME01',
  GAME02 = 'GAME02',
  GAME03 = 'GAME03',
  GAME04 = 'GAME04',
  GAME05 = 'GAME05',
  GAME_RESULT = 'GAME_RESULT',
  /** 미니게임(체인 등) 모두 종료 후 축하 문구 (SET_SCENE). 프론트→백엔드 커맨드 GAME_COMPLETE 와 동일 문자열이지만 용도 다름 */
  GAME_COMPLETE = 'GAME_COMPLETE',
  PICK_GIFT = 'PICK_GIFT',
  REFILL_GIFT = 'REFILL_GIFT',
  LASER_STYLE = 'LASER_STYLE',
  LASER_PROCESS = 'LASER_PROCESS',
  CAPTURE = 'CAPTURE',
}

/** Backend → Frontend: header.name (C++와 맞출 것) */
export const BackendMessageName = {
  SET_SCENE: 'SET_SCENE',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CAMERA_FRAME: 'CAMERA_FRAME',
  GAME_START: 'GAME_START',
  GAME_STOP: 'GAME_STOP',
  /** Game02 뷰 제어: 백엔드(C++)가 기준 로봇 대비 뷰 포즈 전송. data: { X, Y } (도 단위) */
  VIEW_POSE: 'VIEW_POSE',
  /** Game04 헤드 포즈: 백엔드(C++)가 Python 결과 수신 후 전송. data: { direction, yaw, pitch } */
  GAME04_DIRECTION: 'GAME04_DIRECTION',
  /** QR 씬: 중복 참여자(이미 참여한 티켓). 인식 완료 연출이 끝난 뒤에만 연출 표시 */
  QR_DUPLICATED: 'QR_DUPLICATED',
  /** 레이저 작업 대기(스탠바이) Frontend에서 Backend2(레이저)로 전달 */
  LASER_WORK_STANDBY: 'LASER_WORK_STANDBY',
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
  /** 미니게임 체인(GAME02→04→05) 모두 종료 후 전송 → 백엔드가 SET_SCENE `GAME_COMPLETE` 축하 씬 후 시퀀스 계속 */
  GAME_COMPLETE: 'GAME_COMPLETE',
  ANIMATION_COMPLETE: 'ANIMATION_COMPLETE',
  /** Vision에서 human 감지 시(Welcome 씬) 프론트가 백엔드에 알림 → 백엔드가 SET_SCENE QR 전송 */
  HUMAN_DETECTED: 'HUMAN_DETECTED',
  /** Game02: 본게임 시작 시점(찾을 이미지 3초 표시 후). Exhibition에서 얼굴 추적/로봇 본게임 시작 */
  GAME02_MAINGAME_START: 'GAME02_MAINGAME_START',
  /** Game02: 대기 상태(씬 이탈 또는 목표 찾음/제한시간 실패로 종료). Exhibition에서 추적/로봇 대기 */
  GAME02_IDLE: 'GAME02_IDLE',
  /** Game02: 일시정지(Python에서 fix 참여자 이탈 시 전달). Exhibition에서 로봇/추적 일시정지 */
  GAME02_PAUSE: 'GAME02_PAUSE',
  /** Game02: PAUSE 해제(사용자가 터치로 일시정지 해제). Exhibition에서 로봇/추적 재개 */
  GAME02_PAUSE_CANCEL: 'GAME02_PAUSE_CANCEL',
  /** Game04: 본게임 시작 시점. Exhibition에서 헤드 추적/로봇 본게임 시작 */
  GAME04_MAINGAME_START: 'GAME04_MAINGAME_START',
  /** Game04: 일시정지(Python에서 fix 참여자 이탈 시 전달). Exhibition에서 로봇/추적 일시정지 */
  GAME04_PAUSE: 'GAME04_PAUSE',
  /** Game04: PAUSE 해제(사용자가 터치로 일시정지 해제). Exhibition에서 로봇/추적 재개 */
  GAME04_PAUSE_CANCEL: 'GAME04_PAUSE_CANCEL',
  /** Game04: 대기 상태(게임 종료 후 재시작 화면 또는 씬 이탈). Exhibition에서 추적/로봇 대기 */
  GAME04_IDLE: 'GAME04_IDLE',
  /** Vision에서 QR 인식 시(QR 씬) 프론트가 백엔드에 전달. data, bbox 포함 */
  QR_SCANNED: 'QR_SCANNED',
  /** Exhibition_Drawing에서 레이저 가공 완료 수신 시 프론트가 백엔드(Exhibition)에 전달. data: { success: number } (1/0) */
  MACHINING_COMPLETE: 'MACHINING_COMPLETE',
} as const;
export type UIEventNameType = (typeof UIEventName)[keyof typeof UIEventName];
export type UIEventName = UIEventNameType;

// =============================================================================
// Frontend → Backend2 (두 번째 백엔드)
// =============================================================================

/** Frontend → Backend2: header.name */
export const Backend2MessageName = {
  /** LaserStyle 씬에서 사용자가 이미지를 선택했을 때 전송. data: Backend2StyleSelectedData */
  STYLE_SELECTED: 'STYLE_SELECTED',
  /** Exhibition(C++)가 보낸 LASER_WORK_STANDBY를 프론트가 그대로 레이저 백엔드(8081 등)로 전달 */
  LASER_WORK_STANDBY: 'LASER_WORK_STANDBY',
} as const;
export type Backend2MessageNameType = (typeof Backend2MessageName)[keyof typeof Backend2MessageName];

/** STYLE_SELECTED 메시지의 data (Frontend → Backend2). 선택된 스타일 + Base64 이미지 */
export interface Backend2StyleSelectedData {
  /** 스타일 ID (REAL, ANIME, DISNEY, CHIBI) */
  style: string;
  /** 선택 번호 (1~4) */
  number: number;
  /** 선택된 스타일의 Base64 이미지 (JPEG) */
  image: string;
}

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

/** Backend → Frontend: GAME_START 의 data (Exhibition sendGameStart) */
export interface BackendGameStartData {
  gameId?: string;
  totalRounds?: number;
  /** chain 이면 미니게임 02→04→05 순차 (프론트가 씬·Vision 전환) */
  mode?: string;
  games?: string[];
}

/** VIEW_POSE 메시지의 data (Backend → Frontend, Game02 뷰 제어). X/Y는 도 단위 */
export interface ViewPoseData {
  X: number;
  Y: number;
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
  ERROR: 'ERROR',
  ACK: 'ACK',
  /** Welcome 씬에서 human 감지 시 Python → 프론트. 프론트는 백엔드에 HUMAN_DETECTED 전달 → 백엔드가 SET_SCENE QR */
  HUMAN_DETECTED: 'HUMAN_DETECTED',
  /** Python → 프론트: 참여자 이탈 감지. 프론트는 백엔드에 HUMAN_OUT 전달 → 백엔드가 후속 시퀀스 진행 */
  HUMAN_OUT: 'HUMAN_OUT',
  /** QR 씬에서 Python이 QR 인식 시 → 프론트는 백엔드에 QR_SCANNED 전달 */
  QR_SCANNED: 'QR_SCANNED',
  /** QR 씬에서 스캔 영역(ROI) 전달. left/top/width/height 비율(0~1). 프론트는 파란 상자 위치·크기에 반영 */
  QR_ROI: 'QR_ROI',
  /** GAME05 씬에서 Python이 공격 이벤트 전송. 수신 시 공격 애니메이션만 실행 (data는 더미) */
  GAME05_ATTACK: 'GAME05_ATTACK',
  /** 프론트 → Python: Game02 본게임 시작 시그널 (버튼/카운트다운 후). Python은 on_main_game_start() 처리 */
  GAME02_MAINGAME_START: 'GAME02_MAINGAME_START',
  /** Python → 프론트: Game02 fix된 참여자 이탈 시 일시정지 안내. 프론트는 PAUSE 오버레이 표시 후 터치로 해제 */
  GAME02_PAUSE: 'GAME02_PAUSE',
  /** Python → 프론트: Game02 본게임 중 rock 인식 시 0~100 진행률 (3초 유지 시 100). data: { progress: number } */
  GAME02_PROGRESS_ANSWER: 'GAME02_PROGRESS_ANSWER',
  /** 프론트 → Python: Game04 본게임 시작 시그널. Python은 on_main_game_start() 처리 */
  GAME04_MAINGAME_START: 'GAME04_MAINGAME_START',
  /** Python → 프론트: fix된 참여자 이탈 시 일시정지 안내. 프론트는 PAUSE 오버레이 표시 후 터치로 해제 */
  GAME04_PAUSE: 'GAME04_PAUSE',
  /** 프론트 → Python: Capture 씬 카운트다운 완료 시 캡처 신호. Python은 현재 프레임으로 스케치 생성 */
  SKETCH_CAPTURE: 'SKETCH_CAPTURE',
  /** Python → 프론트: SKETCH_CAPTURE 처리 완료. 4가지 스타일 이미지(Base64)를 포함. CAPTURE→LASER_STYLE 전환 트리거 */
  SKETCH_RESULT: 'SKETCH_RESULT',
  /** Python → 프론트: 레이저 가공 완료 알림. 수신 시 프론트/백엔드 시퀀스 진행용 */
  MACHINING_COMPLETE: 'MACHINING_COMPLETE',
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

/** ERROR 메시지의 data (Python → 프론트) */
export interface VisionErrorData {
  message?: string;
}

/** HUMAN_DETECTED 메시지의 data (Python → 프론트, Welcome 씬에서 human 감지 시) */
export interface VisionHumanDetectedData {
  detected: boolean;
}

/** HUMAN_OUT 메시지의 data (Python → 프론트). 이벤트성이라 payload는 optional. */
export interface VisionHumanOutData {
  out?: boolean;
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

/** QR_ROI 메시지의 data (Python → 프론트). 비율(0~1). left/top = 영역 왼쪽·위 기준, width/height = 영역 크기. */
export interface VisionQRROIData {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** SKETCH_RESULT 메시지의 data (Python → 프론트). 4가지 스타일 이미지(Base64 문자열). */
export interface VisionSketchResultData {
  success: boolean;
  error_message?: string;
  /** Base64 문자열 4개 (순서: REAL, ANIME, DISNEY, CHIBI) */
  images: string[];
  /** 이미지 MIME 포맷 */
  format: 'jpeg';
}

/** MACHINING_COMPLETE 메시지의 data (Exhibition_Drawing ProtocolBridge → 프론트). 레이저 가공 완료 시 1(성공)/0(실패). */
export interface VisionMachiningCompleteData {
  success?: number;
}

/** @deprecated VisionMessageType 대신 VisionMessageName 사용 */
export const VisionMessageType = {
  SET_SCENE_PY: VisionMessageName.SET_SCENE,
  REQ_HAND_GESTURE: VisionMessageName.REQ_HAND_GESTURE,
  RES_HAND_GESTURE: VisionMessageName.RES_HAND_GESTURE,
  GAME_START: VisionMessageName.GAME_START,
  GAME_STOP: VisionMessageName.GAME_STOP,
  HUMAN_DETECTED: VisionMessageName.HUMAN_DETECTED,
  QR_SCANNED: VisionMessageName.QR_SCANNED,
  QR_ROI: VisionMessageName.QR_ROI,
  GAME05_ATTACK: VisionMessageName.GAME05_ATTACK,
} as const;
export type VisionMessageTypeValue = (typeof VisionMessageType)[keyof typeof VisionMessageType];
