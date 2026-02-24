/**
 * Game03 SHUFFLING 상태 전용 헤더
 * 본문은 index에서 GameBoard로 공통 렌더
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Game03Layout } from './Game03.types';
import { GAME03_STRINGS } from './constants';

export interface ShufflingHeaderProps {
  layout: Game03Layout;
  shufflePhase: number;
}

export const ShufflingHeader: React.FC<ShufflingHeaderProps> = ({
  layout,
  shufflePhase,
}) => {
  const { titleFontSize, progressBarWidth, progressBarHeight } = layout;

  const phaseText =
    shufflePhase < 0.3
      ? GAME03_STRINGS.SHUFFLE_PHASE_1
      : shufflePhase < 0.7
        ? GAME03_STRINGS.SHUFFLE_PHASE_2
        : GAME03_STRINGS.SHUFFLE_PHASE_3;

  return (
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
        {phaseText}
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
  );
};

export default ShufflingHeader;
