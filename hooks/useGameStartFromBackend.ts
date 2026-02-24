import { useEffect, useRef } from 'react';

export interface UseGameStartFromBackendOptions {
  /**
   * true일 때만 백엔드 시그널에 반응해 startGame 호출.
   * 대기 화면(첫 시작) + 결과/재시작 화면(예: 3판 진행 시 다음 라운드) 모두 포함할 것.
   */
  onlyWhen?: () => boolean;
}

/**
 * 현재 상태가 "시작 가능" 상태 목록에 있는지 (onlyWhen 조건 DRY용).
 * 각 게임에서 시작/재시작 가능한 state 목록을 한 곳에 두고 사용.
 */
export function isStartableState<T>(current: T, startable: readonly T[]): boolean {
  return startable.includes(current);
}

/**
 * 백엔드 GAME_START 수신 시(trigger 값이 증가할 때만) startGame 호출.
 * 씬 진입 시점의 trigger 값이면 무시 → 튜토리얼/대기 화면 후 버튼 또는 GAME_START로만 시작.
 * 결과 화면에서도 GAME_START 수신 시 재시작되려면 onlyWhen에 해당 상태를 포함할 것.
 */
export function useGameStartFromBackend(
  triggerFromBackend: number,
  startGame: () => void,
  options?: UseGameStartFromBackendOptions
): void {
  const prevTriggerRef = useRef(triggerFromBackend);

  useEffect(() => {
    if (triggerFromBackend <= prevTriggerRef.current) return;
    if (options?.onlyWhen && !options.onlyWhen()) return;
    prevTriggerRef.current = triggerFromBackend;
    startGame();
  }, [triggerFromBackend, startGame]);
}
