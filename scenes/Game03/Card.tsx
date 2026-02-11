/**
 * Game03 카드 컴포넌트
 * 뒷면: AI Korea 로고, 앞면: 하트 또는 폭탄
 * width/height를 받아 뷰포트 비율에 맞게 스케일 (터치 스크린 대형 카드)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CardType } from './Game03.types';
import logoUrl from '../../resources/AIK_logo_white.png';

interface CardProps {
  type: CardType;
  isFlipped: boolean;
  onClick: () => void;
  disabled: boolean;
  positionIndex: number;
  /** 뷰포트 비율로 계산된 카드 크기 (SelectMinigame 카드와 동일 기준) */
  width: number;
  height: number;
}

const Card: React.FC<CardProps> = ({ type, isFlipped, onClick, disabled, positionIndex, width, height }) => {
  const emojiSize = Math.round(height * 0.28);
  const labelSize = Math.round(height * 0.06);
  const cornerSize = Math.round(height * 0.045);
  const borderPx = Math.max(3, Math.round(width * 0.012));
  const paddingPx = Math.round(width * 0.04);

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative cursor-pointer select-none flex-shrink-0"
      style={{ perspective: '1000px', width, height }}
      onClick={() => !disabled && onClick()}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full h-full game03-card-inner"
      >
        {/* 뒷면: 로고 */}
        <div
          className="game03-card-back absolute inset-0 w-full h-full rounded-xl border-blue-500 bg-zinc-900 flex flex-col items-center justify-center shadow-2xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden', borderWidth: borderPx }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-black relative" style={{ padding: paddingPx }}>
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent" />
            <div className="relative w-3/4 h-3/4 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="AI Korea"
                className="w-full h-auto object-contain brightness-125 contrast-125"
              />
            </div>
            <div className="absolute top-2 left-2 text-blue-400 font-bold" style={{ fontSize: cornerSize }}>AI</div>
            <div className="absolute bottom-2 right-2 text-blue-400 font-bold rotate-180" style={{ fontSize: cornerSize }}>AI</div>
          </div>
        </div>

        {/* 앞면: 하트 / 폭탄 */}
        <div
          className={`game03-card-front absolute inset-0 w-full h-full rounded-xl flex flex-col items-center justify-center shadow-2xl bg-white ${type === CardType.HEART ? 'border-red-500' : 'border-zinc-300'}`}
          style={{ backfaceVisibility: 'hidden', borderWidth: borderPx }}
        >
          {type === CardType.HEART ? (
            <div className="flex flex-col items-center">
              <span className="animate-pulse" style={{ fontSize: emojiSize }}>❤️</span>
              <span className="mt-2 text-red-600 font-black uppercase tracking-widest" style={{ fontSize: labelSize }}>Heart</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span style={{ fontSize: emojiSize }}>💣</span>
              <span className="mt-2 text-zinc-800 font-black uppercase tracking-widest" style={{ fontSize: labelSize }}>Bomb</span>
            </div>
          )}
          <div className={`absolute top-2 left-2 font-bold ${type === CardType.HEART ? 'text-red-600' : 'text-zinc-800'}`} style={{ fontSize: cornerSize }}>{type === CardType.HEART ? '❤️' : '💣'}</div>
          <div className={`absolute bottom-2 right-2 font-bold rotate-180 ${type === CardType.HEART ? 'text-red-600' : 'text-zinc-800'}`} style={{ fontSize: cornerSize }}>{type === CardType.HEART ? '❤️' : '💣'}</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Card;
