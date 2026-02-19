/**
 * Game04 (Zombie Defender) 전용 타입
 */

export type Game04InputMode = 'mouse' | 'head';

export interface Game04Props {
  /** 게임 결과(WIN/LOSE) 전달 → App이 백엔드에 GAME_RESULT 전송 */
  onGameResult?: (result: 'WIN' | 'LOSE') => void;
  /** 디버그 UI에서 지정 시 강제 입력 모드 (없으면 HEAD_POSE 수신 시 head, 3초 후 mouse 폴백) */
  inputMode?: Game04InputMode;
}
