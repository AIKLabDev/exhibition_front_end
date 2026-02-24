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
  SETTINGS,
} from './constants';
import { generateLocalGameScenario } from './localScenarioService';
import { backendWsService } from '../../services/backendWebSocketService';
import { BackendMessageName } from '../../protocol';
import { useCameraFrameCanvas } from '../../hooks/useCameraFrameCanvas';
import { useGameStartFromBackend, isStartableState, useResetResultReportRefWhenEnteringRound } from '../../hooks/useGameStartFromBackend';
import ResultOverlay from './ResultOverlay';
import ruleBgImg from '../../images/Game02 Rule.png';
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

const Game02: React.FC<Game02Props> = ({ onGameResult, triggerStartFromBackend = 0 }) => {
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
  const resultReportedRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const alignCanvasRef = useRef<HTMLCanvasElement>(null);
  const { hasFrame: alignHasFrame } = useCameraFrameCanvas(alignCanvasRef, {
    enabled: state === Game02State.ALIGNING,
  });
  /** 0~1, 3초 유지 = 100%. 10도 벗어나면 백엔드가 0으로 리셋 */
  const [alignProgress, setAlignProgress] = useState(0);

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

  // 게임 시작 클릭 → 얼굴 정렬 UI로 진입 (정렬 완료 시 startGame은 백엔드 신호로 호출)
  const requestGameStartWithAlignment = useCallback(() => {
    setState(Game02State.ALIGNING);
    backendWsService.sendCommand('GAME02_ALIGNMENT_START', {});
  }, []);

  // 게임 시작 (시나리오 생성 → ANNOUNCING → PLAYING). 버튼(정렬 후) 또는 백엔드 GAME_START 시 호출
  const startGame = useCallback(async () => {
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
      console.error('[Game02] startGame 실패', error);
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

  // 게임 결과 보고 (한 판당 한 번만)
  useEffect(() => {
    if (state === Game02State.SUCCESS && !resultReportedRef.current) {
      resultReportedRef.current = true;
      onGameResult('win');
    } else if (state === Game02State.FAILURE && !resultReportedRef.current) {
      resultReportedRef.current = true;
      onGameResult('lose');
    }
  }, [state, onGameResult]);

  useResetResultReportRefWhenEnteringRound(
    state === Game02State.GENERATING || state === Game02State.ANNOUNCING || state === Game02State.PLAYING,
    resultReportedRef
  );

  // 대기 중 또는 결과 화면에서 백엔드 GAME_START 시 시작/재시작 (3판 진행 시 재시작 포함)
  const game02StartableStates: readonly Game02State[] = [
    Game02State.INTRO,
    Game02State.ALIGNING,
    Game02State.SUCCESS,
    Game02State.FAILURE,
  ];
  useGameStartFromBackend(triggerStartFromBackend, startGame, {
    onlyWhen: () => isStartableState(state, game02StartableStates),
  });

  // Backend → GAME02_ALIGNMENT_COMPLETE 수신 시 게임 시작, HEAD_POSE 수신 시 뷰용 yaw/pitch 갱신
  useEffect(() => {
    const unsub = backendWsService.addMessageListener((msg) => {
      const name = msg.header?.name;
      if (name === BackendMessageName.GAME02_ALIGNMENT_COMPLETE) {
        startGame();
      } else if (name === BackendMessageName.HEAD_POSE) {
        const data = msg.data as { yaw?: number; pitch?: number; progress?: number };
        if (data != null && Number.isFinite(data.yaw) && Number.isFinite(data.pitch)) {
          const now = Date.now();
          console.log('[Game02] HEAD_POSE', { yaw: data.yaw, pitch: data.pitch, atMs: now, at: new Date(now).toISOString() });
          headPoseRef.current = { yaw: data.yaw!, pitch: data.pitch!, atMs: now };
          if (!prevPoseRef.current) prevPoseRef.current = { yaw: data.yaw!, pitch: data.pitch! };
          setHeadPoseStatus({
            connected: true,
            lastUpdate: now,
            yaw: data.yaw!,
            pitch: data.pitch!,
          });
        }
        if (data != null && typeof data.progress === 'number' && data.progress >= 0 && data.progress <= 1) {
          setAlignProgress(data.progress);
        }
      }
    });
    return () => { unsub(); };
  }, [startGame]);

  // 얼굴 정렬 화면 진입 시 진행 바 0으로 초기화
  useEffect(() => {
    if (state === Game02State.ALIGNING) setAlignProgress(0);
  }, [state]);

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
      let pitch = pose.pitch;

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
      className={`h-full w-full bg-black overflow-hidden relative selection:bg-indigo-500 ${isGameScreen ? 'flex flex-row' : 'flex flex-col items-center justify-center p-4'
        }`}
    >
      {/* 1. Intro Screen - Game02 Rule 배경 + 게임 시작 버튼 영역 클릭 */}
      {state === Game02State.INTRO && (
        <div className="absolute inset-0 z-10 flex flex-col">
          {/* 배경 이미지 */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${ruleBgImg})` }}
          />
          {/* 게임 시작 버튼 클릭 → 얼굴 정렬 UI로 진입 후 정렬 완료 시 게임 시작 */}
          <button
            type="button"
            onClick={requestGameStartWithAlignment}
            className="absolute left-[40%] right-[40%] top-[85%] h-[12%] cursor-pointer flex items-center justify-center"
            aria-label="게임 시작"
          >
            {/* 눌러서 시작한다는 느낌의 투명 원 펄스 효과 */}
            <span
              className="absolute w-24 h-24 rounded-full border-4 border-white/40 animate-game02-start-pulse pointer-events-none"
              aria-hidden
            />
            <span
              className="absolute w-20 h-20 rounded-full border-2 border-indigo-400/50 animate-game02-start-pulse pointer-events-none"
              style={{ animationDelay: '0.4s' }}
              aria-hidden
            />
          </button>
          {generationError && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-3xl text-left rounded-[2rem] border border-rose-500/40 bg-zinc-900/80 p-6 backdrop-blur-2xl shadow-2xl z-20">
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

      {/* 2. Aligning Screen - vision + 스캔 박스 + "화면에 3초이상 얼굴을 고정해주세요" */}
      {state === Game02State.ALIGNING && (
        <div className="absolute inset-0 z-10 flex flex-col bg-slate-900">
          <div className="flex-1 relative grid grid-cols-[1fr_400px] min-h-0">
            <div className="relative bg-black overflow-hidden flex items-center justify-center">
              {alignHasFrame ? (
                <div className="w-full h-full relative">
                  <canvas
                    ref={alignCanvasRef}
                    className="w-full h-full object-cover"
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-[400px] mb-3">
                      <div className="h-2 bg-zinc-700/80 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-150 ease-out"
                          style={{ width: `${Math.round(alignProgress * 100)}%` }}
                        />
                      </div>
                      <p className="text-center text-xs text-zinc-500 mt-1">3초 유지 (100%)</p>
                    </div>
                    <div className="relative w-[400px] h-[400px] border-4 border-indigo-500/60 rounded-[2rem]">
                      <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-400 rounded-tl-2xl" />
                      <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl" />
                      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl" />
                      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 border-4 border-slate-600 border-t-indigo-500 rounded-full animate-spin mb-6" />
                  <p className="text-xl text-slate-400">카메라 연결 대기 중...</p>
                </div>
              )}
            </div>
            <div className="border-l border-white/10 p-12 flex flex-col justify-center">
              <h2 className="text-4xl font-black text-white mb-6 tracking-tight">
                얼굴을 맞춰주세요
              </h2>
              <p className="text-2xl text-indigo-300 font-bold mb-8">
                화면에 3초이상 얼굴을 고정해주세요
              </p>
              <p className="text-slate-400 text-lg">
                로봇이 카메라를 맞춘 뒤 게임이 시작됩니다.
              </p>
              {SETTINGS.DEBUG_MODE && (
                <div className="mt-8 rounded-[2rem] bg-zinc-900/60 border border-white/10 p-5">
                  <p className="text-sm font-black text-zinc-500 mb-2 italic">
                    헤드 포즈
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${headPoseStatus.connected
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
                      <div>Pitch: {headPoseStatus.pitch.toFixed(1)}°</div>
                      {headPoseStatus.lastUpdate != null && (
                        <div className="text-zinc-500 mt-1">
                          {Math.round((Date.now() - headPoseStatus.lastUpdate) / 1000)}초 전
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Generating Screen */}
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
                  className={`text-7xl font-black font-mono leading-none ${timeLeft < 30
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
                    className={`w-3 h-3 rounded-full ${headPoseStatus.connected
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
                    <div>Pitch: {headPoseStatus.pitch.toFixed(1)}°</div>
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
                  className={`absolute top-0 left-0 max-w-none max-h-none select-none ${state === Game02State.VERIFYING ? 'brightness-50 blur-sm' : ''
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
