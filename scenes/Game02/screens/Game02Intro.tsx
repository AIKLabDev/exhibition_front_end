/**
 * Game02 인트로 화면: 룰 배경 + 게임 시작 버튼 + 에러 표시
 */

import React from 'react';
import ruleBgImg from '../../../images/Game02 Rule.png';

export interface Game02IntroProps {
  onStart: () => void;
  generationError: { message: string; detail?: string } | null;
}

const Game02Intro: React.FC<Game02IntroProps> = ({ onStart, generationError }) => (
  <div className="absolute inset-0 z-10 flex flex-col">
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${ruleBgImg})` }}
    />
    <button
      type="button"
      onClick={onStart}
      className="absolute left-[40%] right-[40%] top-[85%] h-[12%] cursor-pointer flex items-center justify-center"
      aria-label="게임 시작"
    >
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
        <p className="text-rose-300 font-black text-2xl mb-3">이미지 로드 실패</p>
        <pre className="text-rose-100/90 text-sm whitespace-pre-wrap break-words leading-relaxed">
          {generationError.message}
        </pre>
        {generationError.detail && (
          <details className="mt-4">
            <summary className="cursor-pointer text-zinc-300 font-bold">자세히 보기(로그)</summary>
            <pre className="mt-3 text-zinc-200 text-xs whitespace-pre-wrap break-words leading-relaxed">
              {generationError.detail}
            </pre>
          </details>
        )}
      </div>
    )}
  </div>
);

export default Game02Intro;
