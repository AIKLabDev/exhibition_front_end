/**
 * Game05: 플래포머 (Platformer)
 * 원본: C:\AIKorea\플래포머\index.html
 * 캔버스 640x180 픽셀 아트 러닝/공격 게임. 적 격파·친구 구분(친구는 때리면 HP 감소).
 * 에셋: public/game05/ 아래에 asset/, bg_trees.png, base.png, far.jpeg 배치.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Game05Props } from './Game05.types';
import {
  RUN_FRAME_COUNT,
  CHAR_X,
  ANIM_FPS,
  SCALE,
  ATTACK_FRAME_COUNT,
  ATTACK_SCALE,
  ATTACK_OFFSET_X,
  ATTACK_OFFSET_Y,
  HIT_RANGE,
  ENEMY_HIT_FRAMES,
  ENEMY_HIT_FPS,
  ENEMY_HIT_SCALE_START,
  ENEMY_HIT_SCALE_END,
  ENEMY_HIT_ROTATION,
  HIT_EFFECT_DURATION,
  HIT_EFFECT_SCALE,
  MAX_HP,
  DAMAGE_SHAKE_DURATION,
  DAMAGE_SHAKE_INTENSITY,
  DAMAGE_RED_DURATION,
  ENEMY_FRAME_COUNT,
  ENEMY_SCALE,
  ENEMY_OFFSET_Y,
  ENEMY_ANIM_FPS,
  ENEMY_SPEED_MIN,
  ENEMY_SPEED_MAX,
  ENEMY_SPAWN_MIN,
  ENEMY_SPAWN_MAX,
  ENEMY_SPAWN_DECREASE,
  FRIEND_FRAME_COUNT,
  FRIEND_SCALE,
  FRIEND_OFFSET_Y,
  FRIEND_ANIM_FPS,
  FRIEND_START_TIME,
  FRIEND_CHANCE,
  FRIEND_OK_DURATION,
  FRIEND_OK_SCALE,
  FRIEND_OK_SCALE_START,
  FRIEND_OK_FRAMES,
  FRIEND_HIT_FRAMES,
  FRIEND_HIT_FPS,
  FRIEND_HIT_SCALE_START,
  FRIEND_HIT_SCALE_END,
  FRIEND_HIT_ROTATION,
  GAME_DURATION,
  TREE_SPEED,
  GROUND_Y,
  ATTACK_FPS,
  ENEMY_SPEED_INCREASE,
  CANVAS_WIDTH as W,
  CANVAS_HEIGHT as H,
  ASSET_BASE,
} from './constants';
import './Game05.css';

// ── 에셋 타입 ──
interface GameAssets {
  runFrames: HTMLImageElement[];
  attackFrames: HTMLImageElement[];
  enemyFrames: HTMLImageElement[];
  enemyHitImg: HTMLImageElement;
  hitEffectImg: HTMLImageElement;
  friendFrames: HTMLImageElement[];
  friendHitImg: HTMLImageElement;
  friendOkImg: HTMLImageElement;
  titleImg: HTMLImageElement;
  winImg: HTMLImageElement;
  defeatImg: HTMLImageElement;
  treesImg: HTMLImageElement;
  baseImg: HTMLImageElement;
  farImg: HTMLImageElement;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`[Game05] Failed to load: ${src}`));
    img.src = src;
  });
}

async function loadAllAssets(base: string): Promise<GameAssets> {
  const runFrames = await Promise.all(
    Array.from({ length: RUN_FRAME_COUNT }, (_, i) => loadImage(`${base}/asset/run/${i}.png`))
  );
  const attackFrames = await Promise.all(
    Array.from({ length: ATTACK_FRAME_COUNT }, (_, i) => loadImage(`${base}/asset/attack/${i}.png`))
  );
  const enemyFrames = await Promise.all(
    Array.from({ length: ENEMY_FRAME_COUNT }, (_, i) => loadImage(`${base}/asset/enermy/${i}.png`))
  );
  const friendFrames = await Promise.all(
    Array.from({ length: FRIEND_FRAME_COUNT }, (_, i) => loadImage(`${base}/asset/friend/${i}.png`))
  );

  const friendOkFilename = 'friend_ok.jpeg';
  const [
    enemyHitImg,
    hitEffectImg,
    friendHitImg,
    friendOkImg,
    titleImg,
    winImg,
    defeatImg,
    treesImg,
    baseImg,
    farImg,
  ] = await Promise.all([
    loadImage(`${base}/asset/enermy_hit/0.png`),
    loadImage(`${base}/asset/hit.png`),
    loadImage(`${base}/asset/friend_hit/0_out.png`),
    loadImage(`${base}/asset/friend_ok/${encodeURIComponent(friendOkFilename)}`),
    loadImage(`${base}/asset/title.jpeg`),
    loadImage(`${base}/asset/win.jpeg`),
    loadImage(`${base}/asset/defeat.jpeg`),
    loadImage(`${base}/bg_trees.png`),
    loadImage(`${base}/base.png`),
    loadImage(`${base}/far.jpeg`),
  ]);

  return {
    runFrames,
    attackFrames,
    enemyFrames,
    enemyHitImg,
    hitEffectImg,
    friendFrames,
    friendHitImg,
    friendOkImg,
    titleImg,
    winImg,
    defeatImg,
    treesImg,
    baseImg,
    farImg,
  };
}

// ── 게임 내부 상태 (ref로 보관, 매 프레임 갱신) ──
interface EnemyLike {
  x: number;
  speed: number;
  frame: number;
  animTimer: number;
  alive: boolean;
  isFriend: boolean;
}
interface FlyingEnemy {
  x: number;
  y: number;
  frame: number;
  timer: number;
  isFriend: boolean;
}
interface HitEffect {
  x: number;
  y: number;
  timer: number;
}
interface FriendOkEffect {
  x: number;
  y: number;
  timer: number;
}

interface GameState {
  gameState: 'title' | 'playing' | 'result';
  titleBlinkTimer: number;
  resultTimer: number;
  resultType: 'win' | 'defeat';
  lastTime: number;
  currentFrame: number;
  animTimer: number;
  scrollX: number;
  isAttacking: boolean;
  attackFrame: number;
  attackTimer: number;
  enemies: EnemyLike[];
  enemySpawnTimer: number;
  enemySpawnCount: number;
  flyingEnemies: FlyingEnemy[];
  hitEffects: HitEffect[];
  friendOkEffects: FriendOkEffect[];
  score: number;
  hp: number;
  damageShakeTimer: number;
  damageRedTimer: number;
  gameTime: number;
  remainingTime: number;
}

function createInitialState(): GameState {
  return {
    gameState: 'title',
    titleBlinkTimer: 0,
    resultTimer: 0,
    resultType: 'win',
    lastTime: 0,
    currentFrame: 0,
    animTimer: 0,
    scrollX: 0,
    isAttacking: false,
    attackFrame: 0,
    attackTimer: 0,
    enemies: [],
    enemySpawnTimer: 0,
    enemySpawnCount: 0,
    flyingEnemies: [],
    hitEffects: [],
    friendOkEffects: [],
    score: 0,
    hp: MAX_HP,
    damageShakeTimer: 0,
    damageRedTimer: 0,
    gameTime: 0,
    remainingTime: GAME_DURATION,
  };
}

function getSpawnInterval(s: GameState): number {
  return Math.max(
    ENEMY_SPAWN_MAX - s.enemySpawnCount * ENEMY_SPAWN_DECREASE,
    ENEMY_SPAWN_MIN
  );
}

function spawnEnemy(s: GameState): void {
  const speed = Math.min(
    ENEMY_SPEED_MIN + s.enemySpawnCount * ENEMY_SPEED_INCREASE,
    ENEMY_SPEED_MAX
  );
  const isFriend = s.gameTime >= FRIEND_START_TIME && Math.random() < FRIEND_CHANCE;
  s.enemies.push({
    x: W + 50,
    speed,
    frame: 0,
    animTimer: 0,
    alive: true,
    isFriend,
  });
  s.enemySpawnCount++;
}

const Game05: React.FC<Game05Props> = ({ onGameResult }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<GameAssets | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const resultReportedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gameStateUI, setGameStateUI] = useState<'title' | 'playing' | 'result'>('title');
  const [resultType, setResultType] = useState<'win' | 'defeat'>('win');
  const [finalScore, setFinalScore] = useState(0);

  // 에셋 로드
  useEffect(() => {
    loadAllAssets(ASSET_BASE)
      .then((assets) => {
        assetsRef.current = assets;
        setLoading(false);
        console.log('[Game05] Assets loaded');
      })
      .catch((err) => {
        console.error('[Game05] Asset load error:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.currentFrame = 0;
    s.animTimer = 0;
    s.scrollX = 0;
    s.isAttacking = false;
    s.attackFrame = 0;
    s.attackTimer = 0;
    s.enemies = [];
    s.enemySpawnTimer = 0;
    s.enemySpawnCount = 0;
    s.flyingEnemies = [];
    s.hitEffects = [];
    s.friendOkEffects = [];
    s.score = 0;
    s.hp = MAX_HP;
    s.damageShakeTimer = 0;
    s.damageRedTimer = 0;
    s.gameTime = 0;
    s.remainingTime = GAME_DURATION;
  }, []);

  const startAttack = useCallback(() => {
    const s = stateRef.current;
    const assets = assetsRef.current;
    if (!assets || s.isAttacking || s.gameState !== 'playing') return;

    s.isAttacking = true;
    s.attackFrame = 0;
    s.attackTimer = 0;

    for (const enemy of s.enemies) {
      if (!enemy.alive) continue;
      const eScale = enemy.isFriend ? FRIEND_SCALE : ENEMY_SCALE;
      const eFrameArr = enemy.isFriend ? assets.friendFrames : assets.enemyFrames;
      const eFCount = enemy.isFriend ? FRIEND_FRAME_COUNT : ENEMY_FRAME_COUNT;
      const eImg = eFrameArr[enemy.frame % eFCount];
      const eHalfW = eImg?.complete ? (eImg.naturalWidth * eScale) / 2 : 20;
      if (enemy.x - eHalfW < CHAR_X + HIT_RANGE && enemy.x > CHAR_X - 30) {
        enemy.alive = false;
        if (enemy.isFriend) {
          s.hp = Math.max(0, s.hp - 1);
          s.damageShakeTimer = DAMAGE_SHAKE_DURATION;
          s.damageRedTimer = DAMAGE_RED_DURATION;
          s.flyingEnemies.push({ x: enemy.x, y: GROUND_Y, frame: 0, timer: 0, isFriend: true });
        } else {
          s.score++;
          s.flyingEnemies.push({ x: enemy.x, y: GROUND_Y, frame: 0, timer: 0, isFriend: false });
          s.hitEffects.push({ x: enemy.x, y: GROUND_Y - 40, timer: HIT_EFFECT_DURATION });
        }
        break;
      }
    }
  }, []);

  const handleInput = useCallback(
    (e?: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
      e?.preventDefault();
      const s = stateRef.current;

      if (s.gameState === 'title') {
        resetGame();
        s.gameState = 'playing';
        setGameStateUI('playing');
      } else if (s.gameState === 'playing') {
        startAttack();
      } else if (s.gameState === 'result') {
        s.gameState = 'title';
        s.titleBlinkTimer = 0;
        setGameStateUI('title');
        resultReportedRef.current = false;
      }
    },
    [resetGame, startAttack]
  );

  // 게임 루프
  useEffect(() => {
    if (loading || loadError || !assetsRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const assets = assetsRef.current;
    const s = stateRef.current;

    const drawFarBackground = () => {
      if (!assets.farImg.complete) return;
      ctx.imageSmoothingEnabled = false;
      const farScale = H / assets.farImg.naturalHeight;
      const farW = assets.farImg.naturalWidth * farScale;
      const offset = -(s.scrollX * 0.05 % farW);
      for (let x = offset - farW; x < W + farW; x += farW) {
        ctx.drawImage(assets.farImg, x, 0, farW, H);
      }
    };

    const drawTreeLayer = () => {
      if (!assets.treesImg.complete) return;
      ctx.imageSmoothingEnabled = false;
      const treeScale = 0.2;
      const treeW = assets.treesImg.naturalWidth * treeScale;
      const treeH = assets.treesImg.naturalHeight * treeScale;
      const treeY = GROUND_Y - treeH + 5;
      const offset = -(s.scrollX % treeW);
      for (let x = offset - treeW; x < W + treeW; x += treeW) {
        ctx.drawImage(assets.treesImg, x, treeY, treeW, treeH);
      }
    };

    const drawGround = () => {
      if (!assets.baseImg.complete) return;
      ctx.imageSmoothingEnabled = false;
      const baseScale = H / assets.baseImg.naturalHeight;
      const baseW = assets.baseImg.naturalWidth * baseScale;
      const baseH = assets.baseImg.naturalHeight * baseScale;
      const baseY = H - baseH + 17;
      const offset = -(s.scrollX * 1.5 % baseW);
      for (let x = offset - baseW; x < W + baseW; x += baseW) {
        ctx.drawImage(assets.baseImg, x, baseY, baseW, baseH);
      }
    };

    const drawCharacter = () => {
      const img = s.isAttacking ? assets.attackFrames[s.attackFrame] : assets.runFrames[s.currentFrame];
      const scale = s.isAttacking ? ATTACK_SCALE : SCALE;
      const offsetX = s.isAttacking ? ATTACK_OFFSET_X : 0;
      const offsetY = s.isAttacking ? ATTACK_OFFSET_Y : 0;
      if (!img?.complete) return;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, CHAR_X - w / 2 + offsetX, GROUND_Y - h + offsetY, w, h);
    };

    const drawEnemies = () => {
      for (const enemy of s.enemies) {
        if (!enemy.alive) continue;
        const frameCount = enemy.isFriend ? FRIEND_FRAME_COUNT : ENEMY_FRAME_COUNT;
        const img = (enemy.isFriend ? assets.friendFrames : assets.enemyFrames)[enemy.frame % frameCount];
        const scale = enemy.isFriend ? FRIEND_SCALE : ENEMY_SCALE;
        const offsetY = enemy.isFriend ? FRIEND_OFFSET_Y : ENEMY_OFFSET_Y;
        if (!img?.complete) continue;
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, enemy.x - w / 2, GROUND_Y - h + offsetY, w, h);
      }
    };

    const drawFlyingEnemies = () => {
      for (const fe of s.flyingEnemies) {
        const hitImg = fe.isFriend ? assets.friendHitImg : assets.enemyHitImg;
        const maxFrames = fe.isFriend ? FRIEND_HIT_FRAMES : ENEMY_HIT_FRAMES;
        const scaleStart = fe.isFriend ? FRIEND_HIT_SCALE_START : ENEMY_HIT_SCALE_START;
        const scaleEnd = fe.isFriend ? FRIEND_HIT_SCALE_END : ENEMY_HIT_SCALE_END;
        const rot = fe.isFriend ? FRIEND_HIT_ROTATION : ENEMY_HIT_ROTATION;
        if (!hitImg.complete) continue;
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
    };

    const drawHitEffects = () => {
      if (!assets.hitEffectImg.complete) return;
      for (const he of s.hitEffects) {
        const w = assets.hitEffectImg.naturalWidth * HIT_EFFECT_SCALE;
        const h = assets.hitEffectImg.naturalHeight * HIT_EFFECT_SCALE;
        const alpha = he.timer / HIT_EFFECT_DURATION;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets.hitEffectImg, he.x - w / 2, he.y - h / 2, w, h);
        ctx.restore();
      }
    };

    const drawFriendOkEffects = () => {
      if (!assets.friendOkImg.complete) return;
      for (const fo of s.friendOkEffects) {
        const progress = 1 - fo.timer / FRIEND_OK_DURATION;
        const step = Math.min(Math.floor(progress * FRIEND_OK_FRAMES), FRIEND_OK_FRAMES - 1);
        const t = (step + 1) / FRIEND_OK_FRAMES;
        const scale = FRIEND_OK_SCALE_START + (FRIEND_OK_SCALE - FRIEND_OK_SCALE_START) * t;
        const w = assets.friendOkImg.naturalWidth * scale;
        const h = assets.friendOkImg.naturalHeight * scale;
        const alpha = (fo.timer / FRIEND_OK_DURATION) * 0.6;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets.friendOkImg, fo.x - w / 2, fo.y - h / 2, w, h);
        ctx.restore();
      }
    };

    const drawScore = () => {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('SCORE: ' + s.score, W - 10, 20);
    };

    const drawHP = () => {
      // TIME(W/2)과 SCORE(W-10) 사이에 HP 바 중앙 배치 (로고와 겹치지 않도록)
      const barW = 20, barH = 14, gap = 4, startY = 8;
      const hpBarTotalWidth = MAX_HP * barW + (MAX_HP - 1) * gap;
      const startX = Math.round((W / 2 + (W - 10)) / 2 - hpBarTotalWidth / 2);
      for (let i = 0; i < MAX_HP; i++) {
        const x = startX + i * (barW + gap);
        if (i < s.hp) {
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
    };

    const drawTimer = () => {
      const sec = Math.max(0, Math.ceil(s.remainingTime));
      ctx.fillStyle = sec <= 5 ? '#ff3333' : '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TIME: ' + sec, W / 2, 20);
    };

    const drawTitle = (dt: number) => {
      if (!assets.titleImg.complete) return;
      ctx.drawImage(assets.titleImg, 0, 0, W, H);
      s.titleBlinkTimer += dt;
      if (Math.floor(s.titleBlinkTimer * 2.5) % 2 === 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText('PRESS START', W / 2, H - 25);
        ctx.shadowBlur = 0;
      }
    };

    const drawResult = (dt: number) => {
      const img = s.resultType === 'win' ? assets.winImg : assets.defeatImg;
      if (!img.complete) return;
      ctx.drawImage(img, 0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText('SCORE: ' + s.score, W / 2, H - 40);
      s.titleBlinkTimer += dt;
      if (Math.floor(s.titleBlinkTimer * 2.5) % 2 === 0) {
        ctx.fillText('PRESS ANY KEY', W / 2, H - 18);
      }
      ctx.shadowBlur = 0;
    };

    const drawDamageOverlay = () => {
      if (s.damageRedTimer <= 0) return;
      const alpha = (s.damageRedTimer / DAMAGE_RED_DURATION) * 0.4;
      ctx.save();
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };

    let rafId = 0;
    const gameLoop = (timestamp: number) => {
      let dt = (timestamp - s.lastTime) / 1000;
      s.lastTime = timestamp;
      if (dt > 0.1) dt = 0.016;

      ctx.clearRect(0, 0, W, H);

      if (s.gameState === 'title') {
        drawTitle(dt);
        rafId = requestAnimationFrame(gameLoop);
        return;
      }

      if (s.gameState === 'result') {
        s.resultTimer += dt;
        drawResult(dt);
        if (s.resultTimer >= 10) {
          s.gameState = 'title';
          s.resultTimer = 0;
          s.titleBlinkTimer = 0;
          setGameStateUI('title');
          resultReportedRef.current = false;
        }
        rafId = requestAnimationFrame(gameLoop);
        return;
      }

      // playing
      s.scrollX += TREE_SPEED * dt;

      if (s.isAttacking) {
        s.attackTimer += dt;
        if (s.attackTimer >= 1 / ATTACK_FPS) {
          s.attackTimer -= 1 / ATTACK_FPS;
          s.attackFrame++;
          if (s.attackFrame >= ATTACK_FRAME_COUNT) {
            s.isAttacking = false;
            s.attackFrame = 0;
          }
        }
      } else {
        s.animTimer += dt;
        if (s.animTimer >= 1 / ANIM_FPS) {
          s.animTimer -= 1 / ANIM_FPS;
          s.currentFrame = (s.currentFrame + 1) % RUN_FRAME_COUNT;
        }
      }

      s.enemySpawnTimer -= dt;
      if (s.enemySpawnTimer <= 0) {
        spawnEnemy(s);
        s.enemySpawnTimer = getSpawnInterval(s);
      }

      s.gameTime += dt;
      s.remainingTime -= dt;

      if (s.hp <= 0) {
        s.resultType = 'defeat';
        s.resultTimer = 0;
        s.titleBlinkTimer = 0;
        s.gameState = 'result';
        setGameStateUI('result');
        setResultType('defeat');
        setFinalScore(s.score);
        if (!resultReportedRef.current && onGameResult) {
          resultReportedRef.current = true;
          onGameResult('LOSE');
        }
        rafId = requestAnimationFrame(gameLoop);
        return;
      }
      if (s.remainingTime <= 0) {
        s.resultType = 'win';
        s.resultTimer = 0;
        s.titleBlinkTimer = 0;
        s.gameState = 'result';
        setGameStateUI('result');
        setResultType('win');
        setFinalScore(s.score);
        if (!resultReportedRef.current && onGameResult) {
          resultReportedRef.current = true;
          onGameResult('WIN');
        }
        rafId = requestAnimationFrame(gameLoop);
        return;
      }

      for (const enemy of s.enemies) {
        if (!enemy.alive) continue;
        enemy.x -= enemy.speed * dt;
        const animFps = enemy.isFriend ? FRIEND_ANIM_FPS : ENEMY_ANIM_FPS;
        const frameCount = enemy.isFriend ? FRIEND_FRAME_COUNT : ENEMY_FRAME_COUNT;
        enemy.animTimer += dt;
        if (enemy.animTimer >= 1 / animFps) {
          enemy.animTimer -= 1 / animFps;
          enemy.frame = (enemy.frame + 1) % frameCount;
        }
        if (enemy.x <= CHAR_X) {
          enemy.alive = false;
          if (enemy.isFriend) {
            s.hp = Math.min(MAX_HP, s.hp + 1);
            s.friendOkEffects.push({ x: CHAR_X, y: GROUND_Y - 50, timer: FRIEND_OK_DURATION });
          } else {
            s.hp = Math.max(0, s.hp - 1);
            s.damageShakeTimer = DAMAGE_SHAKE_DURATION;
            s.damageRedTimer = DAMAGE_RED_DURATION;
          }
        }
      }
      s.enemies = s.enemies.filter((e) => e.alive);

      for (const fe of s.flyingEnemies) {
        fe.timer += dt;
        const fps = fe.isFriend ? FRIEND_HIT_FPS : ENEMY_HIT_FPS;
        if (fe.timer >= 1 / fps) {
          fe.timer -= 1 / fps;
          fe.frame++;
        }
      }
      s.flyingEnemies = s.flyingEnemies.filter((fe) => {
        const maxFrames = fe.isFriend ? FRIEND_HIT_FRAMES : ENEMY_HIT_FRAMES;
        return fe.frame < maxFrames;
      });

      for (const he of s.hitEffects) he.timer -= dt;
      s.hitEffects = s.hitEffects.filter((he) => he.timer > 0);
      for (const fo of s.friendOkEffects) fo.timer -= dt;
      s.friendOkEffects = s.friendOkEffects.filter((fo) => fo.timer > 0);

      if (s.damageShakeTimer > 0) s.damageShakeTimer -= dt;
      if (s.damageRedTimer > 0) s.damageRedTimer -= dt;

      ctx.save();
      if (s.damageShakeTimer > 0) {
        ctx.translate(
          (Math.random() - 0.5) * 2 * DAMAGE_SHAKE_INTENSITY,
          (Math.random() - 0.5) * 2 * DAMAGE_SHAKE_INTENSITY
        );
      }
      drawFarBackground();
      drawTreeLayer();
      drawGround();
      drawEnemies();
      drawFlyingEnemies();
      drawHitEffects();
      drawFriendOkEffects();
      drawCharacter();
      ctx.restore();
      drawDamageOverlay();
      drawHP();
      drawTimer();
      drawScore();

      rafId = requestAnimationFrame(gameLoop);
    };

    // 루프 시작 (에셋 로드 후 state가 title이므로 drawTitle부터)
    rafId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(rafId);
  }, [loading, loadError, onGameResult]);

  // 키보드
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handleInput(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInput]);

  if (loadError) {
    return (
      <div className="game05-container text-white flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-400 font-bold">[Game05] 에셋 로드 실패</p>
        <p className="text-sm text-gray-400">{loadError}</p>
        <p className="text-xs text-gray-500">
          public/game05/ 아래에 asset/, bg_trees.png, base.png, far.jpeg 를 넣어주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="game05-container relative w-full h-full bg-black select-none">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold z-10">
          Loading...
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="game05-canvas"
        width={W}
        height={H}
        style={{ visibility: loading ? 'hidden' : 'visible' }}
      />
      <div
        className="game05-touch-area"
        style={{ visibility: loading ? 'hidden' : 'visible' }}
        onClick={handleInput}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleInput(e);
        }}
        role="button"
        tabIndex={0}
        aria-label="게임 입력"
      />
    </div>
  );
};

export default Game05;
