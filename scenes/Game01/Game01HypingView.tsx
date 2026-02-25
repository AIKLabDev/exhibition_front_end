import React from 'react';

export interface Game01HypingViewProps {
  hypeText: string;
  hypeKey: number;
}

/** 카운트다운 상태(hyping): "가위" → "바위" → "보" 큰 텍스트 */
const Game01HypingView: React.FC<Game01HypingViewProps> = ({ hypeText, hypeKey }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
    <div
      key={hypeKey}
      className="font-arcade-kr transition-all duration-300 drop-shadow-[0_0_50px_rgba(0,0,0,1)] text-center text-7xl md:text-[12rem] text-yellow-400 animate-text-impact text-glow-yellow"
    >
      {hypeText}
    </div>
  </div>
);

export default Game01HypingView;
