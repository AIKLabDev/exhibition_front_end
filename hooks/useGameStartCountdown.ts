import { useState, useEffect, useRef } from 'react';
import { GAME_START_COUNTDOWN } from '../appConstants';

/**
 * enabled가 true일 때 GAME_START_COUNTDOWN → 1까지 1초마다 표시한 뒤 onComplete 한 번 호출.
 * 언마운트 또는 enabled false 시 타이머만 정리 (onComplete 미호출).
 */
export function useGameStartCountdown(onComplete: () => void, enabled: boolean): number {
  const [secondsLeft, setSecondsLeft] = useState(() => (enabled ? GAME_START_COUNTDOWN : 0));
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(0);
      return;
    }
    completedRef.current = false;
    setSecondsLeft(GAME_START_COUNTDOWN);
    let n = GAME_START_COUNTDOWN;
    const id = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(id);
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
      } else {
        setSecondsLeft(n);
      }
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [enabled]);

  return secondsLeft;
}
