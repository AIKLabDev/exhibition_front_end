
import React from 'react';

interface WelcomeProps {
  onStart: () => void;
  text?: string;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart, text }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950">
      <h1 className="text-8xl font-black mb-6 tracking-tight drop-shadow-lg text-center">
        {text || "WELCOME TO EXHIBITION"}
      </h1>
      <p className="text-3xl text-blue-200/60 mb-16 tracking-wide">
        Touch the screen to begin your experience
      </p>
      
      <button 
        onClick={onStart}
        className="group relative px-20 py-10 bg-blue-600 hover:bg-blue-500 rounded-[2rem] transition-all active:scale-95 shadow-[0_20px_50px_rgba(37,99,235,0.3)]"
      >
        <span className="relative z-10 text-5xl font-black tracking-widest uppercase text-white">
          START EXPERIENCE
        </span>
        <div className="absolute inset-0 bg-white/20 blur-xl group-hover:blur-2xl transition-all rounded-[2rem]" />
      </button>
    </div>
  );
};

export default Welcome;
