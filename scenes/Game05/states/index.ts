/**
 * State 핸들러 모음
 */

import { StateHandler, GameStateType } from '../Game05.types';
import { titleState } from './titleState';
import { playingState, checkAttackHit } from './playingState';
import { victoryState } from './victoryState';
import { defeatState } from './defeatState';
import { resultState } from './resultState';

export const stateHandlers: Record<GameStateType, StateHandler> = {
  title: titleState,
  playing: playingState,
  victory: victoryState,
  defeat: defeatState,
  result: resultState,
};

export { checkAttackHit };
