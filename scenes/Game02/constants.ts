/**
 * Game02 Constants and Settings
 */

// Viewport zoom level (shows 1/9 of full image)
export const VIEW_ZOOM = 3;
export const VIEW_AREA = 1 / (VIEW_ZOOM * VIEW_ZOOM);

// Default aspect ratio for scene images
export const DEFAULT_SCENE_ASPECT = 16 / 9;

// Game timer in seconds
export const GAME_TIME_LIMIT = 120;

// Announcing screen duration in milliseconds
export const ANNOUNCING_DURATION = 3000;

// Click tolerance padding (percentage of box size)
export const CLICK_PADDING_RATIO = 0.6;
export const CLICK_PADDING_MIN = 20;

// HumanTrack HeadPose 설정
export const HEADPOSE_YAW_RANGE_DEG = 50;    // 좌우 회전 범위 (±도)
export const HEADPOSE_PITCH_RANGE_DEG = 40;  // 상하 회전 범위 (±도)
export const HEADPOSE_DEADZONE = 0.08;       // 데드존 (정규화된 값)
export const HEADPOSE_SMOOTH_ALPHA = 0.18;   // EMA 스무딩 계수
export const HEADPOSE_STALE_MS = 800;        // 오래된 포즈 무시 시간 (ms)
export const HEADPOSE_MAX_DELTA_DEG = 90;    // 최대 허용 각도 변화

// Settings for image generation mode
export const SETTINGS = {
  // true: Use Gemini API to generate new images
  // false: Use local image sets from data/ImageSets/
  USE_API_MAKE_IMAGE: false,
  // true: 헤드 포즈 디버그 정보 표시
  DEBUG_MODE: true,
} as const;
