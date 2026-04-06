import React from 'react';
import './GameComplete.css';

/**
 * 미니게임 전체 완료 후 표시 (백엔드 SET_SCENE GAME_COMPLETE).
 * 오로라 배경 + 그라데이션 타이틀 + 순차 팝업 (~3초 분위기).
 * 배경만 overflow 숨김 — 문구 descender·글로우가 루트에 잘리지 않게 함.
 */
const GameComplete: React.FC = () => {
  return (
    <div className="game-complete-root h-full w-full relative overflow-x-hidden">
      <div className="game-complete-bg-layer absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="game-complete-bg" />
        <div className="game-complete-aurora">
          <div className="game-complete-aurora__blob game-complete-aurora__blob--a" />
          <div className="game-complete-aurora__blob game-complete-aurora__blob--b" />
          <div className="game-complete-aurora__blob game-complete-aurora__blob--c" />
        </div>
        <div className="game-complete-grid" />
        <div className="game-complete-shine" />
        <div className="game-complete-rings" />
        <div className="game-complete-vignette" />
      </div>

      <div className="game-complete-content h-full w-full font-sans">
        <h1 className="game-complete-line game-complete-line--primary">Game Complete!</h1>
        <p className="game-complete-line game-complete-line--secondary">상품을 전달해 드리겠습니다</p>
      </div>
    </div>
  );
};

export default GameComplete;
