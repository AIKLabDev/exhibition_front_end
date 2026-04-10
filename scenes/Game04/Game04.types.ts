/**
 * Game04 (Zombie Defender) 전용 타입
 */

export type Game04InputMode = 'mouse' | 'head';

export interface Game04Props {
  /** 게임 결과(WIN/LOSE) 및 최종 점수 전달 → App이 백엔드 GAME_RESULT에 포함 */
  onGameResult?: (result: 'WIN' | 'LOSE', score: number) => void;
  /** 디버그 UI에서 지정 시 강제 입력 모드 (없으면 HEAD_POSE 수신 시 head, 3초 후 mouse 폴백) */
  inputMode?: Game04InputMode;
  /** 백엔드 GAME_START 수신 시 App이 증가시켜 전달. 0 → N 되면 버튼 없이 게임 시작 */
  triggerStartFromBackend?: number;
  /** 체인 모드 등: 결과 화면에서 "다시 시작" 숨김(자동 다음 씬만 사용) */
  hideResultRestart?: boolean;
  /** 백엔드 GAME_TOP_SCORE로 수신한 역대 최고 점수(포인트). 현재 점수가 초과하면 신기록 효과 표시 */
  topScore?: number;
}
