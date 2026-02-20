/**
 * Defeat 상태 핸들러
 */

import { StateHandler, GameState, GameAssets, GameSounds, GameStateType } from '../Game05.types';
import {
  drawFarBackground,
  drawTreeLayer,
  drawGround,
  drawGroundLayer,
  drawCharacter,
  drawEnemies,
  drawFlyingEnemies,
  drawHitEffects,
  drawFriendOkEffect,
  drawDefeat,
  drawHP,
  drawScore,
} from '../renderers';
import {
  TREE_SPEED,
  ANIM_FPS,
  DEFEAT_DURATION,
  DEFEAT_SLOW_MOTION,
  ENEMY_ANIM_FPS,
  FRIEND_ANIM_FPS,
  ENEMY_HIT_FPS,
  FRIEND_HIT_FPS,
  ENEMY_HIT_FRAMES,
  FRIEND_HIT_FRAMES,
} from '../constants';
import { playSfx } from '../sounds';

export const defeatState: StateHandler = {
  onEnter: (state: GameState, sounds: GameSounds | null) => {
    state.defeatTimer = 0;
    state.heroHitTimer = DEFEAT_DURATION;

    if (sounds) {
      playSfx(sounds.defeatCutScene);
      playSfx(sounds.resultDefeatBgm);
    }
  },

  onExit: (_state: GameState, sounds: GameSounds | null) => {
    if (sounds) {
      // 일회성 사운드이므로 별도 정지 불필요
    }
  },

  update: (state: GameState, dt: number, assets: GameAssets): GameStateType | null => {
    const slowDt = dt * DEFEAT_SLOW_MOTION;

    state.defeatTimer += dt;
    state.scrollX += TREE_SPEED * slowDt;

    // 주인공 애니메이션 슬로우모션
    state.animTimer += slowDt;
    if (state.animTimer >= 1 / ANIM_FPS) {
      state.animTimer -= 1 / ANIM_FPS;
      state.currentFrame = (state.currentFrame + 1) % assets.runFrames.length;
    }

    // 주인공 피격 타이머 (실제 시간으로 감소)
    if (state.heroHitTimer > 0) {
      state.heroHitTimer -= dt;
    }

    // 적/친구 슬로우모션 업데이트
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      enemy.x -= enemy.speed * slowDt;
      const animFps = enemy.isFriend ? FRIEND_ANIM_FPS : ENEMY_ANIM_FPS;
      const fArr = enemy.isFriend ? assets.friendFrames : assets.enemyFrames;
      enemy.animTimer += slowDt;
      if (enemy.animTimer >= 1 / animFps) {
        enemy.animTimer -= 1 / animFps;
        enemy.frame = (enemy.frame + 1) % fArr.length;
      }
    }

    // 날아가는 적 슬로우모션 업데이트
    for (const fe of state.flyingEnemies) {
      const fps = fe.isFriend ? FRIEND_HIT_FPS : ENEMY_HIT_FPS;
      fe.timer += slowDt;
      if (fe.timer >= 1 / fps) {
        fe.timer -= 1 / fps;
        fe.frame++;
      }
    }
    state.flyingEnemies = state.flyingEnemies.filter((fe) => {
      const maxFrames = fe.isFriend ? FRIEND_HIT_FRAMES : ENEMY_HIT_FRAMES;
      return fe.frame < maxFrames;
    });

    // 이펙트 타이머 슬로우모션
    for (const he of state.hitEffects) he.timer -= slowDt;
    state.hitEffects = state.hitEffects.filter((he) => he.timer > 0);
    if (state.friendOkTimer > 0) state.friendOkTimer -= slowDt;

    // 2초 후 결과 화면으로 전환
    if (state.defeatTimer >= DEFEAT_DURATION) {
      state.resultType = 'defeat';
      return 'result';
    }

    return null;
  },

  render: (state: GameState, ctx: CanvasRenderingContext2D, assets: GameAssets, W: number, H: number) => {
    drawFarBackground(ctx, assets, state, W, H);
    drawTreeLayer(ctx, assets, state, W);
    drawGround(ctx, assets, state, W, H);
    drawEnemies(ctx, assets, state);
    drawFlyingEnemies(ctx, assets, state);
    drawHitEffects(ctx, assets, state);
    drawCharacter(ctx, assets, state);
    drawFriendOkEffect(ctx, assets, state);
    drawGroundLayer(ctx, assets, state, W, H);
    drawDefeat(ctx, state, W, H);
    drawHP(ctx, state, W);
    drawScore(ctx, state, W);
  },
};
