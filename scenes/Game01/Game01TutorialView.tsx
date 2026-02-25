import React from 'react';
import { GAME01_MESSAGES, HAND_EMOJIS } from './constants';

export interface Game01TutorialViewProps {
  onStart: () => void;
}

/** 제목은 가운데 크게, 그 아래 반으로 나눠 왼쪽=1,2,3 / 오른쪽=이모지+게임 시작하기 */
const Game01TutorialView: React.FC<Game01TutorialViewProps> = ({ onStart }) => (
  <div className="absolute inset-0 z-50 flex flex-col bg-slate-950/98">
    {/* 상단: 가위바위보 튜토리얼 - 가운데 크게 */}
    <h2 className="font-scifi-kr text-6xl md:text-7xl text-white text-center pt-12 pb-8 tracking-wide drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
      {GAME01_MESSAGES.tutorial.title}
    </h2>

    {/* 그 아래 반으로 나눔 */}
    <div className="flex-1 flex min-h-0">
      {/* 왼쪽: 1, 2, 3 설명 */}
      <div className="w-1/2 flex flex-col items-center justify-center px-12">
        <ul className="w-full max-w-2xl space-y-8 text-left">
          {GAME01_MESSAGES.tutorial.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-6 font-sans text-3xl md:text-4xl text-slate-100 leading-snug">
              <span className="flex-shrink-0 w-14 h-14 rounded-full bg-blue-500/40 border-2 border-blue-400/60 flex items-center justify-center text-blue-200 text-2xl font-bold">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 오른쪽: 이모지 + 게임 시작하기 */}
      <div className="w-1/2 flex flex-col items-center justify-center gap-12 px-12">
        <div className="flex items-center gap-14 text-slate-300">
          <span className="flex flex-col items-center gap-2">
            <span className="text-7xl md:text-8xl opacity-95">{HAND_EMOJIS.scissors}</span>
            <span className="text-3xl md:text-4xl font-semibold">가위</span>
          </span>
          <span className="flex flex-col items-center gap-2">
            <span className="text-7xl md:text-8xl opacity-95">{HAND_EMOJIS.rock}</span>
            <span className="text-3xl md:text-4xl font-semibold">바위</span>
          </span>
          <span className="flex flex-col items-center gap-2">
            <span className="text-7xl md:text-8xl opacity-95">{HAND_EMOJIS.paper}</span>
            <span className="text-3xl md:text-4xl font-semibold">보</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="px-16 py-5 rounded-full border-2 border-green-500/60 bg-green-600/30 font-scifi-kr text-4xl tracking-wider text-green-300 hover:bg-green-600/50 hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(34,197,94,0.4)]"
        >
          {GAME01_MESSAGES.tutorial.startButton}
        </button>
      </div>
    </div>
  </div>
);

export default Game01TutorialView;
