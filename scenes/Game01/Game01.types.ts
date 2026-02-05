/**
 * RPS (Rock-Paper-Scissors) Game Types
 * Game01 전용 타입 정의
 */

export type RpsChoice = 'rock' | 'paper' | 'scissors';

export type RpsGameStatus = 'idle' | 'hyping' | 'result';

export type RpsResult = 'win' | 'lose' | 'draw';

export interface RpsGameState {
  userChoice: RpsChoice | null;
  aiChoice: RpsChoice | null;
  status: RpsGameStatus;
  score: { user: number; ai: number };
  lastResult: RpsResult | null;
  hypeText: string;
  aiComment: string;
}

export interface Game01Props {
  onGameResult: (result: RpsResult, userChoice: RpsChoice, aiChoice: RpsChoice) => void;
}
