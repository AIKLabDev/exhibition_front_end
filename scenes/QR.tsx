
import React, { useEffect, useState, useRef } from 'react';
import { wsService } from '../services/websocketService';
import { CameraFrameData } from '../types';

interface QRProps {
  onCancel: () => void;
  text?: string;
}

const QR: React.FC<QRProps> = ({ onCancel, text }) => {
  const [frame, setFrame] = useState<CameraFrameData | null>(null);
  const [lastFrameTime, setLastFrameTime] = useState<number>(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Subscribe to backend camera stream
    const unsubscribe = wsService.addFrameListener((data) => {
      setFrame(data);
      setLastFrameTime(Date.now());
    });

    // Ensure the cleanup function returns void as expected by useEffect.
    return () => { unsubscribe(); };
  }, []);

  // Check if stream is stale (older than 2 seconds)
  const isStreamActive = Date.now() - lastFrameTime < 2000 && frame !== null;

  return (
    <div className="h-full relative grid grid-cols-[1fr_500px] bg-slate-900">
      {/* Left: Remote Camera Feed */}
      <div className="relative h-full bg-black overflow-hidden flex items-center justify-center">
        {isStreamActive ? (
          <div className="w-full h-full relative">
            <img 
              src={`data:image/${frame?.format || 'jpeg'};base64,${frame?.image}`}
              alt="Remote Camera Feed"
              className="w-full h-full object-cover opacity-90 transition-opacity duration-300"
            />
            
            {/* Overlay Scan UI */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[500px] border-4 border-blue-500/50 rounded-[3rem] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-400 shadow-[0_0_20px_#60a5fa] animate-[scan_2s_linear_infinite]" />
                <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-blue-500 rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-blue-500 rounded-tr-3xl" />
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-blue-500 rounded-bl-3xl" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-blue-500 rounded-br-3xl" />
              </div>
            </div>

            <div className="absolute top-12 left-12 px-6 py-2 bg-blue-600/80 rounded-full backdrop-blur-md flex items-center gap-3">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white font-black tracking-widest text-xs uppercase">Server Stream Active</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-2xl bg-slate-950/50 w-full h-full">
            <div className="w-24 h-24 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-8" />
            <h3 className="text-4xl font-black text-slate-500 mb-4 uppercase">Waiting for Server Feed...</h3>
            <p className="text-xl text-slate-600 uppercase tracking-widest">
              The robot's camera system is initializing.
            </p>
          </div>
        )}
      </div>

      {/* Right: Instructions */}
      <div className="h-full bg-slate-900 border-l border-white/10 p-16 flex flex-col relative z-10 shadow-[-50px_0_100px_rgba(0,0,0,0.5)]">
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-7xl font-black mb-8 leading-tight tracking-tighter uppercase italic">
            Ticket<br/>
            <span className="text-blue-500">Scan</span>
          </h2>
          <p className="text-2xl text-slate-400 mb-12 leading-relaxed">
            {text || "Please place your exhibition QR ticket within the scanner's view."}
          </p>
          
          <div className="p-8 bg-blue-500/10 rounded-3xl border border-blue-500/20 flex flex-col gap-4">
             <div className="flex items-center gap-4">
               <span className="text-3xl">🤖</span>
               <span className="text-lg font-bold text-blue-400 uppercase tracking-widest">System Status</span>
             </div>
             <div className="text-2xl font-black text-white uppercase italic">
               {isStreamActive ? 'Vision System Online' : 'Connecting to Core...'}
             </div>
          </div>
        </div>

        <button 
          onClick={onCancel}
          className="w-full py-8 rounded-3xl border-2 border-white/5 bg-white/5 hover:bg-white/10 font-black text-2xl transition-all uppercase tracking-widest text-slate-500 hover:text-white active:scale-95"
        >
          Return to Start
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(500px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default QR;
