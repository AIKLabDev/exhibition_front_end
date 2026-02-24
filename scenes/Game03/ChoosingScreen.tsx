/**
 * Game03 CHOOSING 상태 전용 헤더
 * 본문은 index에서 GameBoard로 공통 렌더
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Game03Layout } from './Game03.types';
import { GAME03_STRINGS } from './constants';

export interface ChoosingHeaderProps {
  layout: Game03Layout;
}

export const ChoosingHeader: React.FC<ChoosingHeaderProps> = ({ layout }) => {
  const { titleFontSize } = layout;

  return (
    <motion.div
      key="choosing-text"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="text-white font-black uppercase tracking-widest animate-pulse"
      style={{ fontSize: `${titleFontSize}px` }}
    >
      {GAME03_STRINGS.PICK_THE_HEART}
    </motion.div>
  );
};

export default ChoosingHeader;
