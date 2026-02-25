import React from 'react';

export interface Game01IdleViewProps {
  hypeText: string;
  hypeKey: number;
}

/** 대기 상태(idle): "준비됐어?" 등 반투명 큰 텍스트 */
const Game01IdleView: React.FC<Game01IdleViewProps> = ({ hypeText, hypeKey }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
    <div
      key={hypeKey}
      className="font-arcade-kr transition-all duration-300 drop-shadow-[0_0_50px_rgba(0,0,0,1)] text-center text-5xl md:text-8xl opacity-30 tracking-widest"
    >
      {hypeText}
    </div>
  </div>
);

export default Game01IdleView;
