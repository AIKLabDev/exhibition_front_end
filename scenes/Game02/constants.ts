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

// Settings for image generation mode
export const SETTINGS = {
  // true: Use Gemini API to generate new images
  // false: Use local image sets from data/ImageSets/
  USE_API_MAKE_IMAGE: false,
} as const;
