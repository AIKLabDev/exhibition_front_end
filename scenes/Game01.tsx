
import React from 'react';

interface Game01Props {
  onAction: (action: string) => void;
}

const Game01: React.FC<Game01Props> = ({ onAction }) => {
  const actions = [
    { id: 'ROCK', icon: '✊', label: 'ROCK' },
    { id: 'PAPER', icon: '✋', label: 'PAPER' },
    { id: 'SCISSORS', icon: '✌️', label: 'SCISSORS' },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900">
      <div className="text-center mb-16">
        <h2 className="text-6xl font-black mb-4 uppercase">Let's Play!</h2>
        <p className="text-2xl text-blue-300">Choose one to beat the opponent</p>
      </div>

      <div className="flex gap-10">
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={() => onAction(act.id)}
            className="flex flex-col items-center justify-center w-[350px] h-[350px] bg-slate-800 rounded-full border-8 border-white/5 hover:border-blue-500 hover:bg-slate-700 transition-all active:scale-90"
          >
            <span className="text-[120px] mb-4 leading-none">{act.icon}</span>
            <span className="text-3xl font-black tracking-widest">{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Game01;
