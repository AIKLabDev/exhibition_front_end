/**
 * Game02 인트로 화면: 룰 배경 + GAME_START_COUNTDOWN 카운트다운 후 게임 시작 + 에러 표시
 */

import React from 'react';
import ruleBgImg from '../../../images/Game02 Rule.png';
import { useGameStartCountdown } from '../../../hooks/useGameStartCountdown';

export interface Game02IntroProps {
  onStart: () => void;
  generationError: { message: string; detail?: string } | null;
}

const Game02Intro: React.FC<Game02IntroProps> = ({ onStart, generationError }) => {
  const secondsLeft = useGameStartCountdown(onStart, true);

  return (
    <div className="absolute inset-0 z-10 flex flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${ruleBgImg})` }}
      />
      <div
        className="absolute left-[40%] right-[40%] top-[85%] h-[12%] flex items-center justify-center pointer-events-none select-none"
        aria-live="polite"
        aria-label={`게임 시작까지 ${secondsLeft}초`}
      >
        <span
          className="text-white font-black tabular-nums"
          style={{
            fontSize: 'clamp(3rem, 10vw, 8rem)',
            lineHeight: 1,
            textShadow: '0 0 24px rgba(0,0,0,0.9), 0 4px 32px rgba(0,0,0,0.8)',
          }}
        >
          {secondsLeft}
        </span>
      </div>
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
};

export default Game02Intro;
