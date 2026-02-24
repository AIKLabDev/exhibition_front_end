/**
 * Game03 RESULT 상태 전용 헤더
 * 본문은 index에서 GameBoard로 공통 렌더
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Game03Layout } from './Game03.types';
import { GAME03_STRINGS } from './constants';

export interface ResultHeaderProps {
  layout: Game03Layout;
  isWinner: boolean;
  onTryAgain: () => void;
}

export const ResultHeader: React.FC<ResultHeaderProps> = ({
  layout,
  isWinner,
  onTryAgain,
}) => {
  const { resultFontSize, buttonFontSize, scaleH, scaleW } = layout;

  return (
    <motion.div
      key="result-text"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-row items-center gap-3"
    >
      <div
        className={`font-black uppercase tracking-tighter ${isWinner ? 'text-green-500' : 'text-red-500'}`}
        style={{ fontSize: `${resultFontSize}px` }}
      >
        {isWinner ? GAME03_STRINGS.YOU_WIN : GAME03_STRINGS.GAME_OVER}
      </div>
      <button
        onClick={onTryAgain}
        className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition-colors"
        style={{
          fontSize: `${buttonFontSize}px`,
          padding: `${8 * scaleH}px ${20 * scaleW}px`,
        }}
      >
        {GAME03_STRINGS.TRY_AGAIN}
      </button>
    </motion.div>
  );
};

export default ResultHeader;
