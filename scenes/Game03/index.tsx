/**
 * Game03: Heart Hunt
 * 카드를 잠깐 공개한 뒤 셔플하고, 하트가 있는 카드를 찾는 미니게임.
 * state별 화면(TutorialScreen, IdleScreen, RevealingHeader+GameBoard 등)을 통합.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GameState, CardData, Game03Props, CardType, Game03Layout } from './Game03.types';
import { useGameStartFromBackend, isStartableState, useResetResultReportRefWhenEnteringRound } from '../../hooks/useGameStartFromBackend';
import { REVEAL_DURATION, SHUFFLE_DURATION, NUM_CARDS, FLIPPING_BACK_DURATION, SHUFFLE_START_INTERVAL_MS, SHUFFLE_END_INTERVAL_MS } from './constants';
import { lerp } from '../../utils/math';
import { TutorialHeader, TutorialContent } from './TutorialScreen';
import { IdleHeader, IdleContent } from './IdleScreen';
import { RevealingHeader } from './RevealingScreen';
import { ShufflingHeader } from './ShufflingScreen';
import { ChoosingHeader } from './ChoosingScreen';
import { ResultHeader } from './ResultScreen';
import GameBoard from './GameBoard';
import './Game03.css';

const BASE_WIDTH = 2560;
const BASE_HEIGHT = 720;

/** (prev) => next 카드 배열. setCards(shuffleMethod1) 형태로 사용. Method 교체 가능 */
function shuffleMethod1(prev: CardData[]): CardData[] {
  const next = [...prev];
  const idx1 = Math.floor(Math.random() * NUM_CARDS);
  let idx2 = Math.floor(Math.random() * NUM_CARDS);
  while (idx1 === idx2) idx2 = Math.floor(Math.random() * NUM_CARDS);
  const tempPos = next[idx1].positionIndex;
  next[idx1].positionIndex = next[idx2].positionIndex;
  next[idx2].positionIndex = tempPos;
  return next;
}

/** idx1 제외한 인덱스에서 idx2를 한 번에 선택 — while 없이 항상 서로 다른 두 장 스왑 */
function shuffleMethod2(prev: CardData[]): CardData[] {
  const next = [...prev];
  const idx1 = Math.floor(Math.random() * NUM_CARDS);
  const idx2 = (idx1 + 1 + Math.floor(Math.random() * (NUM_CARDS - 1))) % NUM_CARDS;
  const tempPos = next[idx1].positionIndex;
  next[idx1].positionIndex = next[idx2].positionIndex;
  next[idx2].positionIndex = tempPos;
  return next;
}

function useLayout(): Game03Layout {
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

  const CARD_WIDTH = Math.round(420 * scaleW);
  const CARD_HEIGHT = CARD_WIDTH * 1.16;

  return {
    scaleW,
    scaleH,
    headerHeight: Math.round(120 * scaleH),
    titleFontSize: Math.round(36 * scaleH),
    resultFontSize: Math.round(56 * scaleH),
    buttonFontSize: Math.round(56 * scaleH),
    progressBarWidth: Math.round(1101 * scaleW),
    progressBarHeight: Math.round(16 * scaleH),
    CARD_WIDTH,
    CARD_HEIGHT,
    CARD_GAP: Math.round(60 * scaleW),
  };
}

const Game03: React.FC<Game03Props> = ({ onGameResult, triggerStartFromBackend = 0 }) => {
  const layout = useLayout();
  const [gameState, setGameState] = useState<GameState>(GameState.TUTORIAL);
  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [shufflePhase, setShufflePhase] = useState(0);
  const shuffleTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const resultReportedRef = useRef(false);

  const startGame = useCallback(() => {
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
  }, []);

  const game03StartableStates: readonly GameState[] = [GameState.TUTORIAL, GameState.IDLE, GameState.RESULT];
  useGameStartFromBackend(triggerStartFromBackend, startGame, {
    onlyWhen: () => isStartableState(gameState, game03StartableStates),
  });

  useResetResultReportRefWhenEnteringRound(gameState === GameState.REVEALING, resultReportedRef);

  useEffect(() => {
    if (gameState === GameState.REVEALING) {
      const timer = window.setTimeout(() => {
        setGameState(GameState.SHUFFLING);
        startTimeRef.current = Date.now();
      }, REVEAL_DURATION);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

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

      const currentInterval = lerp(SHUFFLE_START_INTERVAL_MS, SHUFFLE_END_INTERVAL_MS, progress);

      setCards(shuffleMethod2);

      shuffleTimerRef.current = window.setTimeout(runShuffle, currentInterval);
    };

    //. wait for flipping back duration
    setTimeout(runShuffle, FLIPPING_BACK_DURATION);

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

  useEffect(() => {
    if (gameState !== GameState.RESULT || resultReportedRef.current || !onGameResult) return;
    resultReportedRef.current = true;
    onGameResult(isWinner ? 'WIN' : 'LOSE');
  }, [gameState, isWinner, onGameResult]);

  const playingStates = [
    GameState.REVEALING,
    GameState.SHUFFLING,
    GameState.CHOOSING,
    GameState.RESULT,
  ];
  const showGameBoard = playingStates.includes(gameState);

  return (
    <div className="flex flex-col w-full h-full select-none bg-[#0a0a0c] overflow-hidden">
      {/* 섹션 1: 헤더 — state별 헤더 컴포넌트 */}
      <div
        className="flex-shrink-0 flex items-center justify-center text-center"
        style={{
          height: `${layout.headerHeight}px`,
          paddingLeft: `${24 * layout.scaleW}px`,
          paddingRight: `${24 * layout.scaleW}px`,
        }}
      >
        <AnimatePresence mode="wait">
          {gameState === GameState.TUTORIAL && (
            <TutorialHeader key="tutorial" layout={layout} onStart={startGame} />
          )}
          {gameState === GameState.IDLE && (
            <IdleHeader key="idle" layout={layout} onStart={startGame} />
          )}
          {gameState === GameState.REVEALING && (
            <RevealingHeader key="revealing" layout={layout} />
          )}
          {gameState === GameState.SHUFFLING && (
            <ShufflingHeader key="shuffling" layout={layout} shufflePhase={shufflePhase} />
          )}
          {gameState === GameState.CHOOSING && (
            <ChoosingHeader key="choosing" layout={layout} />
          )}
          {gameState === GameState.RESULT && (
            <ResultHeader
              key="result"
              layout={layout}
              isWinner={!!isWinner}
              onTryAgain={startGame}
            />
          )}
        </AnimatePresence>
      </div>

      {/* 섹션 2: 본문 — state별 콘텐츠 또는 GameBoard (한 번에 하나만 렌더) */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {gameState === GameState.TUTORIAL && (
            <TutorialContent key="tutorial-content" layout={layout} />
          )}
          {gameState === GameState.IDLE && (
            <IdleContent key="idle-content" layout={layout} />
          )}
          {showGameBoard ? (
            <GameBoard
              key="game-board"
              layout={layout}
              cards={cards}
              gameState={gameState}
              selectedCardId={selectedCardId}
              onCardClick={handleCardClick}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Game03;
