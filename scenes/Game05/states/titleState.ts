/**
 * Title 상태 핸들러
 */

import { StateHandler, GameState, GameAssets, GameSounds, GameStateType } from '../Game05.types';
import { drawTitle } from '../renderers';

export const titleState: StateHandler = {
  onEnter: (_state: GameState, sounds: GameSounds | null) => {
    if (sounds) {
      sounds.titleBgm.play().catch(() => {});
    }
  },

  onExit: (_state: GameState, sounds: GameSounds | null) => {
    if (sounds) {
      sounds.titleBgm.pause();
      sounds.titleBgm.currentTime = 0;
    }
  },

  update: (state: GameState, _dt: number): GameStateType | null => {
    // titleBlinkTimer는 render에서 업데이트
    return null;
  },

  render: (state: GameState, ctx: CanvasRenderingContext2D, assets: GameAssets, W: number, H: number) => {
    drawTitle(ctx, assets, state, 0.016, W, H); // dt는 근사값 사용
  },
};
