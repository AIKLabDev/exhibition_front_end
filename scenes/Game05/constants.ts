/**
 * Game05 플래포머 게임 상수 (원본 index.html 기준)
 */

export const RUN_FRAME_COUNT = 18;
export const CHAR_X = 290;
export const ANIM_FPS = 24;
export const SCALE = 0.8;

export const ATTACK_FRAME_COUNT = 4;
export const ATTACK_SCALE = 0.8;
export const ATTACK_OFFSET_X = 0;
export const ATTACK_OFFSET_Y = 10;
export const HIT_RANGE = 120;

export const ENEMY_HIT_FRAMES = 4;
export const ENEMY_HIT_FPS = 16;
export const ENEMY_HIT_SCALE_START = 0.8;
export const ENEMY_HIT_SCALE_END = 3.0;
export const ENEMY_HIT_ROTATION = Math.PI * 2;

export const HIT_EFFECT_DURATION = 0.15;
export const HIT_EFFECT_SCALE = 1.0;

export const MAX_HP = 3;
export const DAMAGE_SHAKE_DURATION = 0.3;
export const DAMAGE_SHAKE_INTENSITY = 6;
export const DAMAGE_RED_DURATION = 0.4;

export const ENEMY_FRAME_COUNT = 15;
export const ENEMY_SCALE = 0.8;
export const ENEMY_OFFSET_Y = 15;
export const ENEMY_ANIM_FPS = 15;
export const ENEMY_SPEED_MIN = 300;
export const ENEMY_SPEED_MAX = 500;
export const ENEMY_SPAWN_MIN = 0.5;
export const ENEMY_SPAWN_MAX = 2.0;
export const ENEMY_SPAWN_DECREASE = 0.2;

export const FRIEND_FRAME_COUNT = 22;
export const FRIEND_SCALE = 0.8;
export const FRIEND_OFFSET_Y = 20;
export const FRIEND_ANIM_FPS = 15;
export const FRIEND_START_TIME = 8;
export const FRIEND_CHANCE = 0.3;
export const FRIEND_OK_DURATION = 0.3;
export const FRIEND_OK_SCALE = 1.0;
export const FRIEND_OK_SCALE_START = 0.1;
export const FRIEND_OK_FRAMES = 4;
export const FRIEND_HIT_FRAMES = 4;
export const FRIEND_HIT_FPS = 16;
export const FRIEND_HIT_SCALE_START = 0.8;
export const FRIEND_HIT_SCALE_END = 3.0;
export const FRIEND_HIT_ROTATION = Math.PI * 2;

export const GAME_DURATION = 30;
export const RESULT_AUTO_RETURN = 10;

export const FAR_BG_SPEED = 15;
export const TREE_SPEED = 60;
export const GROUND_Y = 155;

export const ATTACK_FPS = 12;
export const ENEMY_SPEED_INCREASE = 20;

/** 내부 캔버스 해상도 (원본과 동일, 스케일은 CSS로) */
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 180;

/** 에셋 베이스 URL (public/game05에 두면 /game05/... 로 로드) */
export const ASSET_BASE = '/game05';
