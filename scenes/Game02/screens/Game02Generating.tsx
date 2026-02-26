/**
 * Game02 시나리오 생성 중 로딩 화면
 */

import React from 'react';

const Game02Generating: React.FC = () => (
  <div className="text-center z-10 animate-game02-fade-in">
    <div className="w-24 h-24 border-4 border-indigo-500 border-t-transparent rounded-full animate-game02-spin mx-auto mb-8" />
    <h2 className="text-5xl font-black mb-2 tracking-tighter italic text-white">
      준비 중...
    </h2>
  </div>
);

export default Game02Generating;
