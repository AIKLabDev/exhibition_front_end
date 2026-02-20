/**
 * 배경 렌더링
 */

import { GameState, GameAssets } from '../Game05.types';
import { GROUND_Y, GROUND_LAYER_SPEED, GROUND_LAYER_OFFSET_Y, GROUND_LAYER_SCALE, TREE_SPEED } from '../constants';

export function drawFarBackground(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState,
  W: number,
  H: number
): void {
  if (!assets.farImg.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  const farScale = H / assets.farImg.naturalHeight;
  const farW = assets.farImg.naturalWidth * farScale;
  const offset = -(state.scrollX * 0.05) % farW;
  for (let x = offset - farW; x < W + farW; x += farW) {
    ctx.drawImage(assets.farImg, x, 0, farW, H);
  }
}

export function drawTreeLayer(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState,
  W: number
): void {
  if (!assets.treesImg.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  const treeScale = 0.3;
  const treeW = assets.treesImg.naturalWidth * treeScale;
  const treeH = assets.treesImg.naturalHeight * treeScale;
  const treeY = GROUND_Y - treeH - 5;
  const offset = -(state.scrollX % treeW);
  for (let x = offset - treeW; x < W + treeW; x += treeW) {
    ctx.drawImage(assets.treesImg, x, treeY, treeW, treeH);
  }
}

export function drawGround(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState,
  W: number,
  H: number
): void {
  if (!assets.baseImg.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  const baseScale = H / assets.baseImg.naturalHeight;
  const baseW = assets.baseImg.naturalWidth * baseScale;
  const baseH = assets.baseImg.naturalHeight * baseScale;
  const baseY = H - baseH - 10;
  const offset = -((state.scrollX * 1.5) % baseW);
  for (let x = offset - baseW; x < W + baseW; x += baseW) {
    ctx.drawImage(assets.baseImg, x, baseY, baseW, baseH);
  }
}

export function drawGroundLayer(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState,
  W: number,
  H: number
): void {
  if (!assets.groundImg?.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  const gScale = GROUND_LAYER_SCALE;
  const gW = assets.groundImg.naturalWidth * gScale;
  const gH = assets.groundImg.naturalHeight * gScale;
  const gY = H - gH + GROUND_LAYER_OFFSET_Y;
  const offset = -((state.scrollX * (GROUND_LAYER_SPEED / TREE_SPEED)) % gW);
  for (let x = offset - gW; x < W + gW; x += gW) {
    ctx.drawImage(assets.groundImg, x, gY, gW, gH);
  }
}
