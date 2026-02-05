
import React from 'react';

interface PickGiftProps {
  progress: number;
  label: string;
}

const PickGift: React.FC<PickGiftProps> = ({ progress, label }) => {
  // Determine phase based on progress
  const isPicking = progress < 0.5;
  const stageProgress = isPicking ? progress * 2 : (progress - 0.5) * 2;
  
  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900 p-20">
      <div className="w-full max-w-7xl">
        <div className="flex justify-between items-end mb-16">
          <div className="text-left">
            <h2 className="text-7xl font-black uppercase tracking-tighter mb-4 italic">
              Robot <span className="text-blue-500">Operation</span>
            </h2>
            <p className="text-3xl text-white/50 font-bold uppercase tracking-widest">
              {label || (isPicking ? 'Fetching your gift from storage...' : 'Placing your gift on delivery tray...')}
            </p>
          </div>
          <div className="text-9xl font-black text-blue-500/20 italic">
            {Math.round(progress * 100)}%
          </div>
        </div>

        {/* Visual Workflow */}
        <div className="relative h-64 bg-black/40 rounded-[3rem] border-4 border-white/5 flex items-center px-12 overflow-hidden shadow-inner">
          {/* Track Line */}
          <div className="absolute top-1/2 left-24 right-24 h-2 bg-white/10 -translate-y-1/2" />
          
          {/* Start Point */}
          <div className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center border-4 transition-colors ${isPicking ? 'border-blue-500 bg-blue-500' : 'border-blue-500 bg-blue-500/20'}`}>
            <span className="text-4xl">📦</span>
            <div className="absolute -top-12 whitespace-nowrap font-black uppercase text-sm tracking-widest">Storage</div>
          </div>

          {/* Robot Arm representation */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex items-center transition-all duration-300 ease-out"
            style={{ left: `calc(6rem + ${progress * (100 - 12)}%)` }}
          >
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] rotate-45 border-4 border-white/20">
              <span className="-rotate-45 text-4xl">🦾</span>
            </div>
            {progress > 0 && progress < 1 && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-sm font-black px-4 py-1 rounded-full whitespace-nowrap animate-pulse">
                ROBOT ACTIVE
              </div>
            )}
          </div>

          {/* Delivery Point */}
          <div className={`relative z-10 ml-auto w-24 h-24 rounded-full flex items-center justify-center border-4 transition-colors ${progress >= 1.0 ? 'border-green-500 bg-green-500' : 'border-white/20 bg-white/5'}`}>
            <span className="text-4xl">{progress >= 1.0 ? '✅' : '📥'}</span>
            <div className="absolute -top-12 whitespace-nowrap font-black uppercase text-sm tracking-widest">Delivery</div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 flex gap-12 justify-center">
           <div className={`flex items-center gap-4 text-2xl font-bold uppercase ${isPicking ? 'text-white' : 'text-white/20'}`}>
             <div className={`w-6 h-6 rounded-full ${isPicking ? 'bg-blue-500' : 'bg-white/10'}`} />
             Phase 1: Retrieval
           </div>
           <div className={`flex items-center gap-4 text-2xl font-bold uppercase ${!isPicking && progress < 1 ? 'text-white' : 'text-white/20'}`}>
             <div className={`w-6 h-6 rounded-full ${!isPicking && progress < 1 ? 'bg-blue-500' : 'bg-white/10'}`} />
             Phase 2: Placement
           </div>
        </div>
      </div>
    </div>
  );
};

export default PickGift;
