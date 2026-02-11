/**
 * Game03: Heart Hunt
 * 카드를 잠깐 공개한 뒤 셔플하고, 하트가 있는 카드를 찾는 미니게임.
 * 뷰포트 비율(2560x720 기준)로 섹션을 나눠 터치 스크린에 맞게 스케일.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, CardData, Game03Props, CardType } from './Game03.types';
import { REVEAL_DURATION, SHUFFLE_DURATION, NUM_CARDS } from './constants';
import Card from './Card';
import './Game03.css';

/** 기준 해상도 (전시 키오스크) */
const BASE_WIDTH = 2560;
const BASE_HEIGHT = 720;

const Game03: React.FC<Game03Props> = ({ onGameResult }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [shufflePhase, setShufflePhase] = useState(0);
  const shuffleTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const resultReportedRef = useRef(false);

  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scaleW = viewportWidth / BASE_WIDTH;
  const scaleH = viewportHeight / BASE_HEIGHT;

  // SelectMinigame 카드와 동일 기준: 380px → 비율 적용 (터치에 맞게 크게)
  const CARD_WIDTH = Math.round(380 * scaleW);
  const CARD_HEIGHT = Math.round(380 * scaleH);
  const CARD_GAP = Math.round(60 * scaleW);

  const headerHeight = Math.round(100 * scaleH);
  const footerHeight = Math.round(48 * scaleH);
  const titleFontSize = Math.round(36 * scaleH);
  const resultFontSize = Math.round(56 * scaleH);
  const buttonFontSize = Math.round(24 * scaleH);
  const progressBarWidth = Math.round(240 * scaleW);
  const progressBarHeight = Math.round(8 * scaleH);

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
    <div className="flex flex-col w-full h-full select-none bg-[#0a0a0c] overflow-hidden">
      {/* 섹션 1: 헤더 (타이틀/상태) — 비율 높이 */}
      <div
        className="flex-shrink-0 flex items-center justify-center text-center"
        style={{ height: `${headerHeight}px`, paddingLeft: `${24 * scaleW}px`, paddingRight: `${24 * scaleW}px` }}
      >
        <AnimatePresence mode="wait">
          {gameState === GameState.IDLE && (
            <motion.button
              key="start-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={initializeGame}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ fontSize: `${buttonFontSize}px`, padding: `${12 * scaleH}px ${40 * scaleW}px` }}
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
              className="text-white font-black uppercase tracking-widest flex items-center gap-4"
              style={{ fontSize: `${titleFontSize}px` }}
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
              <div
                className="text-blue-400 font-black uppercase tracking-tighter"
                style={{ fontSize: `${titleFontSize}px` }}
              >
                {shufflePhase < 0.3 ? 'Shuffling...' : shufflePhase < 0.7 ? 'FASTER!' : 'MAX SPEED!!'}
              </div>
              <div
                className="bg-zinc-800 rounded-full overflow-hidden"
                style={{ width: progressBarWidth, height: progressBarHeight }}
              >
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
              className="text-white font-black uppercase tracking-widest animate-pulse"
              style={{ fontSize: `${titleFontSize}px` }}
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
                className={`font-black uppercase tracking-tighter ${isWinner ? 'text-green-500' : 'text-red-500'}`}
                style={{ fontSize: `${resultFontSize}px` }}
              >
                {isWinner ? 'YOU WIN! 🎉' : 'GAME OVER 💀'}
              </div>
              <button
                onClick={initializeGame}
                className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition-colors"
                style={{ fontSize: `${buttonFontSize}px`, padding: `${8 * scaleH}px ${20 * scaleW}px` }}
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 섹션 2: 카드 영역 (flex-1, 남은 높이 전부) */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <div
          className="relative flex justify-center items-center w-full"
          style={{ gap: CARD_GAP, paddingLeft: `${32 * scaleW}px`, paddingRight: `${32 * scaleW}px` }}
        >
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
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                />
              </div>
            ))
          ) : (
            <div
              className="text-zinc-600 font-bold italic"
              style={{ fontSize: `${20 * scaleH}px` }}
            >
              Waiting to Start...
            </div>
          )}
        </div>
      </div>

      {/* 섹션 3: 푸터 (비율 높이) */}
      <div
        className="flex-shrink-0 flex items-center justify-center text-zinc-500"
        style={{ height: `${footerHeight}px`, fontSize: `${14 * scaleH}px` }}
      >

      </div>
    </div>
  );
};

export default Game03;
