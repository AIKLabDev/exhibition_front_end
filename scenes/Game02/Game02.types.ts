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
  /** 종료 시 남은 제한시간(초). App이 백엔드 GAME_RESULT에 score 키로 전달(게임04/05와 필드명 통일) */
  onGameResult: (result: 'WIN' | 'LOSE', score: number) => void;
  /** 백엔드 GAME_START 수신 시 App이 증가시켜 전달. 0 → N 되면 버튼 없이 게임 시작 */
  triggerStartFromBackend?: number;
}

export interface VerificationResult {
  success: boolean;
  reasoning: string;
}
