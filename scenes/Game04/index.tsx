import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Game04Props } from './Game04.types';
import {
  GAME04_STRINGS,
  GAME_DURATION,
  PLAYER_MAX_HEALTH,
  PLAYER_VIEW_ANGLE_DEGREES,
  RADAR_ANGLE_DEGREES,
  RADAR_DETECT_RANGE,
} from './constants';
import { GameCanvas, type NearbyZombieRadar } from './GameScene';
import { createGame04AudioController } from './audio';
import { backendWsService } from '../../services/backendWebSocketService';
import { getVisionWsService } from '../../services/visionWebSocketService';
import { BackendMessageName, UIEventName } from '../../protocol';
import { useGameStartFromBackend, useResetResultReportRefWhenEnteringRound } from '../../hooks/useGameStartFromBackend';
import ruleBgImg from '../../images/Game04 Rule.png';
import './Game04.css';

const BASE_WIDTH = 2560;
const BASE_HEIGHT = 720;
const AIM_HALF_DEG = PLAYER_VIEW_ANGLE_DEGREES / 2;
const MOUSE_YAW_RAD = (AIM_HALF_DEG * Math.PI) / 180;
const MOUSE_PITCH_RAD = ((AIM_HALF_DEG * 0.7) * Math.PI) / 180;
const RADAR_ANGLE_HALF_RAD = (RADAR_ANGLE_DEGREES / 2) * (Math.PI / 180);

const Confetti = () => {
  const particles = Array.from({ length: 50 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((_, index) => (
        <div
          key={index}
          className="absolute w-3 h-3 rounded-sm opacity-80"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-5%',
            backgroundColor: ['#FFD700', '#FF69B4', '#00FF00', '#00BFFF', '#FF4500', '#FFF'][Math.floor(Math.random() * 6)],
            animation: `game04-confetti-fall ${Math.random() * 3 + 2}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
};

const Radar = ({ zombies, scaleW, scaleH }: { zombies: NearbyZombieRadar[]; scaleW: number; scaleH: number }) => {
  const size = Math.round(240 * Math.min(scaleW, scaleH));
  const halfHeight = size / 2;
  const dotSize = Math.max(6, Math.round(10 * scaleH));

  return (
    <div
      className="game04-radar absolute left-1/2 -translate-x-1/2 overflow-hidden pointer-events-none"
      style={{ bottom: 0, width: size, height: halfHeight }}
    >
      <div
        className="absolute left-0 top-0 rounded-full border-2 border-red-500/80 bg-black/50 backdrop-blur-sm"
        style={{
          width: size,
          height: size,
          boxShadow: '0 0 20px rgba(255,0,0,0.3)',
        }}
      />
      <div
        className="absolute w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-red-400/90"
        style={{ top: '4px', left: '50%', transform: 'translateX(-50%)' }}
      />
      {zombies
        .filter((zombie) => zombie.angle >= -RADAR_ANGLE_HALF_RAD && zombie.angle <= RADAR_ANGLE_HALF_RAD)
        .map((zombie, index) => {
          const normDist = Math.min(1, zombie.distance / RADAR_DETECT_RANGE);
          const radius = (size / 2 - dotSize) * normDist;
          const x = Math.sin(zombie.angle) * radius;
          const y = -Math.cos(zombie.angle) * radius;

          return (
            <div
              key={index}
              className="absolute rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.9)] game04-radar-dot"
              style={{
                width: dotSize,
                height: dotSize,
                left: `calc(50% + ${x}px)`,
                top: `calc(100% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}
    </div>
  );
};

const HealthBar = ({ health, scaleH }: { health: number; scaleH: number }) => {
  const size = Math.round(28 * scaleH);

  return (
    <div className="flex gap-1">
      {Array.from({ length: PLAYER_MAX_HEALTH }).map((_, index) => (
        <div
          key={index}
          className={`skew-x-12 border-2 border-black transition-all duration-300 ${index < health ? 'bg-green-500 shadow-[0_0_10px_#0f0]' : 'bg-red-900/30'}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
};

type HeadshotPopup = {
  id: number;
  xPercent: number;
  yPercent: number;
  target: 'zombie' | 'boss';
};

const Game04: React.FC<Game04Props> = ({
  onGameResult,
  inputMode: forceInputMode,
  triggerStartFromBackend = 0,
  hideResultRestart = false,
}) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(PLAYER_MAX_HEALTH);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isDamaged, setIsDamaged] = useState(false);
  const [inputMode, setInputMode] = useState<'head' | 'mouse'>(forceInputMode ?? 'head');
  const [nearbyZombies, setNearbyZombies] = useState<NearbyZombieRadar[]>([]);
  const [bossActive, setBossActive] = useState(false);
  const [bossHP, setBossHP] = useState({ hp: 0, maxHP: 1 });
  const [bossWarning, setBossWarning] = useState(false);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [headshotPopups, setHeadshotPopups] = useState<HeadshotPopup[]>([]);
  const resultReportedRef = useRef(false);
  const [pauseOverlayVisible, setPauseOverlayVisible] = useState(false);

  const headRotationRef = useRef({ yaw: 0, pitch: 0 });
  const bossWarningTimerRef = useRef<number | null>(null);
  const headshotPopupTimersRef = useRef<number[]>([]);
  const roundActiveRef = useRef(false);
  const healthRef = useRef(PLAYER_MAX_HEALTH);
  const scoreRef = useRef(0);
  const audioControllerRef = useRef<ReturnType<typeof createGame04AudioController> | null>(null);
  if (audioControllerRef.current == null) {
    audioControllerRef.current = createGame04AudioController();
  }
  const audio = audioControllerRef.current;

  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    if (forceInputMode != null) {
      setInputMode(forceInputMode);
    }
  }, [forceInputMode]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scaleW = viewportWidth / BASE_WIDTH;
  const scaleH = viewportHeight / BASE_HEIGHT;

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  
  // Python Vision WebSocket: GAME04_PAUSE 수신 시 PAUSE 오버레이 표시 + 백엔드에 GAME04_PAUSE 전달
  useEffect(() => {
    const unsubscribe = getVisionWsService().onGame04Pause(() => {
      setPauseOverlayVisible(true);
      backendWsService.sendCommand(UIEventName.GAME04_PAUSE, {});
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    const unsubscribe = backendWsService.addMessageListener((msg) => {
      if (msg.header?.name !== BackendMessageName.GAME04_DIRECTION || !msg.data) return;

      const data = msg.data as { direction?: string; yaw?: number; pitch?: number };
      const { yaw, pitch } = data;
      if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
      if (forceInputMode === 'mouse') return;

      const yawRadRaw = (yaw * Math.PI) / 180;
      const yawRad = Math.max(-MOUSE_YAW_RAD, Math.min(MOUSE_YAW_RAD, yawRadRaw));
      headRotationRef.current = { yaw: yawRad, pitch: 0 };
      setInputMode('head');
    });

    return () => {
      unsubscribe();
    };
  }, [forceInputMode]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (inputMode === 'head') return;

      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      const pitch = Math.max(-MOUSE_PITCH_RAD, Math.min(MOUSE_PITCH_RAD, -y * MOUSE_PITCH_RAD));
      headRotationRef.current = {
        yaw: x * MOUSE_YAW_RAD,
        pitch,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const fallbackTimer =
      forceInputMode == null
        ? window.setTimeout(() => setInputMode((prev) => (prev === 'head' ? 'mouse' : prev)), 3000)
        : undefined;

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (fallbackTimer != null) {
        window.clearTimeout(fallbackTimer);
      }
    };
  }, [forceInputMode, inputMode]);

  const clearBossWarningTimer = useCallback(() => {
    if (bossWarningTimerRef.current != null) {
      window.clearTimeout(bossWarningTimerRef.current);
      bossWarningTimerRef.current = null;
    }
  }, []);

  const clearHeadshotPopups = useCallback(() => {
    headshotPopupTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    headshotPopupTimersRef.current = [];
    setHeadshotPopups([]);
  }, []);

  const startGame = useCallback(() => {
    clearBossWarningTimer();
    clearHeadshotPopups();
    roundActiveRef.current = true;
    healthRef.current = PLAYER_MAX_HEALTH;
    scoreRef.current = 0;
    audio.startBattleLoop();
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setHealth(PLAYER_MAX_HEALTH);
    setTimeLeft(GAME_DURATION);
    setNearbyZombies([]);
    setBossActive(false);
    setBossHP({ hp: 0, maxHP: 1 });
    setBossWarning(false);
    setBossDefeated(false);
    backendWsService.sendCommand('GAME04_MAINGAME_START', {});
    getVisionWsService().sendGame04MainGameStart();
  }, [audio, clearBossWarningTimer, clearHeadshotPopups]);

  useGameStartFromBackend(triggerStartFromBackend, startGame, {
    onlyWhen: () => !gameStarted,
  });

  useResetResultReportRefWhenEnteringRound(gameStarted, resultReportedRef);

  useEffect(() => {
    audio.preload();
    return () => {
      clearBossWarningTimer();
      clearHeadshotPopups();
      audio.dispose();
      backendWsService.sendCommand(UIEventName.GAME04_IDLE, {});
    };
  }, [audio, clearBossWarningTimer, clearHeadshotPopups]);

  const handleGameOver = useCallback((finalScoreVal: number) => {
    roundActiveRef.current = false;
    clearBossWarningTimer();
    setGameStarted(false);
    setGameOver(true);
    setFinalScore(finalScoreVal);
    setBossWarning(false);
    // 게임 종료 → 재시작 화면 진입 시 백엔드에 대기 상태 알림
    backendWsService.sendCommand(UIEventName.GAME04_IDLE, {});
  }, [clearBossWarningTimer]);

  const handlePlayerHit = useCallback(() => {
    if (!roundActiveRef.current) return;

    audio.playPlayerDamage();
    const nextHealth = Math.max(0, healthRef.current - 1);
    healthRef.current = nextHealth;
    setHealth(nextHealth);
    setIsDamaged(true);
    window.setTimeout(() => setIsDamaged(false), 300);

    if (nextHealth <= 0) {
      roundActiveRef.current = false;
      handleGameOver(scoreRef.current);
    }
  }, [audio, handleGameOver]);

  const handleBossSpawn = useCallback(() => {
    clearBossWarningTimer();
    audio.startBossPhase();
    setBossActive(true);
    setBossWarning(true);
    bossWarningTimerRef.current = window.setTimeout(() => {
      setBossWarning(false);
      bossWarningTimerRef.current = null;
    }, 3000);
  }, [audio, clearBossWarningTimer]);

  const handleBossHPChange = useCallback((hp: number, maxHP: number) => {
    setBossHP({ hp, maxHP });
  }, []);

  const handleBossDefeated = useCallback(() => {
    setBossDefeated(true);
    setBossActive(false);
  }, []);

  const handleShootSound = useCallback(() => {
    if (!roundActiveRef.current) return;
    audio.playShoot();
  }, [audio]);

  const handleZombieSpawnSound = useCallback(() => {
    if (!roundActiveRef.current) return;
    audio.playZombieSpawn();
  }, [audio]);

  const handleZombieHitSound = useCallback(() => {
    if (!roundActiveRef.current) return;
    audio.playZombieHit();
  }, [audio]);

  const handleHeadshot = useCallback((xPercent: number, yPercent: number, target: 'zombie' | 'boss') => {
    const id = Date.now() + Math.random();
    const popup: HeadshotPopup = { id, xPercent, yPercent, target };
    setHeadshotPopups((prev) => [...prev, popup]);

    const timerId = window.setTimeout(() => {
      setHeadshotPopups((prev) => prev.filter((item) => item.id !== id));
      headshotPopupTimersRef.current = headshotPopupTimersRef.current.filter((item) => item !== timerId);
    }, 850);

    headshotPopupTimersRef.current.push(timerId);
  }, []);

  const isVictory = (timeLeft <= 0.1 && health > 0) || bossDefeated;

  useEffect(() => {
    if (gameStarted) return;

    if (gameOver) {
      audio.playResult(isVictory ? 'WIN' : 'LOSE');
      return;
    }

    audio.playTitleLoop();
  }, [audio, gameOver, gameStarted, isVictory]);

  useEffect(() => {
    audio.maybePlayZombieGroan(nearbyZombies.length, gameStarted && !gameOver && !bossDefeated);
  }, [audio, bossDefeated, gameOver, gameStarted, nearbyZombies]);

  /** PAUSE 터치 해제 시 오버레이 숨기고 백엔드에 GAME04_PAUSE_CANCEL, Python에 본게임 재시작 시그널 → 참여자 다시 fix */
  const handlePauseCancel = useCallback(() => {
    setPauseOverlayVisible(false);
    backendWsService.sendCommand(UIEventName.GAME04_PAUSE_CANCEL, {});
    getVisionWsService().sendGame04MainGameStart();
  }, []);

  // 게임 종료 시 한 번만 백엔드에 전달
  useEffect(() => {
    if (!gameOver || resultReportedRef.current || !onGameResult) return;
    resultReportedRef.current = true;
    onGameResult(isVictory ? 'WIN' : 'LOSE');
  }, [gameOver, isVictory, onGameResult]);

  const hudFontSize = Math.round(20 * scaleH);
  const timerFontSize = Math.round(140 * scaleH);
  const titleFontSize = Math.round(150 * scaleH);
  const buttonFontSize = Math.round(20 * scaleH);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* PAUSE 오버레이: Python에서 GAME04_PAUSE 수신 시 표시, 터치로 해제 */}
      {pauseOverlayVisible && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 cursor-pointer"
          onClick={handlePauseCancel}
          onTouchEnd={(e) => { e.preventDefault(); handlePauseCancel(); }}
          role="button"
          tabIndex={0}
          aria-label="일시정지 해제"
        >
          <div className="text-white text-center font-bold whitespace-pre-line select-none" style={{ fontSize: Math.round(48 * scaleH), lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            PAUSE
            {'\n'}
            카메라에 얼굴을 맞추고 터치해주세요
          </div>
        </div>
      )}

      {/* 데미지 오버레이 */}
      <div className={`absolute inset-0 z-10 bg-red-600 mix-blend-overlay pointer-events-none transition-opacity duration-100 ${isDamaged ? 'opacity-60' : 'opacity-0'}`} />

      <div className={`w-full h-full ${isDamaged ? 'animate-game04-shake' : ''}`}>
        <GameCanvas
          headRotation={headRotationRef}
          gameStarted={gameStarted}
          isPaused={pauseOverlayVisible}
          debugMouseControl={inputMode === 'mouse'}
          onGameOver={handleGameOver}
          onPlayerHit={handlePlayerHit}
          setScore={setScore}
          setTimeLeft={setTimeLeft}
          onNearbyZombies={setNearbyZombies}
          onBossSpawn={handleBossSpawn}
          onBossHPChange={handleBossHPChange}
          onBossDefeated={handleBossDefeated}
          onHeadshot={handleHeadshot}
          onZombieSpawnSound={handleZombieSpawnSound}
          onShootSound={handleShootSound}
          onZombieHitSound={handleZombieHitSound}
        />
      </div>

      {headshotPopups.map((popup) => (
        <div
          key={popup.id}
          className={`game04-headshot-pop absolute z-40 pointer-events-none ${popup.target === 'boss' ? 'text-red-200' : 'text-yellow-200'}`}
          style={{
            left: `${popup.xPercent}%`,
            top: `${popup.yPercent}%`,
          }}
        >
          HEAD!
        </div>
      ))}

      {bossWarning && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
          <div className="animate-pulse">
            <div
              className="text-red-500 font-bold tracking-widest text-center"
              style={{
                fontSize: Math.round(60 * scaleH),
                textShadow: '0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.4)',
              }}
            >
              WARNING
            </div>
            <div
              className="text-white font-bold text-center mt-2"
              style={{
                fontSize: Math.round(30 * scaleH),
                textShadow: '0 0 10px rgba(255,0,0,0.6)',
              }}
            >
              보스 몬스터가 나타났다!
            </div>
          </div>
        </div>
      )}

      {gameStarted && bossActive && (
        <div className="absolute z-25 flex flex-col items-center" style={{ top: `${80 * scaleH}px`, left: '50%', transform: 'translateX(-50%)' }}>
          <div className="text-red-400 font-bold tracking-wider mb-1" style={{ fontSize: Math.round(16 * scaleH) }}>
            BOSS
          </div>
          <div className="bg-black/70 border border-red-600 rounded-sm overflow-hidden" style={{ width: `${400 * scaleW}px`, height: `${16 * scaleH}px` }}>
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-200"
              style={{ width: `${Math.max(0, (bossHP.hp / bossHP.maxHP) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {gameStarted && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute top-6 left-0 w-full flex justify-between items-start" style={{ paddingLeft: `${48 * scaleW}px`, paddingRight: `${48 * scaleW}px` }}>
            <div className="bg-black/60 backdrop-blur border-l-4 border-yellow-500 skew-x-[-12deg]" style={{ padding: `${6 * scaleH}px ${24 * scaleW}px` }}>
              <div className="skew-x-[12deg] text-yellow-400 font-mono font-bold tracking-widest" style={{ fontSize: hudFontSize }}>
                {GAME04_STRINGS.SCORE_LABEL} {score.toString().padStart(6, '0')}
              </div>
            </div>
            <div className="flex flex-row items-center">
              <HealthBar health={health} scaleH={scaleH} />
            </div>
            <div className={`bg-black/60 backdrop-blur border-r-4 skew-x-[12deg] ${timeLeft < 5 ? 'border-red-500 animate-pulse' : 'border-blue-500'}`} style={{ padding: `${6 * scaleH}px ${24 * scaleW}px` }}>
              <div className={`skew-x-[-12deg] font-mono font-bold tracking-widest ${timeLeft < 5 ? 'text-red-500' : 'text-blue-400'}`} style={{ fontSize: hudFontSize }}>
                {timeLeft.toFixed(1)}s
              </div>
            </div>
          </div>

          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
            <div className={`font-black font-mono italic tracking-tighter opacity-20 select-none transform -skew-x-12 transition-colors duration-300 ${timeLeft < 5 ? 'text-red-500 animate-ping' : 'text-cyan-400'}`} style={{ fontSize: timerFontSize, filter: 'blur(2px)' }}>
              {Math.ceil(timeLeft)}
            </div>
            <div className={`absolute font-black font-mono italic tracking-tighter select-none transform -skew-x-12 transition-all duration-300 ${timeLeft < 5 ? 'text-red-600 scale-110 drop-shadow-[0_0_25px_rgba(255,0,0,0.8)]' : 'text-cyan-500 drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]'}`} style={{ fontSize: timerFontSize }}>
              {Math.ceil(timeLeft)}
            </div>
          </div>

          <Radar zombies={nearbyZombies} scaleW={scaleW} scaleH={scaleH} />

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/80 rounded-full flex items-center justify-center z-30">
            <div className="absolute w-full h-[2px] bg-white/40" />
            <div className="absolute h-full w-[2px] bg-white/40" />
            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_red]" />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-transparent to-black/90 pointer-events-none" />
        </div>
      )}

      {!gameStarted && !gameOver && (
        <div className="absolute inset-0 z-30 flex flex-col">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${ruleBgImg})` }}
          />
          <button
            type="button"
            onClick={startGame}
            className="absolute left-[40%] right-[40%] top-[85%] h-[12%] cursor-pointer flex items-center justify-center"
            aria-label="게임 시작"
          >
            <span
              className="absolute w-24 h-24 rounded-full border-4 border-white/40 animate-game04-start-pulse pointer-events-none"
              aria-hidden
            />
            <span
              className="absolute w-20 h-20 rounded-full border-2 border-green-400/50 animate-game04-start-pulse pointer-events-none"
              style={{ animationDelay: '0.4s' }}
              aria-hidden
            />
          </button>
        </div>
      )}

      {gameOver && (
        <div className={`absolute inset-0 z-30 flex flex-col justify-center backdrop-blur-md text-white ${isVictory ? 'bg-green-900/90' : 'bg-red-900/90'}`}>
          {isVictory && <Confetti />}
          <div className="w-full flex justify-center">
            <h2
              className={`font-black transform -skew-x-12 ${isVictory ? 'text-green-100' : 'text-red-100'}`}
              style={{ fontSize: `${titleFontSize * 1.3}px`, marginBottom: `${24 * scaleH}px` }}
            >
              {isVictory ? GAME04_STRINGS.VICTORY_TITLE : GAME04_STRINGS.DEFEAT_TITLE}
            </h2>
          </div>
          <div className="w-full flex justify-end" style={{ paddingRight: `${80 * scaleW}px` }}>
            <div className="flex flex-col items-end gap-4">
              <div
                className={`font-black border-b-4 ${isVictory ? 'border-green-400' : 'border-red-400'}`}
                style={{ fontSize: `${titleFontSize * 0.8}px`, paddingBottom: `${8 * scaleH}px` }}
              >
                {GAME04_STRINGS.SCORE_PREFIX}
                {finalScore}
              </div>
              {!hideResultRestart && (
                <button
                  onClick={startGame}
                  className={`bg-white font-black hover:bg-gray-200 transition-colors z-10 uppercase tracking-widest ${isVictory ? 'text-green-900' : 'text-red-900'}`}
                  style={{ fontSize: `${buttonFontSize}px`, padding: `${16 * scaleH}px ${40 * scaleW}px` }}
                >
                  {isVictory ? GAME04_STRINGS.RETRY_WIN : GAME04_STRINGS.RETRY_LOSE}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game04;


