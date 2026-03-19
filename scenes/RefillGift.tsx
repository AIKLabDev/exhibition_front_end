/**
 * REFILL_GIFT Scene — 상품 보충 대기
 * 백엔드 EXHIBITION_SET_SCENE(REFILL_GIFT) 수신 시 표시.
 */

import React from 'react';

export interface RefillGiftProps {
  /** 백엔드 SET_SCENE text 필드 (선택) */
  text?: string;
}

const RefillGift: React.FC<RefillGiftProps> = ({ text }) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 relative overflow-hidden">
    {/* subtle grid / ambient */}
    <div
      className="absolute inset-0 opacity-[0.06] pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(rgba(59,130,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-slate-950 pointer-events-none" />

    <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-6xl">
      <div className="mb-10 flex items-center justify-center">
        <span className="text-8xl md:text-9xl animate-pulse" aria-hidden>
          📦
        </span>
        <div className="mx-6 h-24 w-1 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400 opacity-80 animate-pulse" aria-hidden />
        <span className="text-8xl md:text-9xl" aria-hidden>
          ➕
        </span>
      </div>

      <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tight text-white mb-6 drop-shadow-[0_0_40px_rgba(59,130,246,0.35)]">
        상품 <span className="text-blue-400">보충</span> 중입니다
      </h1>

      <p className="text-xl md:text-2xl text-slate-500 font-semibold uppercase tracking-[0.25em] mb-12">
        잠시만 기다려 주세요
      </p>

      {text ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 backdrop-blur-sm">
          <p className="text-lg md:text-xl text-emerald-300/90 font-bold whitespace-pre-line">{text}</p>
        </div>
      ) : null}

      {/* loading dots */}
      <div className="mt-16 flex gap-4" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-4 w-4 rounded-full bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.8)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    </div>
  </div>
);

export default RefillGift;
