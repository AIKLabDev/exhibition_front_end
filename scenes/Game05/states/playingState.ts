/**
 * Playing 상태 핸들러
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
  drawDamageOverlay,
  drawHP,
  drawTimer,
  drawScore,
} from '../renderers';
import {
  TREE_SPEED,
  ANIM_FPS,
  ATTACK_FPS,
  ENEMY_SPAWN_MAX,
  ENEMY_SPAWN_MIN,
  ENEMY_SPAWN_DECREASE,
  ENEMY_SPEED_MIN,
  ENEMY_SPEED_MAX,
  ENEMY_SPEED_INCREASE,
  ENEMY_ANIM_FPS,
  FRIEND_ANIM_FPS,
  FRIEND_START_TIME,
  FRIEND_CHANCE,
  ENEMY_HIT_FPS,
  FRIEND_HIT_FPS,
  ENEMY_HIT_FRAMES,
  FRIEND_HIT_FRAMES,
  HIT_RANGE,
  ENEMY_SCALE,
  FRIEND_SCALE,
  GROUND_Y,
  HIT_EFFECT_DURATION,
  MAX_HP,
  DAMAGE_SHAKE_DURATION,
  DAMAGE_RED_DURATION,
  HERO_HIT_DURATION,
  FRIEND_OK_DURATION,
  DAMAGE_SHAKE_INTENSITY,
  CANVAS_WIDTH as W,
} from '../constants';
import { playSfx } from '../sounds';

function getSpawnInterval(state: GameState): number {
  return Math.max(ENEMY_SPAWN_MAX - state.enemySpawnCount * ENEMY_SPAWN_DECREASE, ENEMY_SPAWN_MIN);
}

function spawnEnemy(state: GameState): void {
  const speed = Math.min(ENEMY_SPEED_MIN + state.enemySpawnCount * ENEMY_SPEED_INCREASE, ENEMY_SPEED_MAX);
  const isFriend = state.gameTime >= FRIEND_START_TIME && Math.random() < FRIEND_CHANCE;
  state.enemies.push({ x: W + 50, speed, frame: 0, animTimer: 0, alive: true, isFriend });
  state.enemySpawnCount++;
}

export const playingState: StateHandler = {
  onEnter: (_state: GameState, sounds: GameSounds | null) => {
    if (sounds) {
      sounds.stageBgm.play().catch(() => {});
      sounds.runSfx.play().catch(() => {});
    }
  },

  onExit: (_state: GameState, sounds: GameSounds | null) => {
    if (sounds) {
      sounds.stageBgm.pause();
      sounds.stageBgm.currentTime = 0;
      sounds.runSfx.pause();
      sounds.runSfx.currentTime = 0;
    }
  },

  update: (
    state: GameState,
    dt: number,
    assets: GameAssets,
    sounds: GameSounds | null
  ): GameStateType | null => {
    // 스크롤
    state.scrollX += TREE_SPEED * dt;

    // 공격 애니메이션
    if (state.isAttacking) {
      state.attackTimer += dt;
      if (state.attackTimer >= 1 / ATTACK_FPS) {
        state.attackTimer -= 1 / ATTACK_FPS;
        state.attackFrame++;
        // 공격 히트 체크는 외부에서 처리
        if (state.attackFrame >= assets.attackFrames.length) {
          state.isAttacking = false;
          state.attackFrame = 0;
          state.attackHitProcessed = false;
        }
      }
    } else {
      state.animTimer += dt;
      if (state.animTimer >= 1 / ANIM_FPS) {
        state.animTimer -= 1 / ANIM_FPS;
        state.currentFrame = (state.currentFrame + 1) % assets.runFrames.length;
      }
    }

    // 적 스폰
    state.enemySpawnTimer -= dt;
    if (state.enemySpawnTimer <= 0) {
      spawnEnemy(state);
      state.enemySpawnTimer = getSpawnInterval(state);
    }

    // 타이머
    state.gameTime += dt;
    state.remainingTime -= dt;

    // 승패 판정
    if (state.hp <= 0) {
      return 'defeat';
    } else if (state.remainingTime <= 0) {
      return 'victory';
    }

    // 적/친구 업데이트
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      enemy.x -= enemy.speed * dt;
      const animFps = enemy.isFriend ? FRIEND_ANIM_FPS : ENEMY_ANIM_FPS;
      const fArr = enemy.isFriend ? assets.friendFrames : assets.enemyFrames;
      enemy.animTimer += dt;
      if (enemy.animTimer >= 1 / animFps) {
        enemy.animTimer -= 1 / animFps;
        enemy.frame = (enemy.frame + 1) % fArr.length;
      }

      // 캐릭터와 충돌
      if (enemy.x <= state.charX) {
        enemy.alive = false;
        if (enemy.isFriend) {
          state.hp = Math.min(MAX_HP, state.hp + 1);
          state.friendOkTimer = FRIEND_OK_DURATION;
          if (sounds) playSfx(sounds.energySfx);
        } else {
          state.hp = Math.max(0, state.hp - 1);
          state.damageShakeTimer = DAMAGE_SHAKE_DURATION;
          state.damageRedTimer = DAMAGE_RED_DURATION;
          state.heroHitTimer = HERO_HIT_DURATION;
          if (sounds) playSfx(sounds.heroHitSfx);
        }
      }
    }
    state.enemies = state.enemies.filter((e) => e.alive);

    // 날아가는 적 애니메이션
    for (const fe of state.flyingEnemies) {
      const fps = fe.isFriend ? FRIEND_HIT_FPS : ENEMY_HIT_FPS;
      fe.timer += dt;
      if (fe.timer >= 1 / fps) {
        fe.timer -= 1 / fps;
        fe.frame++;
      }
    }
    state.flyingEnemies = state.flyingEnemies.filter((fe) => {
      const maxFrames = fe.isFriend ? FRIEND_HIT_FRAMES : ENEMY_HIT_FRAMES;
      return fe.frame < maxFrames;
    });

    // 이펙트 타이머
    for (const he of state.hitEffects) he.timer -= dt;
    state.hitEffects = state.hitEffects.filter((he) => he.timer > 0);
    if (state.friendOkTimer > 0) state.friendOkTimer -= dt;
    if (state.damageShakeTimer > 0) state.damageShakeTimer -= dt;
    if (state.damageRedTimer > 0) state.damageRedTimer -= dt;
    if (state.heroHitTimer > 0) state.heroHitTimer -= dt;

    return null;
  },

  render: (state: GameState, ctx: CanvasRenderingContext2D, assets: GameAssets, W: number, H: number) => {
    ctx.save();
    if (state.damageShakeTimer > 0) {
      ctx.translate(
        (Math.random() - 0.5) * 2 * DAMAGE_SHAKE_INTENSITY,
        (Math.random() - 0.5) * 2 * DAMAGE_SHAKE_INTENSITY
      );
    }
    drawFarBackground(ctx, assets, state, W, H);
    drawTreeLayer(ctx, assets, state, W);
    drawGround(ctx, assets, state, W, H);
    drawEnemies(ctx, assets, state);
    drawFlyingEnemies(ctx, assets, state);
    drawHitEffects(ctx, assets, state);
    drawCharacter(ctx, assets, state);
    drawFriendOkEffect(ctx, assets, state);
    drawGroundLayer(ctx, assets, state, W, H);
    ctx.restore();
    drawDamageOverlay(ctx, state, W, H);
    drawHP(ctx, state, W);
    drawTimer(ctx, state, W);
    drawScore(ctx, state, W);
  },
};

// 공격 히트 체크 함수 (외부에서 사용)
export function checkAttackHit(
  state: GameState,
  assets: GameAssets,
  sounds: GameSounds | null,
  hitSfxIndex: { current: number }
): void {
  if (state.attackHitProcessed) return;
  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.x <= state.charX) continue;
    const eScale = enemy.isFriend ? FRIEND_SCALE : ENEMY_SCALE;
    const eFrameArr = enemy.isFriend ? assets.friendFrames : assets.enemyFrames;
    const eImg = eFrameArr[enemy.frame % eFrameArr.length];
    const eHalfW = eImg?.naturalWidth ? (eImg.naturalWidth * eScale) / 2 : 20;
    if (enemy.x - eHalfW < state.charX + HIT_RANGE && enemy.x > state.charX - 80) {
      enemy.alive = false;
      state.attackHitProcessed = true;
      if (enemy.isFriend) {
        state.hp = Math.max(0, state.hp - 1);
        state.damageShakeTimer = DAMAGE_SHAKE_DURATION;
        state.damageRedTimer = DAMAGE_RED_DURATION;
        state.heroHitTimer = HERO_HIT_DURATION;
        state.flyingEnemies.push({ x: enemy.x, y: GROUND_Y, frame: 0, timer: 0, isFriend: true });
        if (sounds) {
          playSfx(sounds.friendHitSfx);
          playSfx(sounds.heroHitSfx);
        }
      } else {
        state.score++;
        state.flyingEnemies.push({ x: enemy.x, y: GROUND_Y, frame: 0, timer: 0, isFriend: false });
        state.hitEffects.push({ x: enemy.x, y: GROUND_Y - 40, timer: HIT_EFFECT_DURATION });
        if (sounds) {
          const hitSfx = sounds.hitSfxPool[hitSfxIndex.current % sounds.hitSfxPool.length];
          playSfx(hitSfx);
          hitSfxIndex.current++;
        }
      }
      break;
    }
  }
}
