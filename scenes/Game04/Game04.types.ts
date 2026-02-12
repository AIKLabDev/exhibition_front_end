/**
 * Game04 (Zombie Defender) 전용 타입
 */

export interface Game04Props {
  /** 게임 결과(WIN/LOSE) 전달 → App이 백엔드에 GAME_RESULT 전송 */
  onGameResult?: (result: 'WIN' | 'LOSE') => void;
}
