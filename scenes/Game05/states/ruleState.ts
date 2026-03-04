/**
 * Rule(규칙) 상태: title 터치 후 표시. 캔버스는 검정만 그림. 실제 규칙 UI는 React 오버레이(Game05 Rule.png + PRESS START).
 */

import { StateHandler, GameState, GameAssets, GameSounds, GameStateType } from '../Game05.types';

export const ruleState: StateHandler = {
  onEnter: (_state: GameState, _sounds: GameSounds | null) => { },

  onExit: (_state: GameState, _sounds: GameSounds | null) => { },

  update: (_state: GameState, _dt: number): GameStateType | null => {
    return null;
  },

  render: (_state: GameState, ctx: CanvasRenderingContext2D, _assets: GameAssets, W: number, H: number) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  },
};
