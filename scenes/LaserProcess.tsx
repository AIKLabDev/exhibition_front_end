import React from 'react';

interface LaserProcessProps {
  /** 백엔드 PROGRESS_UPDATE용 (UI에는 표시하지 않음) */
  progress?: number;
  label?: string;
}

const LaserProcess: React.FC<LaserProcessProps> = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900 relative">
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="w-full h-1 bg-red-500 absolute animate-[engrave_4s_linear_infinite]" />
        <div className="w-1 h-full bg-red-500 absolute animate-[engrave_3s_linear_infinite_reverse]" />
      </div>

      <div className="relative z-10 text-center px-8">
        <h2 className="text-7xl font-black mb-10 uppercase text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
          LASER ENGRAVING
        </h2>
        <p className="text-4xl md:text-5xl text-slate-300 uppercase tracking-[0.25em] font-bold">
          PLEASE WAIT
        </p>
      </div>

      <style>{`
        @keyframes engrave {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(720px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LaserProcess;
