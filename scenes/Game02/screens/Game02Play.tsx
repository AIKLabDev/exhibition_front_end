/**
 * Game02 본게임 화면: 사이드바(타겟, 타이머, 미니맵, 디버그) + 뷰포트(드래그/클릭)
 */

import React from 'react';
import { Game02State, GameScenario } from '../Game02.types';
import { SETTINGS } from '../constants';
import ResultOverlay from '../ResultOverlay';

export interface Game02PlayProps {
  scenario: GameScenario;
  targetCropUrl: string | null;
  state: Game02State;
  timeLeft: number;
  viewTopLeft: { x: number; y: number };
  viewWindow: { w: number; h: number };
  viewPoseStatus: {
    connected: boolean;
    lastUpdate: number | null;
    X: number | null;
    Y: number | null;
  };
  lastClick: { x: number; y: number } | null;
  reasoning: string;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (seconds: number) => string;
  onViewportPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onViewportPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onViewportPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onViewportPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const Game02Play: React.FC<Game02PlayProps> = ({
  scenario,
  targetCropUrl,
  state,
  timeLeft,
  viewTopLeft,
  viewWindow,
  viewPoseStatus,
  lastClick,
  reasoning,
  viewportRef,
  formatTime,
  onViewportPointerDown,
  onViewportPointerMove,
  onViewportPointerUp,
  onViewportPointerCancel,
}) => (
  <div className="w-full h-full flex flex-row min-h-0 animate-game02-fade-in">
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
          <p className="text-sm font-black text-zinc-500 mb-2 italic">남은시간</p>
          <div
            className={`text-7xl font-black font-mono leading-none ${
              timeLeft < 30 ? 'text-rose-500 animate-game02-timer-warning' : 'text-white'
            }`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="relative w-[210px] aspect-video rounded-[1.5rem] overflow-hidden border border-white/15 bg-black/40 backdrop-blur-xl shadow-2xl">
          <img
            src={`data:image/png;base64,${scenario.sceneImageBase64}`}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-black/35" aria-hidden />
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

      {SETTINGS.DEBUG_MODE && (
        <div className="rounded-[2rem] bg-zinc-900/60 border border-white/10 p-5">
          <p className="text-sm font-black text-zinc-500 mb-2 italic">헤드 포즈</p>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                viewPoseStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-bold text-white">
              {viewPoseStatus.connected ? '연결됨' : '연결 안됨'}
            </span>
          </div>
          {viewPoseStatus.X !== null && viewPoseStatus.Y !== null && (
            <div className="text-xs text-zinc-400 font-mono">
              <div>X: {viewPoseStatus.X.toFixed(0)} mm</div>
              <div>Y: {viewPoseStatus.Y.toFixed(0)} mm</div>
              {viewPoseStatus.lastUpdate && (
                <div className="text-zinc-500 mt-1">
                  {Math.round((Date.now() - viewPoseStatus.lastUpdate) / 1000)}초 전
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {!SETTINGS.DEBUG_MODE && <div className="flex-1" />}
    </aside>

    <main className="flex-1 min-w-0 h-full relative overflow-hidden bg-black">
      <img
        src={`data:image/png;base64,${scenario.sceneImageBase64}`}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-35"
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <div className="relative w-full h-full">
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

          {state === Game02State.VERIFYING && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
              <div className="w-20 h-20 text-white animate-game02-bounce mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="text-4xl font-black text-white drop-shadow-2xl">분석 중...</p>
            </div>
          )}

          {state === Game02State.PLAYING && reasoning && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none">
              <div className="animate-game02-pop select-none">
                <h2 className="font-korean-dynamic text-[7rem] md:text-[10rem] leading-none drop-shadow-[0_20px_20px_rgba(0,0,0,0.6)] text-orange-500">
                  거기가 아닙니다!
                </h2>
              </div>
            </div>
          )}

          <ResultOverlay state={state} />
        </div>
      </div>
    </main>
  </div>
);

export default Game02Play;
