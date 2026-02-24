import { useEffect, useRef } from 'react';

export interface UseGameStartFromBackendOptions {
  /** true일 때만 백엔드 시그널에 반응해 startGame 호출 (예: IDLE/INTRO 등 대기 상태) */
  onlyWhen?: () => boolean;
}

/**
 * 백엔드 GAME_START 수신 시(trigger 값이 증가할 때만) startGame 호출.
 * 씬 진입 시점의 trigger 값이면 무시 → 튜토리얼/대기 화면 후 버튼 또는 GAME_START로만 시작.
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
