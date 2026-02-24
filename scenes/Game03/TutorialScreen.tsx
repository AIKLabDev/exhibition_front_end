/**
 * Game03 TUTORIAL 상태 전용 화면
 * 헤더 한 줄(타이틀 + 설명 + 게임 시작 버튼) + 튜토리얼 카드 5장
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CardData, Game03Layout, CardType } from './Game03.types';
import Card from './Card';
import { GAME03_STRINGS } from './constants';

const TUTORIAL_CARDS: CardData[] = [
  { id: 0, type: CardType.BOMB, positionIndex: 0 },
  { id: 1, type: CardType.BOMB, positionIndex: 1 },
  { id: 2, type: CardType.HEART, positionIndex: 2 },
  { id: 3, type: CardType.BOMB, positionIndex: 3 },
  { id: 4, type: CardType.BOMB, positionIndex: 4 },
];

export interface TutorialScreenProps {
  layout: Game03Layout;
  onStart: () => void;
}

export const TutorialHeader: React.FC<TutorialScreenProps> = ({ layout, onStart }) => {
  const { titleFontSize, buttonFontSize, scaleH } = layout;

  return (
    <motion.div
        key="tutorial-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex flex-row items-center justify-center gap-4 flex-nowrap w-full"
      >
        <span
          className="text-red-500 font-black whitespace-nowrap"
          style={{ fontSize: `${titleFontSize}px` }}
        >
          {GAME03_STRINGS.TUTORIAL_TITLE}
        </span>
        <span
          className="text-zinc-300 font-bold whitespace-nowrap"
          style={{ fontSize: `${Math.round(titleFontSize * 0.72)}px` }}
        >
          {GAME03_STRINGS.TUTORIAL_DESC_ONE_LINE}
        </span>
        <button
          onClick={onStart}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex-shrink-0 whitespace-nowrap"
          style={{
            fontSize: `${buttonFontSize}px`,
            padding: `${10 * scaleH}px ${32 * layout.scaleW}px`,
          }}
        >
          {GAME03_STRINGS.START_GAME}
        </button>
      </motion.div>
  );
};

export const TutorialContent: React.FC<Pick<TutorialScreenProps, 'layout'>> = ({ layout }) => {
  const { CARD_WIDTH, CARD_HEIGHT, CARD_GAP } = layout;

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center w-full h-full"
        style={{
          gap: CARD_GAP,
          paddingLeft: `${CARD_GAP}px`,
          paddingRight: `${CARD_GAP}px`,
        }}
      >
        {TUTORIAL_CARDS.map((card) => (
          <div key={card.id} className="flex-shrink-0">
            <Card
              type={card.type}
              isFlipped
              onClick={() => {}}
              disabled
              positionIndex={card.positionIndex}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
            />
          </div>
        ))}
      </motion.div>
  );
};

const TutorialScreen: React.FC<TutorialScreenProps> = (props) => (
  <>
    <TutorialHeader {...props} />
    <TutorialContent layout={props.layout} />
  </>
);

export default TutorialScreen;
