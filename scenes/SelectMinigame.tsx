
import React, { useState, useEffect, useMemo } from 'react';

interface SelectMinigameProps {
  onComplete: (game: string) => void;
}

const SelectMinigame: React.FC<SelectMinigameProps> = ({ onComplete }) => {
  const baseGames = [
    { id: 'GAME01', name: 'ROCK PAPER SCISSORS', icon: '✊', color: 'from-orange-500 to-red-600' },
    { id: 'GAME02', name: 'FIND WALLY', icon: '⚡', color: 'from-purple-500 to-indigo-600' },
    { id: 'GAME03', name: 'HEART HUNT', icon: '❤️', color: 'from-green-500 to-teal-600' },
    { id: 'GAME04', name: 'ZOMBIE DEFENDER', icon: '🧟', color: 'from-pink-500 to-rose-600' },
    { id: 'GAME05', name: 'RESERVE05', icon: '🛰️', color: 'from-cyan-500 to-blue-600' },
  ];

  // 15 repetitions for a long smooth track
  const REPEAT_COUNT = 15;
  const displayGames = useMemo(() => Array.from({ length: REPEAT_COUNT }).flatMap(() => baseGames), []);

  const [visualIndex, setVisualIndex] = useState(2);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // 뷰포트 크기 추적
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2560x720 기준 비율 계산
  const scaleW = viewportWidth / 2560;
  const scaleH = viewportHeight / 720;

  // 카드 크기를 뷰포트 기준으로 계산
  const CARD_WIDTH = Math.round(380 * scaleW);
  const CARD_HEIGHT = Math.round(380 * scaleH);
  const CARD_GAP = Math.round(60 * scaleW);
  const CENTER_OFFSET = (viewportWidth / 2) - (CARD_WIDTH / 2);

  // 텍스트 크기 (반응형)
  const headerFontSize = Math.round(30 * scaleH);   // text-3xl ≈ 30px
  const readyFontSize = Math.round(60 * scaleH);    // text-6xl ≈ 60px

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
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden relative" style={{ perspective: '3000px' }}>
      {/* Background Ambience */}
      <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none bg-blue-600/10 ${isFinalized ? 'opacity-40' : 'opacity-20'}`} />

      {/* ===== HEADER 영역 - CHALLENGE ASSIGNED ===== */}
      <div
        className="flex-shrink-0 flex items-center justify-center z-30 px-[5%]"
        style={{ height: `${Math.round(100 * scaleH)}px` }}
      >
        <div className="flex items-center gap-8 w-full max-w-[80%]">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-blue-500" />
          <h2
            className={`font-black italic tracking-tighter uppercase transition-all duration-700 whitespace-nowrap ${isFinalized ? 'text-white scale-110 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]' : 'text-blue-400 opacity-90'}`}
            style={{ fontSize: `${headerFontSize}px` }}
          >
            {isFinalized ? 'CHALLENGE ASSIGNED' : 'SYSTEM SELECTING RANDOM CHALLENGE'}
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blue-500/50 to-blue-500" />
        </div>
      </div>

      {/* ===== CONTENT 영역 - 카드 리스트 + 선택 상자 ===== */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* 선택 상자 (중앙 고정) */}
        <div
          className={`absolute z-20 pointer-events-none rounded-[3.5rem] transition-all duration-1000 ${isFinalized ? 'border-white shadow-[0_0_150px_rgba(255,255,255,0.4)]' : 'border-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.5)]'}`}
          style={{
            width: `${CARD_WIDTH * 1.16}px`,
            height: `${CARD_HEIGHT * 1.16}px`,
            borderWidth: `${Math.max(4, Math.round(10 * scaleH))}px`,
          }}
        />

        {/* Carousel Container */}
        <div
          className="flex items-center absolute left-0"
          style={{
            height: `${CARD_HEIGHT * 1.3}px`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)' : 'none',
            transform: `translateX(${CENTER_OFFSET - (visualIndex * (CARD_WIDTH + CARD_GAP))}px)`,
            gap: `${CARD_GAP}px`,
            transformStyle: 'preserve-3d'
          }}
        >
          {displayGames.map((game, idx) => {
            const isSelected = visualIndex === idx;

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
                  <span
                    className={`drop-shadow-2xl transition-transform duration-1000 ${isSelected && isFinalized ? 'scale-115' : 'scale-100'}`}
                    style={{ fontSize: `${CARD_WIDTH * 0.34}px` }}
                  >
                    {game.icon}
                  </span>
                  <span
                    className="font-black text-center px-4 leading-tight tracking-tighter uppercase text-white drop-shadow-lg"
                    style={{ fontSize: `${Math.max(14, CARD_WIDTH * 0.063)}px` }}
                  >
                    {game.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== BOTTOM 영역 - READY TO START ===== */}
      <div
        className="flex-shrink-0 flex items-center justify-center z-30"
        style={{ height: `${Math.round(100 * scaleH)}px` }}
      >
        {isFinalized && (
          <div
            className="font-black text-white animate-bounce italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
            style={{ fontSize: `${readyFontSize}px` }}
          >
            READY TO START!
          </div>
        )}
      </div>

      {/* Visual Depth Accents */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default SelectMinigame;
