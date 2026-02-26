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

// VIEW_POSE (X,Y mm) → 뷰포트 이동
export const VIEW_MM_RANGE_X = 100;           // X(mm) ±이 범위가 뷰포트 좌우 전체 이동에 대응
export const VIEW_MM_RANGE_Y = 100;           // Y(mm) ±이 범위가 뷰포트 상하 전체 이동에 대응
export const VIEW_MM_DEADZONE = 5;            // 이 거리(mm) 이하는 무시 (떨림 방지)
export const VIEW_POSE_SMOOTH_ALPHA = 0.18;   // EMA 스무딩 계수
export const VIEW_POSE_STALE_MS = 800;        // 오래된 값 무시 시간 (ms)

// Settings for image generation mode
export const SETTINGS = {
  // true: Use Gemini API to generate new images
  // false: Use local image sets from data/ImageSets/
  USE_API_MAKE_IMAGE: false,
  // true: 헤드 포즈 디버그 정보 표시
  DEBUG_MODE: true,
} as const;
