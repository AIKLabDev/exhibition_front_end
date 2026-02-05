
import React from 'react';

interface LaserProcessProps {
  progress: number;
  label: string;
}

const LaserProcess: React.FC<LaserProcessProps> = ({ progress, label }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900 relative">
      {/* Background Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="w-full h-1 bg-red-500 absolute animate-[engrave_4s_linear_infinite]" />
        <div className="w-1 h-full bg-red-500 absolute animate-[engrave_3s_linear_infinite_reverse]" />
      </div>

      <div className="relative z-10 text-center">
        <h2 className="text-7xl font-black mb-8 uppercase text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
          LASER ENGRAVING
        </h2>
        <p className="text-3xl text-slate-400 mb-16 uppercase tracking-[0.2em] font-bold">
          {label || "Engraving in progress... Do not touch"}
        </p>

        <div className="w-[1200px] h-20 bg-black rounded-3xl overflow-hidden border-4 border-slate-700 p-2 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-red-600 to-orange-400 rounded-2xl transition-all duration-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        
        <div className="mt-8 flex justify-between w-[1200px] px-2 text-2xl font-mono text-slate-500">
          <span>0%</span>
          <span className="text-4xl font-black text-white">{Math.round(progress * 100)}%</span>
          <span>100%</span>
        </div>
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
