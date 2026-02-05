/**
 * Result Overlay Component for Game02
 * Displays SUCCESS or FAILURE overlay with animations
 */

import React from 'react';
import { Game02State } from './Game02.types';

interface ResultOverlayProps {
  state: Game02State;
}

const ResultOverlay: React.FC<ResultOverlayProps> = ({ state }) => {
  const isSuccess = state === Game02State.SUCCESS;
  const isVisible = state === Game02State.SUCCESS || state === Game02State.FAILURE;

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="animate-game02-pop select-none">
        <h2
          className={`font-korean-dynamic text-[10rem] md:text-[16rem] leading-none drop-shadow-[0_20px_20px_rgba(0,0,0,0.6)] ${
            isSuccess ? 'text-[#22C55E]' : 'text-[#EF4444]'
          }`}
        >
          {isSuccess ? 'Success!' : 'Fail!'}
        </h2>
      </div>
    </div>
  );
};

export default ResultOverlay;
