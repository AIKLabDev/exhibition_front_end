/**
 * Game02 안내 화면: 찾을 이미지 3초 표시 후 본게임(PLAYING) 진입
 */

import React from 'react';

export interface Game02AnnouncingProps {
  targetCropUrl: string;
}

const Game02Announcing: React.FC<Game02AnnouncingProps> = ({ targetCropUrl }) => (
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
);

export default Game02Announcing;
