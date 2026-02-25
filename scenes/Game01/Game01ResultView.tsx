import React from 'react';
import type { RpsGameState, RpsResult } from './Game01.types';

export interface Game01ResultViewProps {
  game: RpsGameState;
  hypeKey: number;
}

function resultTextClass(lastResult: RpsResult | null): string {
  const base = 'font-arcade-kr transition-all duration-300 drop-shadow-[0_0_50px_rgba(0,0,0,1)] text-center text-5xl md:text-8xl animate-result-pop ';
  if (lastResult === 'win') return base + 'text-green-400 text-glow-green';
  if (lastResult === 'lose') return base + 'text-red-500 text-glow-red';
  if (lastResult === 'draw') return base + 'text-blue-400 text-glow-blue';
  return base;
}

/** 결과 상태(result): 승리/패배/비김 텍스트 + AI 코멘트 말풍선 */
const Game01ResultView: React.FC<Game01ResultViewProps> = ({ game, hypeKey }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
    <div key={hypeKey} className={resultTextClass(game.lastResult)}>
      {game.hypeText}
    </div>
    <div className="mt-28 font-scifi-kr text-lg italic text-white max-w-xl text-center px-10 transition-all duration-1000 delay-300 opacity-100 translate-y-0 scale-110">
      <div className="bg-black/80 border border-white/20 px-8 py-4 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t-white/30">
        "{game.aiComment}"
      </div>
    </div>
  </div>
);

export default Game01ResultView;
