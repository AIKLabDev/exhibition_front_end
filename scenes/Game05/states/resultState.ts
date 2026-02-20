/**
 * Result 상태 핸들러
 */

import { StateHandler, GameState, GameAssets, GameSounds, GameStateType } from '../Game05.types';
import { drawResult } from '../renderers';
import { stopAudio } from '../sounds';

export const resultState: StateHandler = {
  onEnter: (state: GameState, sounds: GameSounds | null) => {
    state.resultTimer = 0;
    state.titleBlinkTimer = 0;

    // 결과에 따라 BGM 재생
    if (sounds) {
      if (state.resultType === 'win') {
        sounds.resultWinBgm.play().catch(() => {});
      } else {
        sounds.resultDefeatBgm.play().catch(() => {});
      }
    }
  },

  onExit: (_state: GameState, sounds: GameSounds | null) => {
    // BGM 정지
    if (sounds) {
      stopAudio(sounds.resultWinBgm);
      stopAudio(sounds.resultDefeatBgm);
    }
  },

  update: (): GameStateType | null => {
    // result 화면에서는 자동 전환 없음 (버튼 클릭으로만 전환)
    return null;
  },

  render: (state: GameState, ctx: CanvasRenderingContext2D, assets: GameAssets, W: number, H: number) => {
    drawResult(ctx, assets, state, W, H);
  },
};
