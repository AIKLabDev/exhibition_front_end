/**
 * Game05: 플래포머 (Platformer) - 새 버전
 * 캔버스 640x180 픽셀 아트 러닝/공격 게임.
 * 에셋: public/game05/asset/ 아래에 배치.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Game05Props } from './Game05.types';
import {
  CHAR_X,
  ANIM_FPS,
  SCALE,
  ATTACK_SCALE,
  ATTACK_OFFSET_X,
  ATTACK_OFFSET_Y,
  HIT_RANGE,
  ATTACK_FPS,
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
  HERO_HIT_DURATION,
  HERO_HIT_SCALE,
  ENEMY_SCALE,
  ENEMY_OFFSET_Y,
  ENEMY_ANIM_FPS,
  ENEMY_SPEED_MIN,
  ENEMY_SPEED_MAX,
  ENEMY_SPAWN_MIN,
  ENEMY_SPAWN_MAX,
  ENEMY_SPAWN_DECREASE,
  ENEMY_SPEED_INCREASE,
  FRIEND_SCALE,
  FRIEND_OFFSET_Y,
  FRIEND_ANIM_FPS,
  FRIEND_START_TIME,
  FRIEND_CHANCE,
  FRIEND_OK_DURATION,
  FRIEND_OK_SCALE,
  HEART_SCALE_START,
  HEART_SCALE_END,
  FRIEND_HIT_FRAMES,
  FRIEND_HIT_FPS,
  FRIEND_HIT_SCALE_START,
  FRIEND_HIT_SCALE_END,
  FRIEND_HIT_ROTATION,
  GAME_DURATION,
  TREE_SPEED,
  GROUND_Y,
  GROUND_LAYER_SPEED,
  GROUND_LAYER_OFFSET_Y,
  GROUND_LAYER_SCALE,
  VICTORY_CHAR_SPEED,
  DEFEAT_DURATION,
  DEFEAT_SLOW_MOTION,
  CANVAS_WIDTH as W,
  CANVAS_HEIGHT as H,
  ASSET_BASE,
} from './constants';
import './Game05.css';

// ── 사운드 타입 ──
interface GameSounds {
  titleBgm: HTMLAudioElement;
  stageBgm: HTMLAudioElement;
  attackSfx: HTMLAudioElement;
  attackVoice: HTMLAudioElement;
  resultWinBgm: HTMLAudioElement;
  resultDefeatBgm: HTMLAudioElement;
  heroHitSfx: HTMLAudioElement;
  friendHitSfx: HTMLAudioElement;
  defeat_cut_scene: HTMLAudioElement;
  runSfx: HTMLAudioElement;
  win_cut_scene: HTMLAudioElement;
  energySfx: HTMLAudioElement;
  hitSfxPool: HTMLAudioElement[];
}

function createAudio(src: string, options?: { loop?: boolean; volume?: number }): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'auto';
  if (options?.loop) audio.loop = true;
  if (options?.volume !== undefined) audio.volume = options.volume;
  audio.load();
  return audio;
}

function initSounds(base: string): GameSounds {
  const hitSfxPool: HTMLAudioElement[] = [];
  for (let i = 0; i < 5; i++) {
    const hitSfx = createAudio(`${base}/asset/sound/hit1.wav`, { volume: 0.7 });
    hitSfxPool.push(hitSfx);
  }
  return {
    titleBgm: createAudio(`${base}/asset/sound/bgm_title.m4a`, { loop: true, volume: 0.5 }),
    stageBgm: createAudio(`${base}/asset/sound/bgm_stage.m4a`, { loop: true, volume: 0.6 }),
    resultWinBgm: createAudio(`${base}/asset/sound/bgm_result_win.m4a`, { volume: 0.7 }),
    resultDefeatBgm: createAudio(`${base}/asset/sound/bgm_result_defeat.m4a`, { volume: 0.7 }),
    defeat_cut_scene: createAudio(`${base}/asset/sound/cut_scene_defeat_die.m4a`, { volume: 0.7 }),
    win_cut_scene: createAudio(`${base}/asset/sound/cut_scene_win.m4a`, { volume: 0.5 }),

    attackSfx: createAudio(`${base}/asset/sound/attack.m4a`, { volume: 0.6 }),
    attackVoice: createAudio(`${base}/asset/sound/attack_1.m4a`, { volume: 0.5 }),
    heroHitSfx: createAudio(`${base}/asset/sound/hero_hit.m4a`, { volume: 0.7 }),
    friendHitSfx: createAudio(`${base}/asset/sound/friend_hit.m4a`, { volume: 0.7 }),
    runSfx: createAudio(`${base}/asset/sound/run.m4a`, { loop: true, volume: 0.3 }),
    energySfx: createAudio(`${base}/asset/sound/energy.m4a`, { volume: 0.7 }),
    hitSfxPool,
  };
}

function playSfx(audio: HTMLAudioElement, playbackRate = 1.0): void {
  audio.currentTime = 0;
  audio.playbackRate = playbackRate;
  audio.play().catch(() => { });
}

function stopAudio(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
}

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
  heartImg: HTMLImageElement;
  heroHitImg: HTMLImageElement;
  titleImg: HTMLImageElement;
  winImg: HTMLImageElement;
  defeatImg: HTMLImageElement;
  treesImg: HTMLImageElement;
  baseImg: HTMLImageElement;
  farImg: HTMLImageElement;
  groundImg: HTMLImageElement;
}

function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[Game05] Failed to load: ${src}`);
      resolve(img);
    };
    img.src = src;
  });
}

async function loadFramesFromFolder(folder: string, maxProbe = 100): Promise<HTMLImageElement[]> {
  const probes: Promise<{ idx: number; img: HTMLImageElement } | null>[] = [];
  for (let i = 0; i < maxProbe; i++) {
    probes.push(
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ idx: i, img });
        img.onerror = () => resolve(null);
        img.src = `${folder}/${i}.png`;
      })
    );
  }
  const results = await Promise.all(probes);
  const frames = results
    .filter((r): r is { idx: number; img: HTMLImageElement } => r !== null)
    .sort((a, b) => a.idx - b.idx)
    .map((r) => r.img);
  console.log(`[Game05] ${folder}: ${frames.length} frames loaded`);
  return frames;
}

async function loadAllAssets(base: string): Promise<GameAssets> {
  const [runFrames, attackFrames, enemyFrames, friendFrames] = await Promise.all([
    loadFramesFromFolder(`${base}/asset/run`),
    loadFramesFromFolder(`${base}/asset/attack`),
    loadFramesFromFolder(`${base}/asset/enermy`),
    loadFramesFromFolder(`${base}/asset/friend`),
  ]);

  const [
    enemyHitImg,
    hitEffectImg,
    friendHitImg,
    friendOkImg,
    heartImg,
    heroHitImg,
    titleImg,
    winImg,
    defeatImg,
    treesImg,
    baseImg,
    farImg,
    groundImg,
  ] = await Promise.all([
    loadImageAsync(`${base}/asset/enermy_hit/0.png`),
    loadImageAsync(`${base}/asset/hit.png`),
    loadImageAsync(`${base}/asset/friend_hit/0.png`),
    loadImageAsync(`${base}/asset/friend_ok/0.png`),
    loadImageAsync(`${base}/asset/friend_ok/heart.png`),
    loadImageAsync(`${base}/asset/hero_hit/0.png`),
    loadImageAsync(`${base}/asset/title.jpeg`),
    loadImageAsync(`${base}/asset/win.jpeg`),
    loadImageAsync(`${base}/asset/defeat.jpeg`),
    loadImageAsync(`${base}/asset/background/bg_trees.png`),
    loadImageAsync(`${base}/asset/background/base.png`),
    loadImageAsync(`${base}/asset/background/far.jpeg`),
    loadImageAsync(`${base}/asset/background/ground.png`),
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
    heartImg,
    heroHitImg,
    titleImg,
    winImg,
    defeatImg,
    treesImg,
    baseImg,
    farImg,
    groundImg,
  };
}

// ── 게임 내부 상태 ──
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

type GameStateType = 'title' | 'playing' | 'victory' | 'defeat' | 'result';

interface GameState {
  gameState: GameStateType;
  titleBlinkTimer: number;
  resultTimer: number;
  resultType: 'win' | 'defeat';
  lastTime: number;
  currentFrame: number;
  animTimer: number;
  scrollX: number;
  charX: number;
  isAttacking: boolean;
  attackFrame: number;
  attackTimer: number;
  attackHitProcessed: boolean;
  enemies: EnemyLike[];
  enemySpawnTimer: number;
  enemySpawnCount: number;
  flyingEnemies: FlyingEnemy[];
  hitEffects: HitEffect[];
  friendOkTimer: number;
  score: number;
  hp: number;
  damageShakeTimer: number;
  damageRedTimer: number;
  heroHitTimer: number;
  gameTime: number;
  remainingTime: number;
  defeatTimer: number;
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
    charX: CHAR_X,
    isAttacking: false,
    attackFrame: 0,
    attackTimer: 0,
    attackHitProcessed: false,
    enemies: [],
    enemySpawnTimer: 0,
    enemySpawnCount: 0,
    flyingEnemies: [],
    hitEffects: [],
    friendOkTimer: 0,
    score: 0,
    hp: MAX_HP,
    damageShakeTimer: 0,
    damageRedTimer: 0,
    heroHitTimer: 0,
    gameTime: 0,
    remainingTime: GAME_DURATION,
    defeatTimer: 0,
  };
}

function getSpawnInterval(s: GameState): number {
  return Math.max(ENEMY_SPAWN_MAX - s.enemySpawnCount * ENEMY_SPAWN_DECREASE, ENEMY_SPAWN_MIN);
}

function spawnEnemy(s: GameState): void {
  const speed = Math.min(ENEMY_SPEED_MIN + s.enemySpawnCount * ENEMY_SPEED_INCREASE, ENEMY_SPEED_MAX);
  const isFriend = s.gameTime >= FRIEND_START_TIME && Math.random() < FRIEND_CHANCE;
  s.enemies.push({ x: W + 50, speed, frame: 0, animTimer: 0, alive: true, isFriend });
  s.enemySpawnCount++;
}

const Game05: React.FC<Game05Props> = ({ onGameResult }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<GameAssets | null>(null);
  const soundsRef = useRef<GameSounds | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const resultReportedRef = useRef(false);
  const hitSfxIndexRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gameStateUI, setGameStateUI] = useState<GameStateType>('title');

  // 에셋 및 사운드 로드
  useEffect(() => {
    soundsRef.current = initSounds(ASSET_BASE);
    loadAllAssets(ASSET_BASE)
      .then((assets) => {
        assetsRef.current = assets;
        setLoading(false);
        console.log('[Game05] Assets loaded');
        // 타이틀 BGM 시작
        soundsRef.current?.titleBgm.play().catch(() => { });
      })
      .catch((err) => {
        console.error('[Game05] Asset load error:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    // 컴포넌트 언마운트 시 모든 사운드 정지
    return () => {
      const sounds = soundsRef.current;
      if (sounds) {
        stopAudio(sounds.titleBgm);
        stopAudio(sounds.stageBgm);
        stopAudio(sounds.runSfx);
        stopAudio(sounds.win_cut_scene);
      }
    };
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.currentFrame = 0;
    s.animTimer = 0;
    s.scrollX = 0;
    s.charX = CHAR_X;
    s.isAttacking = false;
    s.attackFrame = 0;
    s.attackTimer = 0;
    s.attackHitProcessed = false;
    s.enemies = [];
    s.enemySpawnTimer = 0;
    s.enemySpawnCount = 0;
    s.flyingEnemies = [];
    s.hitEffects = [];
    s.friendOkTimer = 0;
    s.score = 0;
    s.hp = MAX_HP;
    s.damageShakeTimer = 0;
    s.damageRedTimer = 0;
    s.heroHitTimer = 0;
    s.gameTime = 0;
    s.remainingTime = GAME_DURATION;
    s.defeatTimer = 0;
  }, []);

  const checkAttackHit = useCallback((s: GameState, assets: GameAssets) => {
    if (s.attackHitProcessed) return;
    const sounds = soundsRef.current;
    for (const enemy of s.enemies) {
      if (!enemy.alive || enemy.x <= s.charX) continue;
      const eScale = enemy.isFriend ? FRIEND_SCALE : ENEMY_SCALE;
      const eFrameArr = enemy.isFriend ? assets.friendFrames : assets.enemyFrames;
      const eImg = eFrameArr[enemy.frame % eFrameArr.length];
      const eHalfW = eImg?.naturalWidth ? (eImg.naturalWidth * eScale) / 2 : 20;
      if (enemy.x - eHalfW < s.charX + HIT_RANGE && enemy.x > s.charX - 80) {
        enemy.alive = false;
        s.attackHitProcessed = true;
        if (enemy.isFriend) {
          // 친구 타격: 데미지 + 사운드
          s.hp = Math.max(0, s.hp - 1);
          s.damageShakeTimer = DAMAGE_SHAKE_DURATION;
          s.damageRedTimer = DAMAGE_RED_DURATION;
          s.heroHitTimer = HERO_HIT_DURATION;
          s.flyingEnemies.push({ x: enemy.x, y: GROUND_Y, frame: 0, timer: 0, isFriend: true });
          if (sounds) {
            playSfx(sounds.friendHitSfx);
            playSfx(sounds.heroHitSfx);
          }
        } else {
          // 적 타격: 점수 + 사운드
          s.score++;
          s.flyingEnemies.push({ x: enemy.x, y: GROUND_Y, frame: 0, timer: 0, isFriend: false });
          s.hitEffects.push({ x: enemy.x, y: GROUND_Y - 40, timer: HIT_EFFECT_DURATION });
          if (sounds) {
            const hitSfx = sounds.hitSfxPool[hitSfxIndexRef.current % sounds.hitSfxPool.length];
            playSfx(hitSfx);
            hitSfxIndexRef.current++;
          }
        }
        break;
      }
    }
  }, []);

  const startAttack = useCallback(() => {
    const s = stateRef.current;
    const assets = assetsRef.current;
    const sounds = soundsRef.current;
    if (!assets || s.gameState === 'victory') return;
    s.isAttacking = true;
    s.attackFrame = 0;
    s.attackTimer = 0;
    s.attackHitProcessed = false;
    // 공격 사운드
    if (sounds) {
      playSfx(sounds.attackSfx);
      playSfx(sounds.attackVoice);
    }
    checkAttackHit(s, assets);
  }, [checkAttackHit]);

  const handleInput = useCallback(
    (e?: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
      e?.preventDefault();
      const s = stateRef.current;
      const sounds = soundsRef.current;
      if (s.gameState === 'title') {
        resetGame();
        s.gameState = 'playing';
        setGameStateUI('playing');
        // 게임 시작: titleBgm 정지, stageBgm + runSfx 시작
        if (sounds) {
          stopAudio(sounds.titleBgm);
          sounds.stageBgm.play().catch(() => { });
          sounds.runSfx.play().catch(() => { });
        }
      } else if (s.gameState === 'playing') {
        startAttack();
      }
    },
    [resetGame, startAttack]
  );

  const handleRestart = useCallback(() => {
    const s = stateRef.current;
    const sounds = soundsRef.current;
    s.gameState = 'title';
    s.resultTimer = 0;
    s.titleBlinkTimer = 0;
    setGameStateUI('title');
    resultReportedRef.current = false;
    // 타이틀 복귀: 모든 BGM 정지, titleBgm 시작
    if (sounds) {
      stopAudio(sounds.stageBgm);
      stopAudio(sounds.runSfx);
      stopAudio(sounds.win_cut_scene);
      sounds.titleBgm.play().catch(() => { });
    }
  }, []);

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
      if (!assets.farImg.naturalWidth) return;
      ctx.imageSmoothingEnabled = false;
      const farScale = H / assets.farImg.naturalHeight;
      const farW = assets.farImg.naturalWidth * farScale;
      const offset = -(s.scrollX * 0.05) % farW;
      for (let x = offset - farW; x < W + farW; x += farW) {
        ctx.drawImage(assets.farImg, x, 0, farW, H);
      }
    };

    const drawTreeLayer = () => {
      if (!assets.treesImg.naturalWidth) return;
      ctx.imageSmoothingEnabled = false;
      const treeScale = 0.3;
      const treeW = assets.treesImg.naturalWidth * treeScale;
      const treeH = assets.treesImg.naturalHeight * treeScale;
      const treeY = GROUND_Y - treeH - 5;
      const offset = -(s.scrollX % treeW);
      for (let x = offset - treeW; x < W + treeW; x += treeW) {
        ctx.drawImage(assets.treesImg, x, treeY, treeW, treeH);
      }
    };

    const drawGround = () => {
      if (!assets.baseImg.naturalWidth) return;
      ctx.imageSmoothingEnabled = false;
      const baseScale = H / assets.baseImg.naturalHeight;
      const baseW = assets.baseImg.naturalWidth * baseScale;
      const baseH = assets.baseImg.naturalHeight * baseScale;
      const baseY = H - baseH - 10;
      const offset = -((s.scrollX * 1.5) % baseW);
      for (let x = offset - baseW; x < W + baseW; x += baseW) {
        ctx.drawImage(assets.baseImg, x, baseY, baseW, baseH);
      }
    };

    const drawGroundLayer = () => {
      if (!assets.groundImg?.naturalWidth) return;
      ctx.imageSmoothingEnabled = false;
      const gScale = GROUND_LAYER_SCALE;
      const gW = assets.groundImg.naturalWidth * gScale;
      const gH = assets.groundImg.naturalHeight * gScale;
      const gY = H - gH + GROUND_LAYER_OFFSET_Y;
      const offset = -((s.scrollX * (GROUND_LAYER_SPEED / TREE_SPEED)) % gW);
      for (let x = offset - gW; x < W + gW; x += gW) {
        ctx.drawImage(assets.groundImg, x, gY, gW, gH);
      }
    };

    const drawCharacter = () => {
      if (s.friendOkTimer > 0) return;
      let img: HTMLImageElement | undefined;
      let scale: number;
      let offsetX = 0;
      let offsetY = 0;
      if (s.heroHitTimer > 0 && assets.heroHitImg?.naturalWidth) {
        img = assets.heroHitImg;
        scale = HERO_HIT_SCALE;
      } else if (s.isAttacking && s.gameState !== 'victory') {
        img = assets.attackFrames[s.attackFrame % assets.attackFrames.length];
        scale = ATTACK_SCALE;
        offsetX = ATTACK_OFFSET_X;
        offsetY = ATTACK_OFFSET_Y;
      } else {
        img = assets.runFrames[s.currentFrame % assets.runFrames.length];
        scale = SCALE;
        offsetY = 10;
      }
      if (!img?.naturalWidth) return;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.imageSmoothingEnabled = false;
      if (s.heroHitTimer > 0) {
        const blinkRate = s.gameState === 'defeat' ? 20 : 15;
        if (Math.floor(s.heroHitTimer * blinkRate) % 2 === 0) ctx.globalAlpha = 0.5;
      }
      ctx.drawImage(img, s.charX - w / 2 + offsetX, GROUND_Y - h + offsetY, w, h);
      ctx.globalAlpha = 1.0;
    };

    const drawEnemies = () => {
      for (const enemy of s.enemies) {
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
    };

    const drawFlyingEnemies = () => {
      for (const fe of s.flyingEnemies) {
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
    };

    const drawHitEffects = () => {
      if (!assets.hitEffectImg?.naturalWidth) return;
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

    const drawFriendOkEffect = () => {
      if (s.friendOkTimer <= 0) return;
      const progress = 1 - s.friendOkTimer / FRIEND_OK_DURATION;
      if (assets.friendOkImg?.naturalWidth) {
        const okW = assets.friendOkImg.naturalWidth * FRIEND_OK_SCALE;
        const okH = assets.friendOkImg.naturalHeight * FRIEND_OK_SCALE;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets.friendOkImg, s.charX - okW / 2, GROUND_Y - okH + 10, okW, okH);
      }
      if (assets.heartImg?.naturalWidth) {
        const heartScale = HEART_SCALE_START + (HEART_SCALE_END - HEART_SCALE_START) * progress;
        const hW = assets.heartImg.naturalWidth * heartScale;
        const hH = assets.heartImg.naturalHeight * heartScale;
        const hX = s.charX - hW / 2;
        const hY = GROUND_Y - 100 - hH / 2 - progress * 15;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets.heartImg, hX, hY, hW, hH);
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
      if (!assets.titleImg?.naturalWidth) return;
      ctx.imageSmoothingEnabled = true;
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

    const drawVictory = () => {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText('STAGE CLEAR', W / 2, 50);
      ctx.shadowBlur = 0;
    };

    const drawDefeat = () => {
      const blinkRate = 10;
      const blinkAlpha = Math.floor(s.defeatTimer * blinkRate) % 2 === 0 ? 0.6 : 0.3;
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
    };

    const drawResult = () => {
      const img = s.resultType === 'win' ? assets.winImg : assets.defeatImg;
      if (!img?.naturalWidth) return;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText('SCORE: ' + s.score, W / 2, H - 40);
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

      // ═══ TITLE ═══
      if (s.gameState === 'title') {
        drawTitle(dt);
        rafId = requestAnimationFrame(gameLoop);
        return;
      }

      // ═══ RESULT ═══
      if (s.gameState === 'result') {
        drawResult();
        rafId = requestAnimationFrame(gameLoop);
        return;
      }

      // ═══ VICTORY ═══
      if (s.gameState === 'victory') {
        s.animTimer += dt;
        if (s.animTimer >= 1 / ANIM_FPS) {
          s.animTimer -= 1 / ANIM_FPS;
          s.currentFrame = (s.currentFrame + 1) % assets.runFrames.length;
        }
        s.charX += VICTORY_CHAR_SPEED * dt;
        if (s.charX >= W + 100) {
          s.resultType = 'win';
          s.resultTimer = 0;
          s.titleBlinkTimer = 0;
          s.gameState = 'result';
          setGameStateUI('result');
          if (!resultReportedRef.current && onGameResult) {
            resultReportedRef.current = true;
            onGameResult('WIN');
          }
        }
        drawFarBackground();
        drawTreeLayer();
        drawGround();
        drawCharacter();
        drawGroundLayer();
        drawVictory();
        drawHP();
        drawScore();
        rafId = requestAnimationFrame(gameLoop);
        return;
      }

      // ═══ DEFEAT ═══
      if (s.gameState === 'defeat') {
        const slowDt = dt * DEFEAT_SLOW_MOTION;
        s.defeatTimer += dt;
        s.scrollX += TREE_SPEED * slowDt;
        s.animTimer += slowDt;
        if (s.animTimer >= 1 / ANIM_FPS) {
          s.animTimer -= 1 / ANIM_FPS;
          s.currentFrame = (s.currentFrame + 1) % assets.runFrames.length;
        }
        if (s.heroHitTimer > 0) s.heroHitTimer -= dt;
        for (const enemy of s.enemies) {
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
        for (const fe of s.flyingEnemies) {
          const fps = fe.isFriend ? FRIEND_HIT_FPS : ENEMY_HIT_FPS;
          fe.timer += slowDt;
          if (fe.timer >= 1 / fps) {
            fe.timer -= 1 / fps;
            fe.frame++;
          }
        }
        s.flyingEnemies = s.flyingEnemies.filter((fe) => {
          const maxFrames = fe.isFriend ? FRIEND_HIT_FRAMES : ENEMY_HIT_FRAMES;
          return fe.frame < maxFrames;
        });
        for (const he of s.hitEffects) he.timer -= slowDt;
        s.hitEffects = s.hitEffects.filter((he) => he.timer > 0);
        if (s.friendOkTimer > 0) s.friendOkTimer -= slowDt;
        if (s.defeatTimer >= DEFEAT_DURATION) {
          s.resultType = 'defeat';
          s.resultTimer = 0;
          s.titleBlinkTimer = 0;
          s.gameState = 'result';
          setGameStateUI('result');
          if (!resultReportedRef.current && onGameResult) {
            resultReportedRef.current = true;
            onGameResult('LOSE');
          }
        }
        drawFarBackground();
        drawTreeLayer();
        drawGround();
        drawEnemies();
        drawFlyingEnemies();
        drawHitEffects();
        drawCharacter();
        drawFriendOkEffect();
        drawGroundLayer();
        drawDefeat();
        drawHP();
        drawScore();
        rafId = requestAnimationFrame(gameLoop);
        return;
      }

      // ═══ PLAYING ═══
      s.scrollX += TREE_SPEED * dt;
      if (s.isAttacking) {
        s.attackTimer += dt;
        if (s.attackTimer >= 1 / ATTACK_FPS) {
          s.attackTimer -= 1 / ATTACK_FPS;
          s.attackFrame++;
          checkAttackHit(s, assets);
          if (s.attackFrame >= assets.attackFrames.length) {
            s.isAttacking = false;
            s.attackFrame = 0;
            s.attackHitProcessed = false;
          }
        }
      } else {
        s.animTimer += dt;
        if (s.animTimer >= 1 / ANIM_FPS) {
          s.animTimer -= 1 / ANIM_FPS;
          s.currentFrame = (s.currentFrame + 1) % assets.runFrames.length;
        }
      }
      s.enemySpawnTimer -= dt;
      if (s.enemySpawnTimer <= 0) {
        spawnEnemy(s);
        s.enemySpawnTimer = getSpawnInterval(s);
      }
      s.gameTime += dt;
      s.remainingTime -= dt;

      // 승패 판정
      const sounds = soundsRef.current;
      if (s.hp <= 0) {
        s.defeatTimer = 0;
        s.heroHitTimer = DEFEAT_DURATION;
        s.gameState = 'defeat';
        setGameStateUI('defeat');
        // 패배 사운드: stageBgm/runSfx 정지, defeat_cut_scene + resultDefeatBgm
        if (sounds) {
          stopAudio(sounds.stageBgm);
          stopAudio(sounds.runSfx);
          playSfx(sounds.defeat_cut_scene);
          playSfx(sounds.resultDefeatBgm);
        }
      } else if (s.remainingTime <= 0) {
        s.enemies = [];
        s.flyingEnemies = [];
        s.hitEffects = [];
        s.isAttacking = false;
        s.attackFrame = 0;
        s.attackTimer = 0;
        s.gameState = 'victory';
        setGameStateUI('victory');
        // 승리 사운드: stageBgm/runSfx 정지, resultWinBgm + win_cut_scene
        if (sounds) {
          stopAudio(sounds.stageBgm);
          stopAudio(sounds.runSfx);
          playSfx(sounds.resultWinBgm);
          sounds.win_cut_scene.play().catch(() => { });
        }
      }

      // 적/친구 업데이트
      for (const enemy of s.enemies) {
        if (!enemy.alive) continue;
        enemy.x -= enemy.speed * dt;
        const animFps = enemy.isFriend ? FRIEND_ANIM_FPS : ENEMY_ANIM_FPS;
        const fArr = enemy.isFriend ? assets.friendFrames : assets.enemyFrames;
        enemy.animTimer += dt;
        if (enemy.animTimer >= 1 / animFps) {
          enemy.animTimer -= 1 / animFps;
          enemy.frame = (enemy.frame + 1) % fArr.length;
        }
        if (enemy.x <= s.charX) {
          enemy.alive = false;
          if (enemy.isFriend) {
            // 친구 통과: HP 회복 + energySfx
            s.hp = Math.min(MAX_HP, s.hp + 1);
            s.friendOkTimer = FRIEND_OK_DURATION;
            if (sounds) playSfx(sounds.energySfx);
          } else {
            // 적 충돌: 데미지 + heroHitSfx
            s.hp = Math.max(0, s.hp - 1);
            s.damageShakeTimer = DAMAGE_SHAKE_DURATION;
            s.damageRedTimer = DAMAGE_RED_DURATION;
            s.heroHitTimer = HERO_HIT_DURATION;
            if (sounds) playSfx(sounds.heroHitSfx);
          }
        }
      }
      s.enemies = s.enemies.filter((e) => e.alive);

      for (const fe of s.flyingEnemies) {
        const fps = fe.isFriend ? FRIEND_HIT_FPS : ENEMY_HIT_FPS;
        fe.timer += dt;
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
      if (s.friendOkTimer > 0) s.friendOkTimer -= dt;
      if (s.damageShakeTimer > 0) s.damageShakeTimer -= dt;
      if (s.damageRedTimer > 0) s.damageRedTimer -= dt;
      if (s.heroHitTimer > 0) s.heroHitTimer -= dt;

      // 렌더링
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
      drawCharacter();
      drawFriendOkEffect();
      drawGroundLayer();
      ctx.restore();
      drawDamageOverlay();
      drawHP();
      drawTimer();
      drawScore();

      rafId = requestAnimationFrame(gameLoop);
    };

    rafId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafId);
  }, [loading, loadError, onGameResult, checkAttackHit]);

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
        <p className="text-xs text-gray-500">public/game05/asset/ 아래에 에셋을 넣어주세요.</p>
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
      {gameStateUI === 'result' && (
        <div className="absolute inset-0 z-20 flex items-end justify-center pb-8 pointer-events-none">
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={handleRestart}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleRestart();
              }}
              className="px-8 py-4 bg-white text-black font-bold text-lg rounded-lg shadow-lg active:scale-95 transition-transform touch-manipulation"
              aria-label="다시 시작"
            >
              다시 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game05;
