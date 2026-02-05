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
  onGameResult: (result: 'win' | 'lose') => void;
}

export interface VerificationResult {
  success: boolean;
  reasoning: string;
}
