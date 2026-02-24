/**
 * Game03 IDLE 상태 전용 화면
 * 헤더: 게임 시작 버튼 / 본문: 대기 문구
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Game03Layout } from './Game03.types';
import { GAME03_STRINGS } from './constants';

export interface IdleScreenProps {
  layout: Game03Layout;
  onStart: () => void;
}

export const IdleHeader: React.FC<IdleScreenProps> = ({ layout, onStart }) => {
  const { buttonFontSize, scaleH, scaleW } = layout;

  return (
    <motion.button
      key="start-btn"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={onStart}
      className="bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
      style={{
        fontSize: `${buttonFontSize}px`,
        padding: `${12 * scaleH}px ${40 * scaleW}px`,
      }}
    >
      {GAME03_STRINGS.START_GAME}
    </motion.button>
  );
};

export const IdleContent: React.FC<{ layout: Game03Layout }> = ({ layout }) => (
  <div
    className="text-zinc-600 font-bold italic"
    style={{ fontSize: `${20 * layout.scaleH}px` }}
  >
    {GAME03_STRINGS.WAITING}
  </div>
);

const IdleScreen: React.FC<IdleScreenProps> = (props) => (
  <>
    <IdleHeader {...props} />
    <IdleContent layout={props.layout} />
  </>
);

export default IdleScreen;
