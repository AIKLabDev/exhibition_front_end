/**
 * Game04 (Zombie Defender) 상수
 * 문자열은 GAME04_STRINGS에 모아 수정 편의
 */

// 게임 설정
export const GAME_DURATION = 20; // 생존 시간 (초)
export const PLAYER_HEIGHT = 1.6;
export const SPAWN_RADIUS = 35;
export const BULLET_SPEED = 60;
export const ZOMBIE_BASE_SPEED = 8;
export const FIRE_RATE = 90; // ms 간격
export const PLAYER_MAX_HEALTH = 5;
export const INITIAL_SPAWN_INTERVAL = 600; // ms
export const MIN_SPAWN_INTERVAL = 80; // ms

/** 레이더에 표시할 좀비 감지 거리 (이 거리 안의 좀비만 UI에 점으로 표시) */
export const RADAR_DETECT_RANGE = 28;

/** 레이더 시야각(도). 상단 반원 = 정면 180° (이 범위 안의 좀비만 레이더에 표시) */
export const RADAR_ANGLE_DEGREES = 180;

/**
 * 조준·스폰 공통 시야각(도). 모니터를 보며 고개를 돌릴 수 있는 범위.
 * - 머리/마우스 조준: 이 각도(±절반)로 제한
 * - 좀비 스폰: 정면 이 각도 안에서만 생성
 */
export const PLAYER_VIEW_ANGLE_DEGREES = 70;

/** Game04 UI 문자열 — 수정 시 이 객체만 편집 */
export const GAME04_STRINGS = {
  TITLE: '좀비고속도로',
  SUBTITLE: '얼굴을 움직여 조준하세요 • 20초 동안 생존',
  CONNECTING: '[ 조준 시스템 초기화 중 ]',
  START_BUTTON: '시작',
  SCORE_LABEL: '점수',
  VICTORY_TITLE: '생존',
  DEFEAT_TITLE: '감염됨',
  SCORE_PREFIX: '점수: ',
  RETRY_WIN: '다시 시작',
  RETRY_LOSE: '다시 시작',
  MOUSE_FALLBACK: '수동 조준',
  MOUSE_ACTIVE: '마우스 조준 활성화',
  HEAD_TRACKING: '머리 추적 온라인',
} as const;
