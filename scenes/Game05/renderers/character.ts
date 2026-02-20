/**
 * 캐릭터 렌더링
 */

import { GameState, GameAssets } from '../Game05.types';
import {
  GROUND_Y,
  SCALE,
  ATTACK_SCALE,
  ATTACK_OFFSET_X,
  ATTACK_OFFSET_Y,
  HERO_HIT_SCALE,
} from '../constants';

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState
): void {
  if (state.friendOkTimer > 0) return;

  let img: HTMLImageElement | undefined;
  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (state.heroHitTimer > 0 && assets.heroHitImg?.naturalWidth) {
    img = assets.heroHitImg;
    scale = HERO_HIT_SCALE;
  } else if (state.isAttacking && state.gameState !== 'victory') {
    img = assets.attackFrames[state.attackFrame % assets.attackFrames.length];
    scale = ATTACK_SCALE;
    offsetX = ATTACK_OFFSET_X;
    offsetY = ATTACK_OFFSET_Y;
  } else {
    img = assets.runFrames[state.currentFrame % assets.runFrames.length];
    scale = SCALE;
    offsetY = 10;
  }

  if (!img?.naturalWidth) return;

  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;

  ctx.imageSmoothingEnabled = false;

  if (state.heroHitTimer > 0) {
    const blinkRate = state.gameState === 'defeat' ? 20 : 15;
    if (Math.floor(state.heroHitTimer * blinkRate) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
  }

  ctx.drawImage(img, state.charX - w / 2 + offsetX, GROUND_Y - h + offsetY, w, h);
  ctx.globalAlpha = 1.0;
}
