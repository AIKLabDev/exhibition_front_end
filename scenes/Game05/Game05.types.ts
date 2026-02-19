/**
 * Game05 (플래포머) 전용 타입
 */

export interface Game05Props {
  /** 게임 결과(승/패) 전달 */
  onGameResult?: (result: 'WIN' | 'LOSE') => void;
}
