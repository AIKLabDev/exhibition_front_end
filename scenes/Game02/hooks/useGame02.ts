/**
 * Game02 상태·효과·핸들러 훅
 * 뷰포트, VIEW_POSE, 타이머, 드래그/클릭 처리 등
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Game02State, GameScenario } from '../Game02.types';
import {
  VIEW_ZOOM,
  DEFAULT_SCENE_ASPECT,
  GAME_TIME_LIMIT,
  ANNOUNCING_DURATION,
  GAME02_VIEW_MODE,
  VIEW_MM_RANGE_X,
  VIEW_MM_RANGE_Y,
  VIEW_MM_DEADZONE,
  VIEW_POSE_SMOOTH_ALPHA,
  VIEW_POSE_STALE_MS,
} from '../constants';
import { generateLocalGameScenario } from '../localScenarioService';
import { backendWsService } from '../../../services/backendWebSocketService';
import { getVisionWsService } from '../../../services/visionWebSocketService';
import { BackendMessageName, UIEventName } from '../../../protocol';
import {
  useGameStartFromBackend,
  isStartableState,
  useResetResultReportRefWhenEnteringRound,
} from '../../../hooks/useGameStartFromBackend';
import {
  clamp,
  computeViewWindow,
  normalizeError,
  isClickOnTarget,
  isViewContainingTarget,
  formatTime,
} from '../utils';

const DEFAULT_CENTER_TOP_LEFT = {
  x: (1 - 1 / VIEW_ZOOM) / 2,
  y: (1 - 1 / VIEW_ZOOM) / 2,
};

/** public/sounds/game02/ — 정답/오답 1회 효과음 (BGM과 별도 인스턴스) */
const GAME02_SFX = {
  success: '/sounds/game02/success.wav',
  failure: '/sounds/game02/failure.wav',
} as const;

function playGame02Sfx(kind: keyof typeof GAME02_SFX): void {
  try {
    const audio = new Audio(GAME02_SFX[kind]);
    audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function useGame02(
  onGameResult: (result: 'WIN' | 'LOSE', score: number) => void,
  triggerStartFromBackend: number
) {
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
  const [pauseOverlayVisible, setPauseOverlayVisible] = useState(false);
  const [rockProgress, setRockProgress] = useState(0); // 0~100, Python GAME02_PROGRESS_ANSWER
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultReportedRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const prevRockProgressRef = useRef(0);
  const scenarioRef = useRef(scenario);
  const viewTopLeftRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewWindowRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 });
  const stateRef = useRef(state);

  const [viewportAspect, setViewportAspect] = useState<number>(DEFAULT_SCENE_ASPECT);
  /** Fix: 씬 3×3 그리드와 맞추기 위해 정규화 영역을 1/VIEW_ZOOM × 1/VIEW_ZOOM 고정. Track: 기존 화면비 맞춤 computeViewWindow */
  const viewWindow = useMemo(() => {
    if (GAME02_VIEW_MODE === 'fix') {
      const s = 1 / VIEW_ZOOM;
      return { w: s, h: s };
    }
    return computeViewWindow(viewportAspect, DEFAULT_SCENE_ASPECT);
  }, [viewportAspect]);
  const centerTopLeft = useMemo(
    () => ({ x: (1 - viewWindow.w) / 2, y: (1 - viewWindow.h) / 2 }),
    [viewWindow.w, viewWindow.h]
  );

  const [viewTopLeft, setViewTopLeft] = useState<{ x: number; y: number }>(
    DEFAULT_CENTER_TOP_LEFT
  );

  scenarioRef.current = scenario;
  viewTopLeftRef.current = viewTopLeft;
  viewWindowRef.current = viewWindow;
  stateRef.current = state;

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

  const viewPoseRef = useRef<{
    X: number;
    Y: number;
    atMs: number;
    /** 백엔드 Fix 그리드: 로봇 Y/Z 평면 반폭(mm). 없으면 Track 기본 VIEW_MM_RANGE_* */
    halfRangeX?: number;
    halfRangeY?: number;
  } | null>(null);
  const [viewPoseStatus, setViewPoseStatus] = useState<{
    connected: boolean;
    lastUpdate: number | null;
    X: number | null;
    Y: number | null;
  }>({
    connected: false,
    lastUpdate: null,
    X: null,
    Y: null,
  });

  const isGameScreen =
    state === Game02State.PLAYING ||
    state === Game02State.VERIFYING ||
    state === Game02State.SUCCESS ||
    state === Game02State.FAILURE;

  const startGame = useCallback(async () => {
    getVisionWsService().sendGame02MainGameStart();
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

  const onIntroStartClick = useCallback(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (!scenario) return;
    setViewTopLeft(centerTopLeft);
    setLastClick(null);
  }, [centerTopLeft, scenario]);

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

  useEffect(() => {
    setViewTopLeft((prev) => ({
      x: clamp(prev.x, 0, 1 - viewWindow.w),
      y: clamp(prev.y, 0, 1 - viewWindow.h),
    }));
  }, [viewWindow.h, viewWindow.w]);

  // Python Vision WebSocket: GAME02_PAUSE 수신 시 PAUSE 오버레이 + 백엔드 일시정지. fix 뷰 모드에서는 무시(로봇 그리드만 사용)
  useEffect(() => {
    const unsubscribe = getVisionWsService().onGame02Pause(() => {
      if (GAME02_VIEW_MODE === 'fix') return;
      setPauseOverlayVisible(true);
      backendWsService.sendCommand(UIEventName.GAME02_PAUSE, {});
    });
    return () => { unsubscribe(); };
  }, []);

  // Python Vision WebSocket: GAME02_PROGRESS_ANSWER(0~100) 수신. 100 도달 시 현재 뷰에 정답 포함 여부로 success/fail
  useEffect(() => {
    const unsubscribe = getVisionWsService().onGame02ProgressAnswer((progress: number) => {
      setRockProgress(progress);
      if (progress >= 100 && prevRockProgressRef.current < 100 && stateRef.current === Game02State.PLAYING) {
        const s = scenarioRef.current;
        const vt = viewTopLeftRef.current;
        const vw = viewWindowRef.current;
        if (s && vt && vw) {
          const hit = isViewContainingTarget(s, vt, vw);
          if (hit) {
            playGame02Sfx('success');
            setState(Game02State.SUCCESS);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          } else {
            playGame02Sfx('failure');
            setReasoning('거기가 아닙니다!');
            setTimeout(() => setReasoning(''), 2000);
          }
        }
      }
      prevRockProgressRef.current = progress;
    });
    return () => { unsubscribe(); };
  }, []);

  // 씬/라운드 바뀔 때 rock progress 초기화
  useEffect(() => {
    if (state !== Game02State.PLAYING) {
      setRockProgress(0);
      prevRockProgressRef.current = 0;
    }
  }, [state]);

  useEffect(() => {
    if (state === Game02State.ANNOUNCING) {
      const timeout = setTimeout(() => {
        backendWsService.sendCommand('GAME02_MAINGAME_START', {});
        setState(Game02State.PLAYING);
      }, ANNOUNCING_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [state]);

  // Fix 모드: 「찾아라!」3초 안내(ANNOUNCING) 시작 시 백엔드가 그리드 (-1,-1)로 로봇 이동
  useEffect(() => {
    if (state !== Game02State.ANNOUNCING) return;
    if (GAME02_VIEW_MODE !== 'fix') return;
    backendWsService.sendCommand(UIEventName.GAME02_FIX_PLAY_VIEW_READY, {});
  }, [state]);

  // PLAYING일 때만 타이머 진행. PAUSE 오버레이 표시 중에는 멈춤 (Game04처럼)
  useEffect(() => {
    if (state === Game02State.PLAYING && !pauseOverlayVisible) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            playGame02Sfx('failure');
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
  }, [state, pauseOverlayVisible]);

  useEffect(() => {
    if (state === Game02State.SUCCESS && !resultReportedRef.current) {
      resultReportedRef.current = true;
      backendWsService.sendCommand('GAME02_IDLE', {});
      onGameResult('WIN', timeLeft);
    } else if (state === Game02State.FAILURE && !resultReportedRef.current) {
      resultReportedRef.current = true;
      backendWsService.sendCommand('GAME02_IDLE', {});
      onGameResult('LOSE', timeLeft);
    }
  }, [state, timeLeft, onGameResult]);

  useResetResultReportRefWhenEnteringRound(
    state === Game02State.GENERATING ||
    state === Game02State.ANNOUNCING ||
    state === Game02State.PLAYING,
    resultReportedRef
  );

  // Game02 씬을 벗어날 때(언마운트) 백엔드에 대기 상태 알림
  useEffect(() => {
    return () => {
      backendWsService.sendCommand('GAME02_IDLE', {});
    };
  }, []);

  // INTRO는 제외: 백엔드 GAME_START(체인 진입 등)가 와도 튜토리얼에서 "게임 시작" 누르기 전엔 본게임으로 가지 않음
  const game02StartableStates: readonly Game02State[] = [
    Game02State.SUCCESS,
    Game02State.FAILURE,
  ];
  useGameStartFromBackend(triggerStartFromBackend, startGame, {
    onlyWhen: () => isStartableState(state, game02StartableStates),
  });

  useEffect(() => {
    const unsub = backendWsService.addMessageListener((msg) => {
      const name = msg.header?.name;
      if (name === BackendMessageName.VIEW_POSE) {
        const data = msg.data as {
          X?: number;
          Y?: number;
          PosX?: number;
          PosY?: number;
          viewRangeHalfX?: number;
          viewRangeHalfY?: number;
        };
        if (data != null && Number.isFinite(data.X) && Number.isFinite(data.Y)) {
          const now = Date.now();
          viewPoseRef.current = {
            X: data.X!,
            Y: data.Y!,
            atMs: now,
            halfRangeX: Number.isFinite(data.viewRangeHalfX) ? data.viewRangeHalfX : undefined,
            halfRangeY: Number.isFinite(data.viewRangeHalfY) ? data.viewRangeHalfY : undefined,
          };
          setViewPoseStatus({
            connected: true,
            lastUpdate: now,
            X: data.X!,
            Y: data.Y!,
          });
        }
      }
    });
    return () => { unsub(); };
  }, []);

  // VIEW_POSE(X,Y mm)로 뷰 이동 — track / fix 동일. PAUSE 오버레이 중에는 뷰도 멈춤
  useEffect(() => {
    if (state !== Game02State.PLAYING || pauseOverlayVisible) return;
    let raf = 0;
    const tick = () => {
      raf = window.requestAnimationFrame(tick);
      if (dragRef.current.active) return;
      const pose = viewPoseRef.current;
      if (!pose) return;
      const age = Date.now() - pose.atMs;
      if (age > VIEW_POSE_STALE_MS) {
        if (viewPoseStatus.connected) {
          setViewPoseStatus((prev) => ({ ...prev, connected: false }));
        }
        return;
      }
      const maxX = 1 - viewWindow.w;
      const maxY = 1 - viewWindow.h;
      const rangeX = pose.halfRangeX ?? VIEW_MM_RANGE_X;
      const rangeY = pose.halfRangeY ?? VIEW_MM_RANGE_Y;
      const nx = Math.abs(pose.X) < VIEW_MM_DEADZONE ? 0 : clamp(-pose.X / rangeX, -1, 1);
      const ny = Math.abs(pose.Y) < VIEW_MM_DEADZONE ? 0 : clamp(pose.Y / rangeY, -1, 1);
      const targetX = clamp(maxX / 2 + nx * (maxX / 2), 0, maxX);
      const targetY = clamp(maxY / 2 + ny * (maxY / 2), 0, maxY);
      setViewTopLeft((prev) => {
        const newX = prev.x + (targetX - prev.x) * VIEW_POSE_SMOOTH_ALPHA;
        const newY = prev.y + (targetY - prev.y) * VIEW_POSE_SMOOTH_ALPHA;
        return { x: newX, y: newY };
      });
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [state, pauseOverlayVisible, viewWindow.h, viewWindow.w, viewPoseStatus.connected]);

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
        playGame02Sfx('success');
        setState(Game02State.SUCCESS);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      } else {
        playGame02Sfx('failure');
        setReasoning('거기가 아닙니다!');
        setTimeout(() => setReasoning(''), 2000);
      }
    },
    [scenario, state, viewTopLeft.x, viewTopLeft.y, viewWindow.h, viewWindow.w]
  );

  const onViewportPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [state, scenario, viewTopLeft.x, viewTopLeft.y]
  );

  const onViewportPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [viewWindow.w, viewWindow.h]
  );

  const onViewportPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (d.pointerId !== e.pointerId) return;
      d.active = false;
      d.pointerId = null;
      if (!d.moved) {
        handleViewportClick(e.clientX, e.clientY);
      }
    },
    [handleViewportClick]
  );

  const onViewportPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (d.pointerId !== e.pointerId) return;
      d.active = false;
      d.pointerId = null;
    },
    []
  );

  /** PAUSE 터치 해제 시 오버레이 숨기고 백엔드에 GAME02_PAUSE_CANCEL, Python에 본게임 재시작 시그널 → 참여자 다시 fix */
  const handlePauseCancel = useCallback(() => {
    setPauseOverlayVisible(false);
    backendWsService.sendCommand(UIEventName.GAME02_PAUSE_CANCEL, {});
    getVisionWsService().sendGame02MainGameStart();
  }, []);

  return {
    state,
    scenario,
    targetCropUrl,
    generationError,
    timeLeft,
    lastClick,
    reasoning,
    viewportRef,
    viewWindow,
    viewTopLeft,
    viewPoseStatus,
    isGameScreen,
    startGame,
    onIntroStartClick,
    onViewportPointerDown,
    onViewportPointerMove,
    onViewportPointerUp,
    onViewportPointerCancel,
    formatTime,
    pauseOverlayVisible,
    handlePauseCancel,
    rockProgress,
  };
}
