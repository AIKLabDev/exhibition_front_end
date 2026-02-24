/**
 * Game03 REVEALING 상태 전용 헤더
 * 본문은 index에서 GameBoard로 공통 렌더
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Game03Layout } from './Game03.types';
import { GAME03_STRINGS } from './constants';

export interface RevealingHeaderProps {
  layout: Game03Layout;
}

export const RevealingHeader: React.FC<RevealingHeaderProps> = ({ layout }) => {
  const { titleFontSize } = layout;

  return (
    <motion.div
      key="revealing-text"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="text-white font-black uppercase tracking-widest flex items-center gap-4"
      style={{ fontSize: `${titleFontSize}px` }}
    >
      <span className="text-red-500">{GAME03_STRINGS.MEMORIZE}</span>{' '}
      {GAME03_STRINGS.MEMORIZE_SUB}
    </motion.div>
  );
};

export default RevealingHeader;
