/**
 * Find Object (Hidden Object) Game Types
 * Game02 전용 타입 정의
 */

export enum Game02State {
  INTRO = 'INTRO',
  GENERATING = 'GENERATING',
  ANNOUNCING = 'ANNOUNCING',
  PLAYING = 'PLAYING',
  VERIFYING = 'VERIFYING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

export interface GameScenario {
  theme: string;
  targetObject: string;
  sceneImageBase64: string;
  targetBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export interface Game02Props {
  onGameResult: (result: 'WIN' | 'LOSE') => void;
  /** 백엔드 GAME_START 수신 시 App이 증가시켜 전달. 0 → N 되면 버튼 없이 게임 시작 */
  triggerStartFromBackend?: number;
  /** 체인 모드: GAME02_IDLE 직후 호출 → App이 GAME02_CHAIN_ROUND_END 전송 여부 결정 */
  notifyChainRoundEndIfNeeded?: () => void;
}

export interface VerificationResult {
  success: boolean;
  reasoning: string;
}
