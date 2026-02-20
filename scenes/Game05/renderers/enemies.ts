/**
 * 적/친구 렌더링
 */

import { GameState, GameAssets } from '../Game05.types';
import {
  GROUND_Y,
  ENEMY_SCALE,
  ENEMY_OFFSET_Y,
  FRIEND_SCALE,
  FRIEND_OFFSET_Y,
  ENEMY_HIT_FRAMES,
  ENEMY_HIT_SCALE_START,
  ENEMY_HIT_SCALE_END,
  ENEMY_HIT_ROTATION,
  FRIEND_HIT_FRAMES,
  FRIEND_HIT_SCALE_START,
  FRIEND_HIT_SCALE_END,
  FRIEND_HIT_ROTATION,
} from '../constants';

export function drawEnemies(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState
): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const frames = enemy.isFriend ? assets.friendFrames : assets.enemyFrames;
    const img = frames[enemy.frame % frames.length];
    const scale = enemy.isFriend ? FRIEND_SCALE : ENEMY_SCALE;
    const offsetY = enemy.isFriend ? FRIEND_OFFSET_Y : ENEMY_OFFSET_Y;
    if (!img?.naturalWidth) continue;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, enemy.x - w / 2, GROUND_Y - h + offsetY, w, h);
  }
}

export function drawFlyingEnemies(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState
): void {
  for (const fe of state.flyingEnemies) {
    const hitImg = fe.isFriend ? assets.friendHitImg : assets.enemyHitImg;
    const maxFrames = fe.isFriend ? FRIEND_HIT_FRAMES : ENEMY_HIT_FRAMES;
    const scaleStart = fe.isFriend ? FRIEND_HIT_SCALE_START : ENEMY_HIT_SCALE_START;
    const scaleEnd = fe.isFriend ? FRIEND_HIT_SCALE_END : ENEMY_HIT_SCALE_END;
    const rot = fe.isFriend ? FRIEND_HIT_ROTATION : ENEMY_HIT_ROTATION;
    if (!hitImg?.naturalWidth) continue;
    const t = fe.frame / maxFrames;
    const scale = scaleStart + (scaleEnd - scaleStart) * t;
    const alpha = 1.0 - t * 0.5;
    const w = hitImg.naturalWidth * scale;
    const h = hitImg.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(fe.x, fe.y - h / 2);
    ctx.rotate(rot * t);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(hitImg, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
