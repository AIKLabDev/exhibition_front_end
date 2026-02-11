/**
 * Game03 카드 컴포넌트
 * 뒷면: AI Korea 로고, 앞면: 하트 또는 폭탄
 * Framer Motion으로 플립 애니메이션
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
}

const Card: React.FC<CardProps> = ({ type, isFlipped, onClick, disabled, positionIndex }) => {
  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative w-40 h-56 cursor-pointer select-none"
      style={{ perspective: '1000px' }}
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
          className="game03-card-back absolute inset-0 w-full h-full rounded-xl border-4 border-blue-500 bg-zinc-900 flex flex-col items-center justify-center shadow-2xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-full h-full p-3 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-black relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent" />
            <div className="relative w-3/4 h-3/4 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="AI Korea"
                className="w-full h-auto object-contain brightness-125 contrast-125"
              />
            </div>
            <div className="absolute top-1.5 left-1.5 text-blue-400 font-bold text-sm">AI</div>
            <div className="absolute bottom-1.5 right-1.5 text-blue-400 font-bold text-sm rotate-180">AI</div>
          </div>
        </div>

        {/* 앞면: 하트 / 폭탄 */}
        <div
          className={`game03-card-front absolute inset-0 w-full h-full rounded-xl border-4 flex flex-col items-center justify-center shadow-2xl bg-white ${type === CardType.HEART ? 'border-red-500' : 'border-zinc-300'}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {type === CardType.HEART ? (
            <div className="flex flex-col items-center">
              <span className="text-6xl animate-pulse">❤️</span>
              <span className="mt-2 text-red-600 font-black text-lg uppercase tracking-widest">Heart</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-6xl">💣</span>
              <span className="mt-2 text-zinc-800 font-black text-lg uppercase tracking-widest">Bomb</span>
            </div>
          )}
          <div className={`absolute top-1.5 left-1.5 font-bold text-sm ${type === CardType.HEART ? 'text-red-600' : 'text-zinc-800'}`}>
            {type === CardType.HEART ? 'H' : 'B'}
          </div>
          <div className={`absolute bottom-1.5 right-1.5 font-bold text-sm rotate-180 ${type === CardType.HEART ? 'text-red-600' : 'text-zinc-800'}`}>
            {type === CardType.HEART ? 'H' : 'B'}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Card;
