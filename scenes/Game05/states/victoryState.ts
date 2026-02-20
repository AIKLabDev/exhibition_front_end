/**
 * Victory 상태 핸들러
 */

import { StateHandler, GameState, GameAssets, GameSounds, GameStateType } from '../Game05.types';
import {
  drawFarBackground,
  drawTreeLayer,
  drawGround,
  drawGroundLayer,
  drawCharacter,
  drawVictory,
  drawHP,
  drawScore,
} from '../renderers';
import { ANIM_FPS, VICTORY_CHAR_SPEED, CANVAS_WIDTH as W } from '../constants';
import { playSfx, stopAudio } from '../sounds';

export const victoryState: StateHandler = {
  onEnter: (state: GameState, sounds: GameSounds | null) => {
    // 적/이펙트 제거, 공격 상태 초기화
    state.enemies = [];
    state.flyingEnemies = [];
    state.hitEffects = [];
    state.isAttacking = false;
    state.attackFrame = 0;
    state.attackTimer = 0;

    if (sounds) {
      playSfx(sounds.resultWinBgm);
      sounds.winCutScene.play().catch(() => {});
    }
  },

  onExit: (_state: GameState, sounds: GameSounds | null) => {
    if (sounds) {
      stopAudio(sounds.resultWinBgm);
      stopAudio(sounds.winCutScene);
    }
  },

  update: (state: GameState, dt: number, assets: GameAssets): GameStateType | null => {
    // 달리기 애니메이션
    state.animTimer += dt;
    if (state.animTimer >= 1 / ANIM_FPS) {
      state.animTimer -= 1 / ANIM_FPS;
      state.currentFrame = (state.currentFrame + 1) % assets.runFrames.length;
    }

    // 캐릭터 이동
    state.charX += VICTORY_CHAR_SPEED * dt;

    // 화면 밖으로 나가면 result로 전환
    if (state.charX >= W + 100) {
      state.resultType = 'win';
      return 'result';
    }

    return null;
  },

  render: (state: GameState, ctx: CanvasRenderingContext2D, assets: GameAssets, W: number, H: number) => {
    drawFarBackground(ctx, assets, state, W, H);
    drawTreeLayer(ctx, assets, state, W);
    drawGround(ctx, assets, state, W, H);
    drawCharacter(ctx, assets, state);
    drawGroundLayer(ctx, assets, state, W, H);
    drawVictory(ctx, W);
    drawHP(ctx, state, W);
    drawScore(ctx, state, W);
  },
};
