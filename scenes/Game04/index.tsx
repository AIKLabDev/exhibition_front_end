/**
 * Game04: Zombie Defender (좀비고속도로)
 * Three.js 3D 슈팅 게임. 머리(또는 마우스)로 조준, 자동 발사.
 * HEAD_POSE는 visionWebSocketService.onPose()로 수신 (Game02와 동일 패턴).
 * 카메라/MediaPipe는 제거하고 Vision Python 공통 모듈에서 yaw/pitch를 받아옴.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Game04Props } from './Game04.types';
import { PLAYER_MAX_HEALTH, GAME_DURATION, GAME04_STRINGS, RADAR_DETECT_RANGE } from './constants';
import { GameCanvas, type NearbyZombieRadar } from './GameScene';
import { getVisionWsService } from '../../services/visionWebSocketService';
import './Game04.css';

/** 기준 해상도 (전시 키오스크) */
const BASE_WIDTH = 2560;
const BASE_HEIGHT = 720;

/** HEAD_POSE yaw를 라디안으로 변환할 때 최대 범위 (±도) */
const HEAD_YAW_RANGE_DEG = 50;
/** 마우스 폴백 시 감도 (±라디안) */
const MOUSE_YAW_RAD = 75 * (Math.PI / 180);

// 간단한 컨페티
const Confetti = () => {
  const particles = Array.from({ length: 50 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((_, i) => (
        <div
          key={i}
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

/** 레이더: 상단 반원 UI (180° 정면) — 감지 범위 내 좀비를 점으로 표시, 중심=하단(플레이어) */
const Radar = ({ zombies, scaleW, scaleH }: { zombies: NearbyZombieRadar[]; scaleW: number; scaleH: number }) => {
  const size = Math.round(240 * Math.min(scaleW, scaleH));
  const halfHeight = size / 2;
  const dotSize = Math.max(6, Math.round(10 * scaleH));
  return (
    <div
      className="game04-radar absolute left-1/2 -translate-x-1/2 overflow-hidden pointer-events-none"
      style={{ bottom: 0, width: size, height: halfHeight }}
    >
      {/* 원을 가로로 자른 위쪽만 표시 → 상단 반원 (곡선=위, 직선=아래) */}
      <div
        className="absolute left-0 top-0 rounded-full border-2 border-red-500/80 bg-black/50 backdrop-blur-sm"
        style={{
          width: size,
          height: size,
          boxShadow: '0 0 20px rgba(255,0,0,0.3)',
        }}
      />
      {/* 정면 방향 표시 (반원 꼭대기) */}
      <div
        className="absolute w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-red-400/90"
        style={{ top: '4px', left: '50%', transform: 'translateX(-50%)' }}
      />
      {/* 근접 좀비 점: 중심=반원 하단(50%,100%), angle=0이 위쪽(정면) */}
      {zombies.map((z, i) => {
        const normDist = Math.min(1, z.distance / RADAR_DETECT_RANGE);
        const r = (size / 2 - dotSize) * normDist;
        const x = Math.sin(z.angle) * r;
        const y = -Math.cos(z.angle) * r;
        return (
          <div
            key={i}
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

// 체력 바
const HealthBar = ({ health, scaleH }: { health: number; scaleH: number }) => {
  const size = Math.round(28 * scaleH);
  return (
    <div className="flex gap-1">
      {Array.from({ length: PLAYER_MAX_HEALTH }).map((_, i) => (
        <div
          key={i}
          className={`skew-x-12 border-2 border-black transition-all duration-300 ${i < health ? 'bg-green-500 shadow-[0_0_10px_#0f0]' : 'bg-red-900/30'}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
};

const Game04: React.FC<Game04Props> = ({ onGameResult }) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(PLAYER_MAX_HEALTH);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isDamaged, setIsDamaged] = useState(false);
  const [inputMode, setInputMode] = useState<'head' | 'mouse'>('head');
  const [nearbyZombies, setNearbyZombies] = useState<NearbyZombieRadar[]>([]);
  const resultReportedRef = useRef(false);

  const headRotationRef = useRef({ yaw: 0, pitch: 0 });

  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

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

  // Vision WebSocket HEAD_POSE 구독 (Game02 패턴)
  useEffect(() => {
    const visionWs = getVisionWsService();
    if (!visionWs.isConnected()) {
      visionWs.connect().catch(() => { });
    }

    const unsubscribe = visionWs.onPose((data) => {
      const { yaw, pitch } = data;
      if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
      // yaw가 도(degree)로 오면 라디안으로 변환
      const yawRad = (yaw / HEAD_YAW_RANGE_DEG) * (HEAD_YAW_RANGE_DEG * Math.PI / 180);
      headRotationRef.current = { yaw: yawRad, pitch: 0 };
      setInputMode('head');
    });

    return () => { unsubscribe(); };
  }, []);

  // 마우스 폴백 (HEAD_POSE 안 올 때도 테스트 가능)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (inputMode === 'head') return; // HEAD_POSE 들어오면 마우스 무시
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      headRotationRef.current = { yaw: x * MOUSE_YAW_RAD, pitch: 0 };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 3초 안에 HEAD_POSE 안 오면 마우스 모드
    const timer = setTimeout(() => {
      setInputMode((prev) => prev === 'head' ? 'mouse' : prev);
    }, 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, [inputMode]);

  const startGame = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setHealth(PLAYER_MAX_HEALTH);
    setTimeLeft(GAME_DURATION);
    resultReportedRef.current = false;
  }, []);

  const handleGameOver = useCallback((finalScoreVal: number) => {
    setGameStarted(false);
    setGameOver(true);
    setFinalScore(finalScoreVal);
  }, []);

  const handlePlayerHit = useCallback(() => {
    setHealth((prev) => {
      const newHealth = prev - 1;
      if (newHealth <= 0) {
        setTimeout(() => handleGameOver(score), 100);
        return 0;
      }
      return newHealth;
    });
    setIsDamaged(true);
    setTimeout(() => setIsDamaged(false), 300);
  }, [score, handleGameOver]);

  const isVictory = timeLeft <= 0.1 && health > 0;

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
      {/* 데미지 오버레이 */}
      <div className={`absolute inset-0 z-10 bg-red-600 mix-blend-overlay pointer-events-none transition-opacity duration-100 ${isDamaged ? 'opacity-60' : 'opacity-0'}`} />

      {/* 3D 캔버스 */}
      <div className={`w-full h-full ${isDamaged ? 'animate-game04-shake' : ''}`}>
        <GameCanvas
          headRotation={headRotationRef}
          gameStarted={gameStarted}
          onGameOver={handleGameOver}
          onPlayerHit={handlePlayerHit}
          setScore={setScore}
          setTimeLeft={setTimeLeft}
          onNearbyZombies={setNearbyZombies}
        />
      </div>

      {/* HUD */}
      {gameStarted && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* 상단 바 */}
          <div className="absolute top-6 left-0 w-full flex justify-between items-start" style={{ paddingLeft: `${48 * scaleW}px`, paddingRight: `${48 * scaleW}px` }}>
            {/* 점수 */}
            <div className="bg-black/60 backdrop-blur border-l-4 border-yellow-500 skew-x-[-12deg]" style={{ padding: `${6 * scaleH}px ${24 * scaleW}px` }}>
              <div className="skew-x-[12deg] text-yellow-400 font-mono font-bold tracking-widest" style={{ fontSize: hudFontSize }}>
                {GAME04_STRINGS.SCORE_LABEL} {score.toString().padStart(6, '0')}
              </div>
            </div>
            {/* 체력 */}
            <div className="flex flex-row items-center">
              <HealthBar health={health} scaleH={scaleH} />
            </div>
            {/* 타이머 */}
            <div className={`bg-black/60 backdrop-blur border-r-4 skew-x-[12deg] ${timeLeft < 5 ? 'border-red-500 animate-pulse' : 'border-blue-500'}`} style={{ padding: `${6 * scaleH}px ${24 * scaleW}px` }}>
              <div className={`skew-x-[-12deg] font-mono font-bold tracking-widest ${timeLeft < 5 ? 'text-red-500' : 'text-blue-400'}`} style={{ fontSize: hudFontSize }}>
                {timeLeft.toFixed(1)}s
              </div>
            </div>
          </div>

          {/* 중앙 대형 타이머 */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
            <div className={`font-black font-mono italic tracking-tighter opacity-20 select-none transform -skew-x-12 transition-colors duration-300 ${timeLeft < 5 ? 'text-red-500 animate-ping' : 'text-cyan-400'}`} style={{ fontSize: timerFontSize, filter: 'blur(2px)' }}>
              {Math.ceil(timeLeft)}
            </div>
            <div className={`absolute font-black font-mono italic tracking-tighter select-none transform -skew-x-12 transition-all duration-300 ${timeLeft < 5 ? 'text-red-600 scale-110 drop-shadow-[0_0_25px_rgba(255,0,0,0.8)]' : 'text-cyan-500 drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]'}`} style={{ fontSize: timerFontSize }}>
              {Math.ceil(timeLeft)}
            </div>
          </div>

          {/* 레이더: 근접 좀비 표시 */}
          <Radar zombies={nearbyZombies} scaleW={scaleW} scaleH={scaleH} />

          {/* 십자선 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/80 rounded-full flex items-center justify-center z-30">
            <div className="absolute w-full h-[2px] bg-white/40" />
            <div className="absolute h-full w-[2px] bg-white/40" />
            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_red]" />
          </div>

          {/* 좌우 비네팅 */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-transparent to-black/90 pointer-events-none" />
        </div>
      )}

      {/* 시작 화면 */}
      {!gameStarted && !gameOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white">
          <h1
            className="font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 animate-game04-gradient-x italic transform -skew-x-12 pr-4"
            style={{ fontSize: `${titleFontSize}px` }}
          >
            {GAME04_STRINGS.TITLE}
          </h1>
          <p className="text-gray-400 max-w-full text-center font-black uppercase tracking-widest" style={{ fontSize: `${titleFontSize * 0.3}px`, marginBottom: `${32 * scaleH}px` }}>
            {GAME04_STRINGS.SUBTITLE}
          </p>
          <button
            onClick={startGame}
            className="group relative bg-green-600 overflow-hidden font-bold rounded-sm tracking-widest border border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)] transition-all hover:scale-105 active:scale-95 text-white"
            style={{ fontSize: `${buttonFontSize}px`, padding: `${16 * scaleH}px ${48 * scaleW}px` }}
          >
            <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full skew-x-12 group-hover:translate-x-full transition-transform duration-500" />
            {GAME04_STRINGS.START_BUTTON}
          </button>
        </div>
      )}

      {/* 게임 오버 화면: 타이틀 중앙, 점수·다시시작 우측 */}
      {gameOver && (
        <div className={`absolute inset-0 z-30 flex flex-col justify-center backdrop-blur-md text-white ${isVictory ? 'bg-green-900/90' : 'bg-red-900/90'}`}>
          {isVictory && <Confetti />}
          {/* 타이틀: 중앙 */}
          <div className="w-full flex justify-center">
            <h2
              className={`font-black transform -skew-x-12 ${isVictory ? 'text-green-100' : 'text-red-100'}`}
              style={{ fontSize: `${titleFontSize * 1.3}px`, marginBottom: `${24 * scaleH}px` }}
            >
              {isVictory ? GAME04_STRINGS.VICTORY_TITLE : GAME04_STRINGS.DEFEAT_TITLE}
            </h2>
          </div>
          {/* 점수·버튼: 우측 정렬 */}
          <div className="w-full flex justify-end" style={{ paddingRight: `${80 * scaleW}px` }}>
            <div className="flex flex-col items-end gap-4">
              <div
                className={`font-black border-b-4 ${isVictory ? 'border-green-400' : 'border-red-400'}`}
                style={{ fontSize: `${titleFontSize * 0.8}px`, paddingBottom: `${8 * scaleH}px` }}
              >
                {GAME04_STRINGS.SCORE_PREFIX}{finalScore}
              </div>
              <button
                onClick={startGame}
                className={`bg-white font-black hover:bg-gray-200 transition-colors z-10 uppercase tracking-widest ${isVictory ? 'text-green-900' : 'text-red-900'}`}
                style={{ fontSize: `${buttonFontSize}px`, padding: `${16 * scaleH}px ${40 * scaleW}px` }}
              >
                {isVictory ? GAME04_STRINGS.RETRY_WIN : GAME04_STRINGS.RETRY_LOSE}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game04;
