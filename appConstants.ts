/**
 * 앱 전역 설정
 */

/** false: DEBUG 패널 진입 버튼 숨김, Game02 헤드포즈 디버그 블록 비표시 */
export const DEBUG_MODE = false;

/** 튜토리얼(룰) 화면에서 본게임(또는 Game02 생성) 시작 전 카운트다운 초 수 (예: 5 → 5,4,3,2,1 표시 후 시작) */
export const GAME_START_COUNTDOWN = 5;

/**
 * 프로젝트 루트 `movie/*.mp4` — dev/빌드 시 `/movie`로 제공 (vite.config movie-static 플러그인)
 */
export const TUTORIAL_VIDEO_URLS = {
  game02: '/movie/game02_tutorial.mp4',
  game04: '/movie/game04_tutorial.mp4',
  game05: '/movie/game05_tutorial.mp4',
} as const;

/** Welcome 씬 음성: 한 번 재생이 끝난 뒤 다음 재생까지 대기 시간(ms) */
export const WELCOME_VOICE_GAP_MS = 3000;
