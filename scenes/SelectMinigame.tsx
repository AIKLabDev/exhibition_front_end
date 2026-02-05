
import React, { useState, useEffect, useMemo } from 'react';

interface SelectMinigameProps {
  onComplete: (game: string) => void;
}

const SelectMinigame: React.FC<SelectMinigameProps> = ({ onComplete }) => {
  const baseGames = [
    { id: 'GAME01', name: 'ROCK PAPER SCISSORS', icon: '✊', color: 'from-orange-500 to-red-600' },
    { id: 'GAME02', name: 'SPEED TAPPING', icon: '⚡', color: 'from-purple-500 to-indigo-600' },
    { id: 'GAME03', name: 'RESERVE03', icon: '🧩', color: 'from-green-500 to-teal-600' },
    { id: 'GAME04', name: 'RESERVE04', icon: '🧠', color: 'from-pink-500 to-rose-600' },
    { id: 'GAME05', name: 'RESERVE05', icon: '🛰️', color: 'from-cyan-500 to-blue-600' },
  ];

  // 15 repetitions for a long smooth track
  const REPEAT_COUNT = 15;
  const displayGames = useMemo(() => Array.from({ length: REPEAT_COUNT }).flatMap(() => baseGames), []);

  const [visualIndex, setVisualIndex] = useState(2);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  const VIEWPORT_WIDTH = 2560;
  // Further reduced Card Size for better vertical spacing
  const CARD_WIDTH = 380;
  const CARD_HEIGHT = 380;
  const CARD_GAP = 60;
  const CENTER_OFFSET = (VIEWPORT_WIDTH / 2) - (CARD_WIDTH / 2);

  useEffect(() => {
    // 1. Show the list statically for 800ms
    const startTimer = setTimeout(() => {
      setIsSpinning(true);

      const targetGameIdx = Math.floor(Math.random() * baseGames.length);
      const minRotations = 8;
      const targetVisualIndex = (minRotations * baseGames.length) + targetGameIdx;

      setVisualIndex(targetVisualIndex);

      // 2. Wait for transition (4s) to finish
      const endTimer = setTimeout(() => {
        setIsSpinning(false);
        setIsFinalized(true);
        setTimeout(() => {
          onComplete(baseGames[targetGameIdx].id);
        }, 2500);
      }, 4000);

      return () => clearTimeout(endTimer);
    }, 800);

    return () => clearTimeout(startTimer);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden relative" style={{ perspective: '3000px' }}>
      {/* Background Ambience */}
      <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none bg-blue-600/10 ${isFinalized ? 'opacity-40' : 'opacity-20'}`} />

      {/* Top UI Header */}
      <div className="absolute top-20 w-full flex items-center justify-center z-30 pointer-events-none px-20">
        <div className="flex items-center gap-8 w-full max-w-[2000px]">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-blue-500" />
          <div className="flex flex-col items-center">
            <h2 className={`text-3xl font-black italic tracking-tighter uppercase transition-all duration-700 whitespace-nowrap ${isFinalized ? 'text-white scale-110 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]' : 'text-blue-400 opacity-90'}`}>
              {isFinalized ? 'CHALLENGE ASSIGNED' : 'SYSTEM SELECTING RANDOM CHALLENGE'}
            </h2>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blue-500/50 to-blue-500" />
        </div>
      </div>

      {/* Target Bracket - Resized */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <div className={`w-[440px] h-[440px] border-[10px] rounded-[3.5rem] transition-all duration-1000 flex flex-col items-center justify-center ${isFinalized ? 'border-white shadow-[0_0_150px_rgba(255,255,255,0.4)]' : 'border-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.5)]'
          }`}>
          <div className={`absolute -top-8 px-12 py-2 text-2xl font-black rounded-full uppercase tracking-[0.3em] text-white shadow-2xl transition-all duration-500 ${isFinalized ? 'bg-white text-black scale-110' : 'bg-blue-600'
            }`}>
            TARGET
          </div>
        </div>
      </div>

      {/* Carousel Container */}
      <div
        className="flex items-center absolute left-0 h-[500px]"
        style={{
          transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)' : 'none',
          transform: `translateX(${CENTER_OFFSET - (visualIndex * (CARD_WIDTH + CARD_GAP))}px)`,
          gap: `${CARD_GAP}px`,
          transformStyle: 'preserve-3d'
        }}
      >
        {displayGames.map((game, idx) => {
          const isSelected = visualIndex === idx;

          // REMOVED isVisible check to prevent disappearing items during fast scroll

          return (
            <div
              key={idx}
              className={`relative flex-shrink-0 flex flex-col items-center justify-center rounded-[2.5rem] p-1 transition-all duration-700 ${isSelected
                  ? 'scale-110 opacity-100 z-10 drop-shadow-[0_0_80px_rgba(255,255,255,0.2)]'
                  : 'scale-90 opacity-50 blur-[1px]'
                }`}
              style={{
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                transform: `rotateY(${isSelected ? 0 : (idx < visualIndex ? 25 : -25)}deg)`,
                transformStyle: 'preserve-3d'
              }}
            >
              <div className={`w-full h-full bg-gradient-to-br ${game.color} rounded-[2.3rem] flex flex-col items-center justify-center gap-4 shadow-2xl border-4 border-white/20 transition-all duration-500`}>
                <span className={`text-[130px] drop-shadow-2xl transition-transform duration-1000 ${isSelected && isFinalized ? 'scale-115' : 'scale-100'}`}>
                  {game.icon}
                </span>
                <span className="text-2xl font-black text-center px-4 leading-tight tracking-tighter uppercase text-white drop-shadow-lg">
                  {game.name}
                </span>
              </div>

              {isSelected && isFinalized && (
                <div className="absolute -bottom-32 whitespace-nowrap text-6xl font-black text-white animate-bounce italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]">
                  READY TO START!
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Visual Depth Accents - Removed the horizontal center line */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
};

export default SelectMinigame;
