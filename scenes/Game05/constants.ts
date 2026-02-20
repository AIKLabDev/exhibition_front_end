/**
 * Game05 플래포머 게임 상수 (new_ 버전 기준)
 */

// ── 달리기 설정 ──
export const CHAR_X = 290;
export const ANIM_FPS = 24;
export const SCALE = 0.8;

// ── 공격 설정 ──
export const ATTACK_SCALE = 0.8;
export const ATTACK_OFFSET_X = 0;
export const ATTACK_OFFSET_Y = 10;
export const HIT_RANGE = 100;
export const ATTACK_FPS = 12;

// ── 적 피격 날아가기 설정 ──
export const ENEMY_HIT_FRAMES = 4;
export const ENEMY_HIT_FPS = 16;
export const ENEMY_HIT_SCALE_START = 0.8;
export const ENEMY_HIT_SCALE_END = 3.0;
export const ENEMY_HIT_ROTATION = Math.PI * 2;

// ── 히트 이펙트 설정 ──
export const HIT_EFFECT_DURATION = 0.15;
export const HIT_EFFECT_SCALE = 1.0;

// ── 피격(데미지) 설정 ──
export const MAX_HP = 3;
export const DAMAGE_SHAKE_DURATION = 0.2;
export const DAMAGE_SHAKE_INTENSITY = 6;
export const DAMAGE_RED_DURATION = 0.2;
export const HERO_HIT_DURATION = 0.2;
export const HERO_HIT_SCALE = 0.35;

// ── 적 설정 ──
export const ENEMY_SCALE = 1.0;
export const ENEMY_OFFSET_Y = 10;
export const ENEMY_ANIM_FPS = 24;
export const ENEMY_SPEED_MIN = 300;
export const ENEMY_SPEED_MAX = 500;
export const ENEMY_SPAWN_MIN = 0.5;
export const ENEMY_SPAWN_MAX = 2.0;
export const ENEMY_SPAWN_DECREASE = 0.2;
export const ENEMY_SPEED_INCREASE = 20;

// ── 친구 설정 ──
export const FRIEND_SCALE = 0.8;
export const FRIEND_OFFSET_Y = 10;
export const FRIEND_ANIM_FPS = 24;
export const FRIEND_START_TIME = 8;
export const FRIEND_CHANCE = 0.3;
export const FRIEND_OK_DURATION = 0.2;
export const FRIEND_OK_SCALE = 0.14;
export const HEART_SCALE_START = 0.1;
export const HEART_SCALE_END = 0.5;
export const FRIEND_HIT_FRAMES = 4;
export const FRIEND_HIT_FPS = 16;
export const FRIEND_HIT_SCALE_START = 0.8;
export const FRIEND_HIT_SCALE_END = 3.0;
export const FRIEND_HIT_ROTATION = Math.PI * 2;

// ── 게임 진행 설정 ──
export const GAME_DURATION = 30;

// ── 레이어 스크롤 속도 ──
export const FAR_BG_SPEED = 15;
export const TREE_SPEED = 60;
export const GROUND_Y = 155;

// ── 그라운드 레이어 (캐릭터 앞, 가장 빠름) ──
export const GROUND_LAYER_SPEED = 220;
export const GROUND_LAYER_OFFSET_Y = 50;
export const GROUND_LAYER_SCALE = 0.2;

// ── 승리 애니메이션 ──
export const VICTORY_CHAR_SPEED = 200;

// ── 패배 애니메이션 ──
export const DEFEAT_DURATION = 2.0;
export const DEFEAT_SLOW_MOTION = 0.3;

/** 내부 캔버스 해상도 */
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 180;

/** 에셋 베이스 URL */
export const ASSET_BASE = '/game05';
