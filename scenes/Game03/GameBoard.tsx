/**
 * Game03 카드 영역 (REVEALING / SHUFFLING / CHOOSING / RESULT 공통)
 * 카드 목록과 gameState에 따라 앞/뒷면, 클릭 가능 여부 표시
 */

import React from 'react';
import { GameState, CardData, Game03Layout, CardType } from './Game03.types';
import Card from './Card';
import { GAME03_STRINGS } from './constants';

export interface GameBoardProps {
  layout: Game03Layout;
  cards: CardData[];
  gameState: GameState;
  selectedCardId: number | null;
  onCardClick: (id: number) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  layout,
  cards,
  gameState,
  selectedCardId,
  onCardClick,
}) => {
  const { CARD_WIDTH, CARD_HEIGHT, CARD_GAP, scaleH } = layout;

  return (
    <div
      className="relative flex justify-center items-center w-full"
      style={{
        gap: CARD_GAP,
        paddingLeft: `${CARD_GAP * layout.scaleW}px`,
        paddingRight: `${CARD_GAP * layout.scaleW}px`,
      }}
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
              onClick={() => onCardClick(card.id)}
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
          {GAME03_STRINGS.WAITING}
        </div>
      )}
    </div>
  );
};

export default GameBoard;
