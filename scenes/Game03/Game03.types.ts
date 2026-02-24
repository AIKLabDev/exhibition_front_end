/**
 * Game03 (Heart Hunt) 전용 타입
 * 카드 뒤집기 + 셔플 후 하트 찾기 게임 상태
 */

export enum GameState {
  /** 게임 시작 전 튜토리얼 (하트 기억하기 설명) */
  TUTORIAL = 'TUTORIAL',
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

/** state별 화면 컴포넌트에 공통으로 넘기는 뷰포트 기반 레이아웃 값 */
export interface Game03Layout {
  scaleW: number;
  scaleH: number;
  headerHeight: number;
  titleFontSize: number;
  resultFontSize: number;
  buttonFontSize: number;
  progressBarWidth: number;
  progressBarHeight: number;
  CARD_WIDTH: number;
  CARD_HEIGHT: number;
  CARD_GAP: number;
}
