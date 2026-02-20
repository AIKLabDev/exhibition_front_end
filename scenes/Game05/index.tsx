/**
 * Game05: 플래포머 (Platformer)
 * State 패턴 기반 리팩토링 버전
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Game05Props, GameState, GameAssets, GameSounds, GameStateType } from './Game05.types';
import { CHAR_X, MAX_HP, GAME_DURATION, CANVAS_WIDTH as W, CANVAS_HEIGHT as H, ASSET_BASE } from './constants';
import { loadAllAssets } from './assets';
import { initSounds, playSfx, stopAllSounds } from './sounds';
import { stateHandlers, checkAttackHit } from './states';
import './Game05.css';

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

  // 상태 전환 함수
  const changeState = useCallback((newState: GameStateType) => {
    const state = stateRef.current;
    const sounds = soundsRef.current;
    const currentHandler = stateHandlers[state.gameState];
    const nextHandler = stateHandlers[newState];

    // 현재 상태 종료
    currentHandler.onExit?.(state, sounds);

    // 상태 변경
    state.gameState = newState;
    setGameStateUI(newState);

    // 새 상태 진입
    nextHandler.onEnter?.(state, sounds);
  }, []);

  // 게임 리셋
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
    resultReportedRef.current = false;
  }, []);

  // 공격 시작
  const startAttack = useCallback(() => {
    const s = stateRef.current;
    const assets = assetsRef.current;
    const sounds = soundsRef.current;
    if (!assets || s.gameState === 'victory') return;
    s.isAttacking = true;
    s.attackFrame = 0;
    s.attackTimer = 0;
    s.attackHitProcessed = false;
    if (sounds) {
      playSfx(sounds.attackSfx);
      playSfx(sounds.attackVoice);
    }
    checkAttackHit(s, assets, sounds, hitSfxIndexRef);
  }, []);

  // 입력 처리
  const handleInput = useCallback(
    (e?: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
      e?.preventDefault();
      const s = stateRef.current;
      if (s.gameState === 'title') {
        resetGame();
        changeState('playing');
      } else if (s.gameState === 'playing') {
        startAttack();
      }
    },
    [resetGame, changeState, startAttack]
  );

  // 재시작 (result → title)
  const handleRestart = useCallback(() => {
    const sounds = soundsRef.current;
    if (sounds) {
      stopAllSounds(sounds);
    }
    changeState('title');
  }, [changeState]);

  // 에셋 및 사운드 로드
  useEffect(() => {
    soundsRef.current = initSounds(ASSET_BASE);
    loadAllAssets(ASSET_BASE)
      .then((assets) => {
        assetsRef.current = assets;
        setLoading(false);
        console.log('[Game05] Assets loaded');
        // 타이틀 상태 진입
        stateHandlers.title.onEnter?.(stateRef.current, soundsRef.current);
      })
      .catch((err) => {
        console.error('[Game05] Asset load error:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      const sounds = soundsRef.current;
      if (sounds) {
        stopAllSounds(sounds);
      }
    };
  }, []);

  // 게임 루프
  useEffect(() => {
    if (loading || loadError || !assetsRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const assets = assetsRef.current;
    const state = stateRef.current;

    let rafId = 0;

    const gameLoop = (timestamp: number) => {
      let dt = (timestamp - state.lastTime) / 1000;
      state.lastTime = timestamp;
      if (dt > 0.1) dt = 0.016;

      ctx.clearRect(0, 0, W, H);

      const currentHandler = stateHandlers[state.gameState];

      // Update
      const nextState = currentHandler.update(state, dt, assets, soundsRef.current);

      // Render
      currentHandler.render(state, ctx, assets, W, H);

      // State Transition
      if (nextState && nextState !== state.gameState) {
        // 공격 히트 체크 (playing 상태에서)
        if (state.gameState === 'playing' && state.isAttacking) {
          checkAttackHit(state, assets, soundsRef.current, hitSfxIndexRef);
        }

        changeState(nextState);

        // 결과 보고
        if (nextState === 'result' && !resultReportedRef.current && onGameResult) {
          resultReportedRef.current = true;
          onGameResult(state.resultType === 'win' ? 'WIN' : 'LOSE');
        }
      }

      rafId = requestAnimationFrame(gameLoop);
    };

    rafId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafId);
  }, [loading, loadError, onGameResult, changeState]);

  // 키보드 이벤트
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
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRestart();
              }}
              className="px-8 py-4 bg-white text-black font-bold text-lg rounded-lg shadow-lg active:scale-95 transition-transform touch-manipulation select-none"
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
