/**
 * CAPTURE Scene — 얼굴 촬영 (스케치/레이저 각인용)
 *
 * 레이아웃: 전체 화면 배경 위에 카메라 액자(고정 크기)를 중앙 배치,
 *           우측에 안내+카운트다운 패널을 absolute 오버레이.
 * 카메라는 object-contain으로 잘림 없이 전체가 보인다.
 *
 * 흐름: countdown(10→1) → flash(0.35s) + SKETCH_CAPTURE(Python) + FACE_CAPTURE_COMPLETED(C++ 백엔드) → done(로딩 오버레이)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useCameraFrameCanvas } from '../../hooks/useCameraFrameCanvas';
import { getVisionWsService } from '../../services/visionWebSocketService';
import { backendWsService } from '../../services/backendWebSocketService';
import { UIEventName } from '../../protocol';
import './Capture.css';

type CapturePhase = 'countdown' | 'flash' | 'done';

const COUNTDOWN_START = 10;
const COUNTDOWN_INTERVAL_MS = 1000;
const FLASH_DURATION_MS = 350;

/** 카메라 액자 크기(px). 2560x720 디스플레이 기준으로 여유 있게 배치 */
const FRAME_WIDTH_PX = 1250;
const FRAME_HEIGHT_PX = 720;

const Capture: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState<number>(COUNTDOWN_START);
  const [phase, setPhase] = useState<CapturePhase>('countdown');

  const { hasFrame } = useCameraFrameCanvas(canvasRef, { enabled: true });

  useEffect(() => {
    if (phase !== 'countdown') return;

    const id = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setPhase('flash');
          return 0;
        }
        return prev - 1;
      });
    }, COUNTDOWN_INTERVAL_MS);

    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'flash') return;

    getVisionWsService().sendSketchCapture();
    backendWsService.sendCommand(UIEventName.FACE_CAPTURE_COMPLETED, {});
    console.log('[Capture] SKETCH_CAPTURE + FACE_CAPTURE_COMPLETED 전송 완료');

    const t = setTimeout(() => {
      setPhase('done');
    }, FLASH_DURATION_MS);

    return () => clearTimeout(t);
  }, [phase]);

  const showCountdown = phase === 'countdown' && count >= 1;
  const showFlash = phase === 'flash';

  return (
    <div className="h-full relative w-full bg-slate-950 overflow-hidden">
      {/* 카메라 영역: 화면 중앙에 고정 크기 액자, object-contain으로 잘림 없이 표시 */}
      <section
        className="absolute inset-0 flex items-center justify-center p-6"
        aria-label="Camera preview"
      >
        <div
          className="relative shrink-0"
          style={{ width: FRAME_WIDTH_PX, height: FRAME_HEIGHT_PX }}
        >
          <div className="absolute inset-0 flex items-center justify-center rounded-md overflow-hidden bg-black border-2 border-white/20 p-1.5">
            {hasFrame ? (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain scale-x-[-1]"
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 w-full h-full">
                <div className="w-16 h-16 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin mb-6" />
                <p className="text-xl font-bold uppercase tracking-widest">카메라 연결 대기 중...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 우측: 안내 + 카운트다운 패널 (absolute 오버레이) */}
      <aside
        className="absolute top-0 right-0 bottom-0 w-[620px] flex flex-col justify-center px-12 py-10 bg-slate-900/95 border-l border-white/10 z-10"
        aria-label="Capture instructions"
      >
        <h2 className="text-4xl font-black text-white/95 uppercase tracking-wider mb-3">
          얼굴 촬영
        </h2>
        <p className="text-slate-400 text-xl leading-relaxed mb-5 min-w-0 break-words">
          촬영한 얼굴을 레이저 가공용<br />
          라인아트로 만들어 드려요.
        </p>
        <p className="text-2xl font-bold text-emerald-400 mb-10 tracking-wide">
          화면을 봐주세요
        </p>

        {showCountdown ? (
          <div className="flex flex-col items-center mb-8">
            <span
              key={count}
              className="tabular-nums leading-none font-black text-[200px] text-white animate-capture-count-pop"
              aria-live="polite"
            >
              {count}
            </span>
            <span className="mt-2 font-medium text-base text-slate-500">
              초 남았습니다
            </span>
          </div>
        ) : phase === 'done' ? (
          <div className="flex flex-col items-center mb-8">
            <span className="text-4xl font-bold text-emerald-400 uppercase tracking-widest">캡처 완료</span>
            <span className="text-base text-slate-500 mt-2">처리 중...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base text-slate-500 uppercase tracking-widest">Live</span>
          </div>
        )}
      </aside>

      {/* 플래시 효과 */}
      {showFlash && (
        <div
          className="absolute inset-0 bg-white pointer-events-none animate-capture-flash z-20"
          aria-hidden
        />
      )}

      {/* done: 로딩 오버레이 */}
      {phase === 'done' && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-24 h-24 border-4 border-slate-600 border-t-emerald-400 rounded-full animate-spin mb-8" />
          <p className="text-2xl font-bold text-white mb-2">캡처 완료</p>
          <p className="text-slate-400 text-lg">이미지 생성 중입니다. 잠시만 기다려 주세요.</p>
        </div>
      )}
    </div>
  );
};

export default Capture;
