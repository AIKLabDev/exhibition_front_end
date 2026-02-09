/**
 * Game02: Find Object (Hidden Object Hunt)
 *
 * 플레이어가 큰 이미지에서 작은 타겟 오브젝트를 찾는 게임
 * - 드래그로 이미지 탐색
 * - 클릭으로 타겟 위치 확인
 * - 120초 제한 시간
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Game02State, GameScenario, Game02Props } from './Game02.types';
import {
  VIEW_ZOOM,
  VIEW_AREA,
  DEFAULT_SCENE_ASPECT,
  GAME_TIME_LIMIT,
  ANNOUNCING_DURATION,
  CLICK_PADDING_RATIO,
  CLICK_PADDING_MIN,
  HEADPOSE_YAW_RANGE_DEG,
  HEADPOSE_PITCH_RANGE_DEG,
  HEADPOSE_DEADZONE,
  HEADPOSE_SMOOTH_ALPHA,
  HEADPOSE_STALE_MS,
  HEADPOSE_MAX_DELTA_DEG,
  PITCH_OFFSET,
  SETTINGS,
} from './constants';
import { generateLocalGameScenario } from './localScenarioService';
import { getVisionWsService } from '../../services/visionWebSocketService';
import ResultOverlay from './ResultOverlay';
import './Game02.css';

const DEFAULT_CENTER_TOP_LEFT = {
  x: (1 - 1 / VIEW_ZOOM) / 2,
  y: (1 - 1 / VIEW_ZOOM) / 2,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(
      value,
      (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
      2
    );
  } catch {
    return String(value);
  }
}

function normalizeError(err: unknown): { message: string; detail?: string } {
  if (err instanceof Error) {
    const message = err.message || '알 수 없는 오류';
    const detail = err.stack && err.stack !== message ? err.stack : undefined;
    return { message, detail };
  }
  if (typeof err === 'string') return { message: err };
  if (err && typeof err === 'object')
    return { message: '요청 실패', detail: safeJsonStringify(err) };
  return { message: String(err) };
}

function computeViewWindow(
  viewportAspect: number,
  sceneAspect: number
): { w: number; h: number } {
  const va =
    Number.isFinite(viewportAspect) && viewportAspect > 0
      ? viewportAspect
      : sceneAspect;
  const sa =
    Number.isFinite(sceneAspect) && sceneAspect > 0
      ? sceneAspect
      : DEFAULT_SCENE_ASPECT;

  const ratio = va / sa;
  const w = Math.sqrt(VIEW_AREA * ratio);
  const h = Math.sqrt(VIEW_AREA / ratio);

  return {
    w: clamp(w, 1e-6, 1),
    h: clamp(h, 1e-6, 1),
  };
}

const Game02: React.FC<Game02Props> = ({ onGameResult }) => {
  const [state, setState] = useState<Game02State>(Game02State.INTRO);
  const [scenario, setScenario] = useState<GameScenario | null>(null);
  const [targetCropUrl, setTargetCropUrl] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string>('');
  const [generationError, setGenerationError] = useState<{
    message: string;
    detail?: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_LIMIT);
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [viewportAspect, setViewportAspect] = useState<number>(DEFAULT_SCENE_ASPECT);
  const viewWindow = useMemo(
    () => computeViewWindow(viewportAspect, DEFAULT_SCENE_ASPECT),
    [viewportAspect]
  );
  const centerTopLeft = useMemo(
    () => ({ x: (1 - viewWindow.w) / 2, y: (1 - viewWindow.h) / 2 }),
    [viewWindow.w, viewWindow.h]
  );

  const [viewTopLeft, setViewTopLeft] = useState<{ x: number; y: number }>(
    DEFAULT_CENTER_TOP_LEFT
  );

  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    startTopLeftX: number;
    startTopLeftY: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startTopLeftX: DEFAULT_CENTER_TOP_LEFT.x,
    startTopLeftY: DEFAULT_CENTER_TOP_LEFT.y,
    moved: false,
  });

  // HumanTrack HeadPose 상태
  const headPoseRef = useRef<{ yaw: number; pitch: number; atMs: number } | null>(null);
  const prevPoseRef = useRef<{ yaw: number; pitch: number } | null>(null);
  const [headPoseStatus, setHeadPoseStatus] = useState<{
    connected: boolean;
    lastUpdate: number | null;
    yaw: number | null;
    pitch: number | null;
  }>({
    connected: false,
    lastUpdate: null,
    yaw: null,
    pitch: null,
  });

  const isGameScreen =
    state === Game02State.PLAYING ||
    state === Game02State.VERIFYING ||
    state === Game02State.SUCCESS ||
    state === Game02State.FAILURE;

  // 타겟 이미지 크롭
  const cropTargetImage = (
    base64: string,
    box: [number, number, number, number]
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const [ymin, xmin, ymax, xmax] = box;

        const sx = (xmin / 1000) * img.width;
        const sy = (ymin / 1000) * img.height;
        const sw = ((xmax - xmin) / 1000) * img.width;
        const sh = ((ymax - ymin) / 1000) * img.height;

        const padding = Math.max(sw, sh) * 0.8;
        const fsx = Math.max(0, sx - padding);
        const fsy = Math.max(0, sy - padding);
        const fsw = Math.min(img.width - fsx, sw + padding * 2);
        const fsh = Math.min(img.height - fsy, sh + padding * 2);

        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, fsx, fsy, fsw, fsh, 0, 0, 300, 300);
        }
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = `data:image/png;base64,${base64}`;
    });
  };

  // 클릭이 타겟 위에 있는지 확인
  const isClickOnTarget = useCallback(
    (scenario: GameScenario, x01: number, y01: number) => {
      const [ymin, xmin, ymax, xmax] = scenario.targetBox;
      const boxW = xmax - xmin;
      const boxH = ymax - ymin;

      const pad = Math.max(
        CLICK_PADDING_MIN,
        Math.max(boxW, boxH) * CLICK_PADDING_RATIO
      );
      const pxmin = Math.max(0, xmin - pad);
      const pxmax = Math.min(1000, xmax + pad);
      const pymin = Math.max(0, ymin - pad);
      const pymax = Math.min(1000, ymax + pad);

      const x = x01 * 1000;
      const y = y01 * 1000;

      return x >= pxmin && x <= pxmax && y >= pymin && y <= pymax;
    },
    []
  );

  // 새 게임 시작
  const startNewGame = useCallback(async () => {
    setState(Game02State.GENERATING);
    setLastClick(null);
    setViewTopLeft(centerTopLeft);
    setReasoning('');
    setGenerationError(null);
    setTimeLeft(GAME_TIME_LIMIT);
    setTargetCropUrl(null);

    try {
      const { scenario: newScenario, targetCropUrl: cropUrl } =
        await generateLocalGameScenario();
      setTargetCropUrl(cropUrl);
      setScenario(newScenario);
      setState(Game02State.ANNOUNCING);
    } catch (error) {
      console.error('[Game02] startNewGame 실패', error);
      setGenerationError(normalizeError(error));
      setState(Game02State.INTRO);
    }
  }, [centerTopLeft]);

  // 시나리오 변경 시 뷰포트 중앙으로 리셋
  useEffect(() => {
    if (!scenario) return;
    setViewTopLeft(centerTopLeft);
    setLastClick(null);
  }, [centerTopLeft, scenario]);

  // 뷰포트 크기 변경 감지
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportAspect(rect.width / rect.height);
      }
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [scenario, state]);

  // viewWindow 변경 시 topLeft clamp
  useEffect(() => {
    setViewTopLeft((prev) => ({
      x: clamp(prev.x, 0, 1 - viewWindow.w),
      y: clamp(prev.y, 0, 1 - viewWindow.h),
    }));
  }, [viewWindow.h, viewWindow.w]);

  // ANNOUNCING → PLAYING 전환 (3초 후)
  useEffect(() => {
    if (state === Game02State.ANNOUNCING) {
      const timeout = setTimeout(() => {
        setState(Game02State.PLAYING);
      }, ANNOUNCING_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [state]);

  // 타이머 처리
  useEffect(() => {
    if (state === Game02State.PLAYING) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setState(Game02State.FAILURE);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // 게임 결과 보고
  useEffect(() => {
    if (state === Game02State.SUCCESS) {
      onGameResult('win');
    } else if (state === Game02State.FAILURE) {
      onGameResult('lose');
    }
  }, [state, onGameResult]);

  // HumanTrack HeadPose: 공통 Python WebSocket으로 수신 (UDP 대체)
  useEffect(() => {
    const visionWs = getVisionWsService();
    visionWs.connect().catch(() => {});

    const applyPose = (data: { yaw: number; pitch: number }) => {
      const { yaw, pitch } = data;
      if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
      const now = Date.now();
      headPoseRef.current = { yaw, pitch, atMs: now };
      if (!prevPoseRef.current) prevPoseRef.current = { yaw, pitch };
      setHeadPoseStatus({ connected: true, lastUpdate: now, yaw, pitch });
    };

    const unsubscribe = visionWs.onPose(applyPose);
    return () => {
      unsubscribe();
    };
  }, []);

  // 게임 중 헤드포즈로 뷰포트 이동
  useEffect(() => {
    if (state !== Game02State.PLAYING) return;
    let raf = 0;

    const tick = () => {
      raf = window.requestAnimationFrame(tick);
      if (dragRef.current.active) return; // 드래그 중이면 무시

      const pose = headPoseRef.current;
      if (!pose) return;

      const age = Date.now() - pose.atMs;
      if (age > HEADPOSE_STALE_MS) {
        if (headPoseStatus.connected) {
          setHeadPoseStatus((prev) => ({ ...prev, connected: false }));
        }
        return;
      }

      let yaw = pose.yaw;
      let pitch = pose.pitch + PITCH_OFFSET;

      // 큰 변화 필터링
      if (prevPoseRef.current) {
        const normalizeAngleDelta = (current: number, prev: number): number => {
          let delta = current - prev;
          while (delta > 180) delta -= 360;
          while (delta < -180) delta += 360;
          return delta;
        };

        const yawDelta = normalizeAngleDelta(yaw, prevPoseRef.current.yaw);
        const pitchDelta = normalizeAngleDelta(pitch, prevPoseRef.current.pitch);

        if (Math.abs(yawDelta) > HEADPOSE_MAX_DELTA_DEG) {
          yaw = prevPoseRef.current.yaw;
        }
        if (Math.abs(pitchDelta) > HEADPOSE_MAX_DELTA_DEG) {
          pitch = prevPoseRef.current.pitch;
        }
      }

      prevPoseRef.current = { yaw, pitch };

      const maxX = 1 - viewWindow.w;
      const maxY = 1 - viewWindow.h;

      let nx = clamp(yaw / HEADPOSE_YAW_RANGE_DEG, -1, 1);
      let ny = clamp(pitch / HEADPOSE_PITCH_RANGE_DEG, -1, 1);

      if (Math.abs(nx) < HEADPOSE_DEADZONE) nx = 0;
      if (Math.abs(ny) < HEADPOSE_DEADZONE) ny = 0;

      const targetX = clamp(maxX / 2 + nx * (maxX / 2), 0, maxX);
      const targetY = clamp(maxY / 2 + ny * (maxY / 2), 0, maxY);

      setViewTopLeft((prev) => {
        const newX = prev.x + (targetX - prev.x) * HEADPOSE_SMOOTH_ALPHA;
        const newY = prev.y + (targetY - prev.y) * HEADPOSE_SMOOTH_ALPHA;
        return { x: newX, y: newY };
      });
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [state, viewWindow.h, viewWindow.w, headPoseStatus.connected]);

  // 뷰포트 클릭 처리
  const handleViewportClick = useCallback(
    (clientX: number, clientY: number) => {
      if (state !== Game02State.PLAYING || !scenario) return;
      const el = viewportRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x01 = (clientX - rect.left) / rect.width;
      const y01 = (clientY - rect.top) / rect.height;
      if (x01 < 0 || x01 > 1 || y01 < 0 || y01 > 1) return;

      setLastClick({ x: x01, y: y01 });

      const xFull = viewTopLeft.x + x01 * viewWindow.w;
      const yFull = viewTopLeft.y + y01 * viewWindow.h;

      const success = isClickOnTarget(scenario, xFull, yFull);
      if (success) {
        setState(Game02State.SUCCESS);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setReasoning('거기가 아닙니다!');
        setTimeout(() => setReasoning(''), 2000);
      }
    },
    [scenario, state, viewTopLeft.x, viewTopLeft.y, viewWindow.h, viewWindow.w, isClickOnTarget]
  );

  const onViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (state !== Game02State.PLAYING || !scenario) return;
    const el = viewportRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    dragRef.current.active = true;
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.startClientX = e.clientX;
    dragRef.current.startClientY = e.clientY;
    dragRef.current.startTopLeftX = viewTopLeft.x;
    dragRef.current.startTopLeftY = viewTopLeft.y;
    dragRef.current.moved = false;
    setLastClick(null);
  };

  const onViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;

    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;

    const deltaXNorm = (-dx / rect.width) * viewWindow.w;
    const deltaYNorm = (-dy / rect.height) * viewWindow.h;

    const nx = clamp(d.startTopLeftX + deltaXNorm, 0, 1 - viewWindow.w);
    const ny = clamp(d.startTopLeftY + deltaYNorm, 0, 1 - viewWindow.h);
    setViewTopLeft({ x: nx, y: ny });
  };

  const onViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d.pointerId !== e.pointerId) return;

    d.active = false;
    d.pointerId = null;

    if (!d.moved) {
      handleViewportClick(e.clientX, e.clientY);
    }
  };

  const onViewportPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d.pointerId !== e.pointerId) return;
    d.active = false;
    d.pointerId = null;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`h-full w-full bg-black overflow-hidden relative selection:bg-indigo-500 ${
        isGameScreen ? 'flex flex-row' : 'flex flex-col items-center justify-center p-4'
      }`}
    >
      {/* 1. Intro Screen */}
      {state === Game02State.INTRO && (
        <div className="text-center z-10 animate-game02-zoom-in">
          <button
            onClick={startNewGame}
            className="group px-16 py-8 bg-indigo-600 hover:bg-indigo-500 rounded-[3rem] font-black text-5xl transition-all hover:scale-110 active:scale-95 shadow-[0_0_80px_rgba(79,70,229,0.5)] text-white"
          >
            시작
          </button>

          {generationError && (
            <div className="mt-8 max-w-3xl text-left mx-auto rounded-[2rem] border border-rose-500/40 bg-zinc-900/80 p-6 backdrop-blur-2xl shadow-2xl">
              <p className="text-rose-300 font-black text-2xl mb-3">
                이미지 로드 실패
              </p>
              <pre className="text-rose-100/90 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {generationError.message}
              </pre>
              {generationError.detail && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-zinc-300 font-bold">
                    자세히 보기(로그)
                  </summary>
                  <pre className="mt-3 text-zinc-200 text-xs whitespace-pre-wrap break-words leading-relaxed">
                    {generationError.detail}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Generating Screen */}
      {state === Game02State.GENERATING && (
        <div className="text-center z-10 animate-game02-fade-in">
          {/* Spinner */}
          <div className="w-24 h-24 border-4 border-indigo-500 border-t-transparent rounded-full animate-game02-spin mx-auto mb-8" />
          <h2 className="text-5xl font-black mb-2 tracking-tighter italic text-white">
            준비 중...
          </h2>
        </div>
      )}

      {/* 3. Announcing Screen */}
      {state === Game02State.ANNOUNCING && targetCropUrl && (
        <div className="text-center z-10 animate-game02-zoom-in flex flex-col items-center">
          <h2 className="font-korean-dynamic text-[120px] tracking-tighter mb-12 text-white leading-none drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)]">
            찾아라!
          </h2>
          <div className="w-80 h-80 rounded-[4rem] overflow-hidden border-8 border-indigo-500 shadow-[0_0_100px_rgba(79,70,229,0.4)] bg-zinc-900 p-4 animate-game02-float">
            <img
              src={targetCropUrl}
              alt="Target"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="mt-12 text-zinc-500 text-2xl font-bold animate-pulse">
            잠시 후 게임이 시작됩니다...
          </p>
        </div>
      )}

      {/* 4. Game Play Screen */}
      {isGameScreen && scenario && (
        <div className="w-full h-full flex flex-row min-h-0 animate-game02-fade-in">
          {/* Left Sidebar */}
          <aside className="w-[520px] shrink-0 h-full p-6 flex flex-col gap-6 game02-sidebar border-r border-white/10">
            {targetCropUrl && (
              <div className="w-full aspect-square rounded-[2rem] overflow-hidden border border-indigo-500/40 bg-black/30 shadow-[0_0_60px_rgba(79,70,229,0.25)]">
                <img
                  src={targetCropUrl}
                  alt="Target"
                  className="w-full h-full object-contain p-4"
                />
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1 rounded-[2rem] bg-zinc-900/60 border border-white/10 p-5">
                <p className="text-sm font-black text-zinc-500 mb-2 italic">
                  남은시간
                </p>
                <div
                  className={`text-7xl font-black font-mono leading-none ${
                    timeLeft < 30
                      ? 'text-rose-500 animate-game02-timer-warning'
                      : 'text-white'
                  }`}
                >
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Mini-map */}
              <div className="relative w-[210px] aspect-video rounded-[1.5rem] overflow-hidden border border-white/15 bg-black/40 backdrop-blur-xl shadow-2xl">
                <img
                  src={`data:image/png;base64,${scenario.sceneImageBase64}`}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
                <div
                  className="absolute inset-0 bg-black/35"
                  aria-hidden="true"
                />
                <div
                  className="absolute border-2 border-white/90 rounded-md shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                  style={{
                    left: `${viewTopLeft.x * 100}%`,
                    top: `${viewTopLeft.y * 100}%`,
                    width: `${viewWindow.w * 100}%`,
                    height: `${viewWindow.h * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* HeadPose 상태 (DEBUG_MODE일 때만) */}
            {SETTINGS.DEBUG_MODE && (
              <div className="rounded-[2rem] bg-zinc-900/60 border border-white/10 p-5">
                <p className="text-sm font-black text-zinc-500 mb-2 italic">
                  헤드 포즈
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      headPoseStatus.connected
                        ? 'bg-green-500 animate-pulse'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm font-bold text-white">
                    {headPoseStatus.connected ? '연결됨' : '연결 안됨'}
                  </span>
                </div>
                {headPoseStatus.yaw !== null && headPoseStatus.pitch !== null && (
                  <div className="text-xs text-zinc-400 font-mono">
                    <div>Yaw: {headPoseStatus.yaw.toFixed(1)}°</div>
                    <div>Pitch: {(headPoseStatus.pitch + PITCH_OFFSET).toFixed(1)}°</div>
                    {headPoseStatus.lastUpdate && (
                      <div className="text-zinc-500 mt-1">
                        {Math.round((Date.now() - headPoseStatus.lastUpdate) / 1000)}초 전
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* DEBUG_MODE가 false일 때만 공간 채우기 */}
            {!SETTINGS.DEBUG_MODE && <div className="flex-1" />}
          </aside>

          {/* Main Image Area */}
          <main className="flex-1 min-w-0 h-full relative overflow-hidden bg-black">
            {/* Blurred background */}
            <img
              src={`data:image/png;base64,${scenario.sceneImageBase64}`}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-35"
            />
            <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

            <div className="relative w-full h-full">
              {/* Viewport */}
              <div
                ref={viewportRef}
                className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: 'none' }}
                onPointerDown={onViewportPointerDown}
                onPointerMove={onViewportPointerMove}
                onPointerUp={onViewportPointerUp}
                onPointerCancel={onViewportPointerCancel}
              >
                <img
                  src={`data:image/png;base64,${scenario.sceneImageBase64}`}
                  alt="Scene"
                  draggable={false}
                  className={`absolute top-0 left-0 max-w-none max-h-none select-none ${
                    state === Game02State.VERIFYING ? 'brightness-50 blur-sm' : ''
                  }`}
                  style={{
                    width: `${100 / viewWindow.w}%`,
                    height: `${100 / viewWindow.h}%`,
                    transform: `translate(${-viewTopLeft.x * 100}%, ${-viewTopLeft.y * 100}%)`,
                    willChange: 'transform',
                  }}
                />

                {/* Click Indicator */}
                {lastClick && (
                  <div
                    className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                    style={{
                      left: `${lastClick.x * 100}%`,
                      top: `${lastClick.y * 100}%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white rounded-full animate-game02-ping opacity-75" />
                    <div className="absolute inset-0 border-8 border-white rounded-full shadow-[0_0_30px_white]" />
                  </div>
                )}

                {/* Verifying Overlay */}
                {state === Game02State.VERIFYING && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                    <div className="w-20 h-20 text-white animate-game02-bounce mb-4">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <p className="text-4xl font-black text-white drop-shadow-2xl">
                      분석 중...
                    </p>
                  </div>
                )}

                {/* Wrong Click Overlay */}
                {state === Game02State.PLAYING && reasoning && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none">
                    <div className="animate-game02-pop select-none">
                      <h2 className="font-korean-dynamic text-[7rem] md:text-[10rem] leading-none drop-shadow-[0_20px_20px_rgba(0,0,0,0.6)] text-orange-500">
                        거기가 아닙니다!
                      </h2>
                    </div>
                  </div>
                )}

                {/* Success/Failure Overlay */}
                <ResultOverlay state={state} />
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default Game02;
