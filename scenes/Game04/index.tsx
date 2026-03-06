/**
 * Game04: Zombie Defender (좀비고속도로)
 * Three.js 3D 슈팅 게임. 머리(또는 마우스)로 조준, 자동 발사.
 * 백엔드(Exhibition C++) WebSocket으로 GAME04_DIRECTION 수신 (Python → 공유메모리 → C++ → front_end).
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Game04Props } from './Game04.types';
import { PLAYER_MAX_HEALTH, GAME_DURATION, GAME04_STRINGS, RADAR_DETECT_RANGE, RADAR_ANGLE_DEGREES, PLAYER_VIEW_ANGLE_DEGREES } from './constants';
import { GameCanvas, type NearbyZombieRadar } from './GameScene';
import { backendWsService } from '../../services/backendWebSocketService';
import { getVisionWsService } from '../../services/visionWebSocketService';
import { BackendMessageName, UIEventName } from '../../protocol';
import { useGameStartFromBackend, useResetResultReportRefWhenEnteringRound } from '../../hooks/useGameStartFromBackend';
import ruleBgImg from '../../images/Game04 Rule.png';
import './Game04.css';

/** 기준 해상도 (전시 키오스크) */
const BASE_WIDTH = 2560;
const BASE_HEIGHT = 720;

/** 조준 반경(머리/마우스): PLAYER_VIEW_ANGLE_DEGREES와 동일 — 모니터를 보며 고개 돌릴 수 있는 범위 */
const AIM_HALF_DEG = PLAYER_VIEW_ANGLE_DEGREES / 2;
const MOUSE_YAW_RAD = (AIM_HALF_DEG * Math.PI) / 180;

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

// RADAR_ANGLE_DEGREES(180°)에 해당하는 라디안: 정면 기준 좌우 ±90°
const RADAR_ANGLE_HALF_RAD = (RADAR_ANGLE_DEGREES / 2) * (Math.PI / 180);

/** 레이더: 상단 반원 UI — 정면 RADAR_ANGLE_DEGREES(180°) 안의 좀비만 점으로 표시 */
const Radar = ({ zombies, scaleW, scaleH }: { zombies: NearbyZombieRadar[]; scaleW: number; scaleH: number }) => {
  const size = Math.round(240 * Math.min(scaleW, scaleH));
  const halfHeight = size / 2;
  const dotSize = Math.max(6, Math.round(10 * scaleH));
  return (
    <div
      className="game04-radar absolute left-1/2 -translate-x-1/2 overflow-hidden pointer-events-none"
      style={{ bottom: 0, width: size, height: halfHeight }}
    >
      {/* 원을 가로로 자른 위쪽만 표시 → 상단 반원 (곡선=위, 직선=아래) = 180° 시야 */}
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
      {/* 근접 좀비 점: 정면 180°(-π/2 ~ π/2) 안만 표시, 중심=반원 하단(50%,100%) */}
      {zombies
        .filter((z) => z.angle >= -RADAR_ANGLE_HALF_RAD && z.angle <= RADAR_ANGLE_HALF_RAD)
        .map((z, i) => {
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

const Game04: React.FC<Game04Props> = ({ onGameResult, inputMode: forceInputMode, triggerStartFromBackend = 0 }) => {
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
  const [pauseOverlayVisible, setPauseOverlayVisible] = useState(false);
  const resultReportedRef = useRef(false);

  // 디버그에서 강제 모드가 바뀌면 내부 inputMode 동기화
  useEffect(() => {
    if (forceInputMode != null) setInputMode(forceInputMode);
  }, [forceInputMode]);

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

  // Python Vision WebSocket: GAME04_PAUSE 수신 시 PAUSE 오버레이 표시 + 백엔드에 GAME04_PAUSE 전달
  useEffect(() => {
    const unsubscribe = getVisionWsService().onGame04Pause(() => {
      setPauseOverlayVisible(true);
      backendWsService.sendCommand(UIEventName.GAME04_PAUSE, {});
    });
    return () => { unsubscribe(); };
  }, []);

  // 백엔드(Exhibition C++) WebSocket으로 GAME04_DIRECTION 수신 (direction, yaw, pitch)
  useEffect(() => {
    const unsubscribe = backendWsService.addMessageListener((msg) => {
      if (msg.header?.name !== BackendMessageName.GAME04_DIRECTION || !msg.data) return;
      const data = msg.data as { direction?: string; yaw?: number; pitch?: number };
      const { yaw, pitch } = data;
      if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
      if (forceInputMode === 'mouse') return; // 디버그에서 mouse 강제 시 헤드 데이터 무시
      const yawRadRaw = (yaw * Math.PI) / 180;
      const yawRad = Math.max(-MOUSE_YAW_RAD, Math.min(MOUSE_YAW_RAD, yawRadRaw));
      headRotationRef.current = { yaw: yawRad, pitch: 0 };
      setInputMode('head');
    });

    return () => { unsubscribe(); };
  }, [forceInputMode]);

  // 마우스 폴백 (디버그에서 mouse 선택 시 또는 HEAD_POSE 미수신 시)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (inputMode === 'head') return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      headRotationRef.current = { yaw: x * MOUSE_YAW_RAD, pitch: 0 };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 강제 모드가 없을 때만: 3초 안에 HEAD_POSE 안 오면 마우스 모드
    const timer =
      forceInputMode == null
        ? setTimeout(() => setInputMode((prev) => (prev === 'head' ? 'mouse' : prev)), 3000)
        : undefined;

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timer != null) clearTimeout(timer);
    };
  }, [inputMode, forceInputMode]);

  // 게임 시작 (버튼 클릭 또는 백엔드 GAME_START 시 호출)
  const startGame = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setHealth(PLAYER_MAX_HEALTH);
    setTimeLeft(GAME_DURATION);
    setBossActive(false);
    setBossHP({ hp: 0, maxHP: 1 });
    setBossWarning(false);
    setBossDefeated(false);
    // 본게임 시작 시점을 백엔드에 알림 → Exhibition에서 헤드 추적/로봇 본게임 시작
    backendWsService.sendCommand(UIEventName.GAME04_MAINGAME_START, {});
    // Python에 본게임 시작 시그널 → 참여자 fix (track_id 고정)
    getVisionWsService().sendGame04MainGameStart();
  }, []);

  // 대기 중 또는 게임오버(재시작) 화면에서 백엔드 GAME_START 시 재시작
  useGameStartFromBackend(triggerStartFromBackend, startGame, {
    onlyWhen: () => !gameStarted,
  });

  useResetResultReportRefWhenEnteringRound(gameStarted, resultReportedRef);

  // Game04 씬을 벗어날 때(언마운트) 백엔드에 대기 상태 알림
  useEffect(() => {
    return () => {
      backendWsService.sendCommand(UIEventName.GAME04_IDLE, {});
    };
  }, []);

  const handleGameOver = useCallback((finalScoreVal: number) => {
    setGameStarted(false);
    setGameOver(true);
    setFinalScore(finalScoreVal);
    // 게임 종료 → 재시작 화면 진입 시 백엔드에 대기 상태 알림
    backendWsService.sendCommand(UIEventName.GAME04_IDLE, {});
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

  const handleBossSpawn = useCallback(() => {
    setBossActive(true);
    setBossWarning(true);
    setTimeout(() => setBossWarning(false), 3000); // 3초 후 경고 메시지 사라짐
  }, []);

  const handleBossHPChange = useCallback((hp: number, maxHP: number) => {
    setBossHP({ hp, maxHP });
  }, []);

  const handleBossDefeated = useCallback(() => {
    setBossDefeated(true);
    setBossActive(false);
  }, []);

  const isVictory = (timeLeft <= 0.1 && health > 0) || bossDefeated;

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

      {/* 3D 캔버스 */}
      <div className={`w-full h-full ${isDamaged ? 'animate-game04-shake' : ''}`}>
        <GameCanvas
          headRotation={headRotationRef}
          gameStarted={gameStarted}
          isPaused={pauseOverlayVisible}
          onGameOver={handleGameOver}
          onPlayerHit={handlePlayerHit}
          setScore={setScore}
          setTimeLeft={setTimeLeft}
          onNearbyZombies={setNearbyZombies}
          onBossSpawn={handleBossSpawn}
          onBossHPChange={handleBossHPChange}
          onBossDefeated={handleBossDefeated}
        />
      </div>

      {/* Boss Warning Overlay */}
      {bossWarning && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
          <div className="animate-pulse">
            <div className="text-red-500 font-bold tracking-widest text-center" style={{ fontSize: Math.round(60 * scaleH), textShadow: '0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.4)' }}>
              ⚠ WARNING ⚠
            </div>
            <div className="text-white font-bold text-center mt-2" style={{ fontSize: Math.round(30 * scaleH), textShadow: '0 0 10px rgba(255,0,0,0.6)' }}>
              보스 몬스터가 나타났다!
            </div>
          </div>
        </div>
      )}

      {/* Boss HP Bar */}
      {gameStarted && bossActive && (
        <div className="absolute z-25 flex flex-col items-center" style={{ top: `${80 * scaleH}px`, left: '50%', transform: 'translateX(-50%)' }}>
          <div className="text-red-400 font-bold tracking-wider mb-1" style={{ fontSize: Math.round(16 * scaleH) }}>BOSS</div>
          <div className="bg-black/70 border border-red-600 rounded-sm overflow-hidden" style={{ width: `${400 * scaleW}px`, height: `${16 * scaleH}px` }}>
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-200"
              style={{ width: `${Math.max(0, (bossHP.hp / bossHP.maxHP) * 100)}%` }}
            />
          </div>
        </div>
      )}

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

      {/* 시작 화면: 규칙 이미지 전체 + 게임 시작 버튼 영역 (Game02와 동일 패턴) */}
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
