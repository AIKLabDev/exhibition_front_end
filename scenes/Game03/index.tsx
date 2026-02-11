/**
 * Game03: Heart Hunt
 * 카드를 잠깐 공개한 뒤 셔플하고, 하트가 있는 카드를 찾는 미니게임.
 * 전시 키오스크 2560x720 환경에 맞춤.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, CardData, Game03Props, CardType } from './Game03.types';
import { REVEAL_DURATION, SHUFFLE_DURATION, NUM_CARDS } from './constants';
import Card from './Card';
import './Game03.css';

const Game03: React.FC<Game03Props> = ({ onGameResult }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [shufflePhase, setShufflePhase] = useState(0);
  const shuffleTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const resultReportedRef = useRef(false);

  const initializeGame = useCallback(() => {
    const newCards: CardData[] = Array.from({ length: NUM_CARDS }, (_, i) => ({
      id: i,
      type: i === 0 ? CardType.HEART : CardType.BOMB,
      positionIndex: i,
    }));
    const shuffledTypes = [...newCards].sort(() => Math.random() - 0.5);
    setCards(shuffledTypes.map((c, idx) => ({ ...c, positionIndex: idx })));
    setSelectedCardId(null);
    setGameState(GameState.REVEALING);
    setShufflePhase(0);
    resultReportedRef.current = false;
  }, []);

  // Stage 1: 초기 공개
  useEffect(() => {
    if (gameState === GameState.REVEALING) {
      const timer = window.setTimeout(() => {
        setGameState(GameState.SHUFFLING);
        startTimeRef.current = Date.now();
      }, REVEAL_DURATION);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Stage 2: 셔플 (가속)
  useEffect(() => {
    if (gameState !== GameState.SHUFFLING) return;

    const runShuffle = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / SHUFFLE_DURATION, 1);
      setShufflePhase(progress);

      if (progress >= 1) {
        setGameState(GameState.CHOOSING);
        if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
        return;
      }

      const currentInterval = 500 - progress * 440;

      setCards((prev) => {
        const next = [...prev];
        const idx1 = Math.floor(Math.random() * NUM_CARDS);
        let idx2 = Math.floor(Math.random() * NUM_CARDS);
        while (idx1 === idx2) idx2 = Math.floor(Math.random() * NUM_CARDS);
        const tempPos = next[idx1].positionIndex;
        next[idx1].positionIndex = next[idx2].positionIndex;
        next[idx2].positionIndex = tempPos;
        return next;
      });

      shuffleTimerRef.current = window.setTimeout(runShuffle, currentInterval);
    };

    runShuffle();
    return () => {
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    };
  }, [gameState]);

  const handleCardClick = (id: number) => {
    if (gameState !== GameState.CHOOSING) return;
    setSelectedCardId(id);
    setGameState(GameState.RESULT);
  };

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const isWinner = selectedCard?.type === CardType.HEART;

  // 결과 확정 시 한 번만 백엔드에 전달
  useEffect(() => {
    if (gameState !== GameState.RESULT || resultReportedRef.current || !onGameResult) return;
    resultReportedRef.current = true;
    onGameResult(isWinner ? 'WIN' : 'LOSE');
  }, [gameState, isWinner, onGameResult]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6 select-none bg-[#0a0a0c]">
      {/* 상단: 타이틀 / 상태 */}
      <div className="mb-6 text-center h-20 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {gameState === GameState.IDLE && (
            <motion.button
              key="start-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={initializeGame}
              className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-2xl rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              START GAME
            </motion.button>
          )}

          {gameState === GameState.REVEALING && (
            <motion.div
              key="revealing-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-white text-3xl font-black uppercase tracking-widest flex items-center gap-4"
            >
              <span className="text-red-500">Memorize</span> the Heart Location!
            </motion.div>
          )}

          {gameState === GameState.SHUFFLING && (
            <motion.div
              key="shuffling-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="text-blue-400 text-3xl font-black uppercase tracking-tighter">
                {shufflePhase < 0.3 ? 'Shuffling...' : shufflePhase < 0.7 ? 'FASTER!' : 'MAX SPEED!!'}
              </div>
              <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${shufflePhase * 100}%` }}
                />
              </div>
            </motion.div>
          )}

          {gameState === GameState.CHOOSING && (
            <motion.div
              key="choosing-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-white text-3xl font-black uppercase tracking-widest animate-pulse"
            >
              PICK THE HEART!
            </motion.div>
          )}

          {gameState === GameState.RESULT && (
            <motion.div
              key="result-text"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div
                className={`text-5xl font-black uppercase tracking-tighter ${isWinner ? 'text-green-500' : 'text-red-500'}`}
              >
                {isWinner ? 'YOU WIN! 🎉' : 'GAME OVER 💀'}
              </div>
              <button
                onClick={initializeGame}
                className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition-colors text-lg"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 32:9 비율 카드 스테이지 (2560x720에 맞게 가로 폭 활용) */}
      <div className="relative w-full max-w-[1200px] flex-1 min-h-0 flex items-center justify-center">
        <div className="relative flex justify-center items-center gap-8 w-full px-8">
          {cards.length > 0 ? (
            cards.map((card) => (
              <div
                key={card.id}
                className="flex-shrink-0"
                style={{ order: card.positionIndex }}
              >
                <Card
                  type={card.type}
                  isFlipped={
                    gameState === GameState.REVEALING ||
                    (gameState === GameState.RESULT &&
                      (card.id === selectedCardId || card.type === CardType.HEART))
                  }
                  onClick={() => handleCardClick(card.id)}
                  disabled={gameState !== GameState.CHOOSING}
                  positionIndex={card.positionIndex}
                />
              </div>
            ))
          ) : (
            <div className="text-zinc-600 text-xl font-bold italic">Waiting to Start...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game03;
