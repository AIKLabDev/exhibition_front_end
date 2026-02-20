/**
 * 이펙트 렌더링
 */

import { GameState, GameAssets } from '../Game05.types';
import {
  GROUND_Y,
  HIT_EFFECT_DURATION,
  HIT_EFFECT_SCALE,
  FRIEND_OK_DURATION,
  FRIEND_OK_SCALE,
  HEART_SCALE_START,
  HEART_SCALE_END,
  DAMAGE_RED_DURATION,
} from '../constants';

export function drawHitEffects(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState
): void {
  if (!assets.hitEffectImg?.naturalWidth) return;
  for (const he of state.hitEffects) {
    const w = assets.hitEffectImg.naturalWidth * HIT_EFFECT_SCALE;
    const h = assets.hitEffectImg.naturalHeight * HIT_EFFECT_SCALE;
    const alpha = he.timer / HIT_EFFECT_DURATION;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.hitEffectImg, he.x - w / 2, he.y - h / 2, w, h);
    ctx.restore();
  }
}

export function drawFriendOkEffect(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState
): void {
  if (state.friendOkTimer <= 0) return;
  const progress = 1 - state.friendOkTimer / FRIEND_OK_DURATION;

  if (assets.friendOkImg?.naturalWidth) {
    const okW = assets.friendOkImg.naturalWidth * FRIEND_OK_SCALE;
    const okH = assets.friendOkImg.naturalHeight * FRIEND_OK_SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.friendOkImg, state.charX - okW / 2, GROUND_Y - okH + 10, okW, okH);
  }

  if (assets.heartImg?.naturalWidth) {
    const heartScale = HEART_SCALE_START + (HEART_SCALE_END - HEART_SCALE_START) * progress;
    const hW = assets.heartImg.naturalWidth * heartScale;
    const hH = assets.heartImg.naturalHeight * heartScale;
    const hX = state.charX - hW / 2;
    const hY = GROUND_Y - 100 - hH / 2 - progress * 15;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.heartImg, hX, hY, hW, hH);
    ctx.restore();
  }
}

export function drawDamageOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number
): void {
  if (state.damageRedTimer <= 0) return;
  const alpha = (state.damageRedTimer / DAMAGE_RED_DURATION) * 0.4;
  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
