/**
 * Game03 (Heart Hunt) 전용 타입
 * 카드 뒤집기 + 셔플 후 하트 찾기 게임 상태
 */

export enum GameState {
  IDLE = 'IDLE',
  REVEALING = 'REVEALING',
  SHUFFLING = 'SHUFFLING',
  CHOOSING = 'CHOOSING',
  RESULT = 'RESULT',
}

export enum CardType {
  BOMB = 'BOMB',
  HEART = 'HEART',
}

export interface CardData {
  id: number;
  type: CardType;
  positionIndex: number;
}

export interface Game03Props {
  /** 게임 결과(WIN/LOSE) 전달 → App이 백엔드에 GAME_RESULT 전송 */
  onGameResult?: (result: 'WIN' | 'LOSE') => void;
  /** 백엔드 GAME_START 수신 시 App이 증가시켜 전달. 0 → N 되면 버튼 없이 게임 시작 */
  triggerStartFromBackend?: number;
}
