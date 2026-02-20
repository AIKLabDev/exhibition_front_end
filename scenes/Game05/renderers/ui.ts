/**
 * UI 렌더링
 */

import { GameState, GameAssets } from '../Game05.types';
import { MAX_HP } from '../constants';

export function drawScore(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number
): void {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SCORE: ' + state.score, W - 10, 20);
}

export function drawHP(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number
): void {
  const barW = 20, barH = 14, gap = 4, startY = 8;
  const hpBarTotalWidth = MAX_HP * barW + (MAX_HP - 1) * gap;
  const startX = Math.round((W / 2 + (W - 10)) / 2 - hpBarTotalWidth / 2);

  for (let i = 0; i < MAX_HP; i++) {
    const x = startX + i * (barW + gap);
    if (i < state.hp) {
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(x, startY, barW, barH);
      ctx.fillStyle = '#ff6666';
      ctx.fillRect(x + 2, startY + 2, barW - 4, barH / 2 - 2);
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(x, startY, barW, barH);
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, startY, barW, barH);
  }
}

export function drawTimer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number
): void {
  const sec = Math.max(0, Math.ceil(state.remainingTime));
  ctx.fillStyle = sec <= 5 ? '#ff3333' : '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TIME: ' + sec, W / 2, 20);
}

export function drawTitle(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState,
  dt: number,
  W: number,
  H: number
): void {
  if (!assets.titleImg?.naturalWidth) return;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(assets.titleImg, 0, 0, W, H);
  state.titleBlinkTimer += dt;
  if (Math.floor(state.titleBlinkTimer * 2.5) % 2 === 0) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText('PRESS START', W / 2, H - 25);
    ctx.shadowBlur = 0;
  }
}

export function drawVictory(
  ctx: CanvasRenderingContext2D,
  W: number
): void {
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 6;
  ctx.fillText('STAGE CLEAR', W / 2, 50);
  ctx.shadowBlur = 0;
}

export function drawDefeat(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number
): void {
  const blinkRate = 10;
  const blinkAlpha = Math.floor(state.defeatTimer * blinkRate) % 2 === 0 ? 0.6 : 0.3;
  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${blinkAlpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 6;
  ctx.fillText('YOU DIE', W / 2, 50);
  ctx.shadowBlur = 0;
}

export function drawResult(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: GameState,
  W: number,
  H: number
): void {
  const img = state.resultType === 'win' ? assets.winImg : assets.defeatImg;
  if (!img?.naturalWidth) return;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 4;
  ctx.fillText('SCORE: ' + state.score, W / 2, H - 40);
  ctx.shadowBlur = 0;
}
