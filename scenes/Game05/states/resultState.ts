/**
 * Result 상태 핸들러
 */

import { StateHandler, GameState, GameAssets, GameSounds, GameStateType } from '../Game05.types';
import { drawResult } from '../renderers';

export const resultState: StateHandler = {
  onEnter: (state: GameState, _sounds: GameSounds | null) => {
    state.resultTimer = 0;
    state.titleBlinkTimer = 0;
  },

  onExit: (_state: GameState, _sounds: GameSounds | null) => {
    // 사운드는 이미 이전 상태에서 정지됨
  },

  update: (): GameStateType | null => {
    // result 화면에서는 자동 전환 없음 (버튼 클릭으로만 전환)
    return null;
  },

  render: (state: GameState, ctx: CanvasRenderingContext2D, assets: GameAssets, W: number, H: number) => {
    drawResult(ctx, assets, state, W, H);
  },
};
