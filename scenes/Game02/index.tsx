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

import React, { useEffect, useState } from 'react';
import { Game02State, Game02Props } from './Game02.types';
import { useGame02 } from './hooks/useGame02';
import { GameTutorialVideoOverlay } from '../../components/GameTutorialVideoOverlay';
import { TUTORIAL_VIDEO_URLS } from '../../appConstants';
import {
  Game02Intro,
  Game02Generating,
  Game02Announcing,
  Game02Play,
} from './screens';
import './Game02.css';

/** public/sounds/game02/background.mp3 — 씬 전용 loop BGM */
const GAME02_BGM_URL = '/sounds/game02/background.mp3';
/** 0~1, 필요 시 여기만 조절 */
const GAME02_BGM_VOLUME = 0.7;

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
    pauseOverlayVisible,
    handlePauseCancel,
    rockProgress,
  } = useGame02(onGameResult, triggerStartFromBackend);

  const [introPhase, setIntroPhase] = useState<'countdown' | 'tutorial'>('countdown');

  useEffect(() => {
    if (state === Game02State.INTRO) setIntroPhase('countdown');
  }, [state]);

  useEffect(() => {
    const audio = new Audio(GAME02_BGM_URL);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = GAME02_BGM_VOLUME;
    audio.play().catch((err) => {
      console.warn('[Game02] background BGM play failed:', err);
    });
    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  return (
    <div
      className={`h-full w-full bg-black overflow-hidden relative selection:bg-indigo-500 ${
        isGameScreen ? 'flex flex-row' : 'flex flex-col items-center justify-center p-4'
      }`}
    >
      {/* PAUSE 오버레이: Python에서 GAME02_PAUSE 수신 시 표시, 터치로 해제 */}
      {pauseOverlayVisible && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 cursor-pointer"
          onClick={handlePauseCancel}
          onTouchEnd={(e) => { e.preventDefault(); handlePauseCancel(); }}
          role="button"
          tabIndex={0}
          aria-label="일시정지 해제"
        >
          <div className="text-white text-center font-bold whitespace-pre-line select-none" style={{ fontSize: 48, lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            PAUSE
            {'\n'}
            카메라에 얼굴을 맞추고 터치해주세요
          </div>
        </div>
      )}

      {state === Game02State.INTRO && introPhase === 'countdown' && (
        <Game02Intro
          onStart={() => setIntroPhase('tutorial')}
          generationError={generationError}
        />
      )}

      {state === Game02State.INTRO && introPhase === 'tutorial' && (
        <GameTutorialVideoOverlay
          src={TUTORIAL_VIDEO_URLS.game02}
          onEnded={onIntroStartClick}
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
          rockProgress={rockProgress}
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
