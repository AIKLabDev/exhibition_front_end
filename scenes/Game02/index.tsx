/**
 * Game02: Find Object (Hidden Object Hunt)
 *
 * 플레이어가 큰 이미지에서 작은 타겟 오브젝트를 찾는 게임
 * - 드래그로 이미지 탐색
 * - VIEW_POSE(X,Y mm) 또는 클릭으로 타겟 위치 확인
 * - 120초 제한 시간
 *
 * 구조: useGame02 훅(상태/효과/핸들러) + 화면별 컴포넌트(Intro, Generating, Announcing, Play)
 */

import React from 'react';
import { Game02State, Game02Props } from './Game02.types';
import { useGame02 } from './hooks/useGame02';
import {
  Game02Intro,
  Game02Generating,
  Game02Announcing,
  Game02Play,
} from './screens';
import './Game02.css';

const Game02: React.FC<Game02Props> = ({
  onGameResult,
  triggerStartFromBackend = 0,
}) => {
  const {
    state,
    scenario,
    targetCropUrl,
    generationError,
    timeLeft,
    lastClick,
    reasoning,
    viewportRef,
    viewWindow,
    viewTopLeft,
    viewPoseStatus,
    isGameScreen,
    startGame,
    onIntroStartClick,
    onViewportPointerDown,
    onViewportPointerMove,
    onViewportPointerUp,
    onViewportPointerCancel,
    formatTime,
  } = useGame02(onGameResult, triggerStartFromBackend);

  return (
    <div
      className={`h-full w-full bg-black overflow-hidden relative selection:bg-indigo-500 ${
        isGameScreen ? 'flex flex-row' : 'flex flex-col items-center justify-center p-4'
      }`}
    >
      {state === Game02State.INTRO && (
        <Game02Intro
          onStart={onIntroStartClick}
          generationError={generationError}
        />
      )}

      {state === Game02State.GENERATING && <Game02Generating />}

      {state === Game02State.ANNOUNCING && targetCropUrl && (
        <Game02Announcing targetCropUrl={targetCropUrl} />
      )}

      {isGameScreen && scenario && (
        <Game02Play
          scenario={scenario}
          targetCropUrl={targetCropUrl}
          state={state}
          timeLeft={timeLeft}
          viewTopLeft={viewTopLeft}
          viewWindow={viewWindow}
          viewPoseStatus={viewPoseStatus}
          lastClick={lastClick}
          reasoning={reasoning}
          viewportRef={viewportRef}
          formatTime={formatTime}
          onViewportPointerDown={onViewportPointerDown}
          onViewportPointerMove={onViewportPointerMove}
          onViewportPointerUp={onViewportPointerUp}
          onViewportPointerCancel={onViewportPointerCancel}
        />
      )}
    </div>
  );
};

export default Game02;
