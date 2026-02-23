/**
 * 공통 훅: 카메라 프레임을 ref + requestAnimationFrame으로 canvas에만 그립니다.
 * setState를 쓰지 않아 프레임마다 React 리렌더가 발생하지 않습니다.
 * - raw: drawRawFrameToCanvas
 * - Blob(jpeg 등): createImageBitmap으로 디코딩 후 drawImage (한 번에 하나만 디코딩)
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import { backendWsService } from '../services/backendWebSocketService';
import type { CameraFrameData } from '../types';
import { drawRawFrameToCanvas } from '../utils/drawCameraFrame';

export interface UseCameraFrameCanvasOptions {
  /** false면 구독·rAF 중단. Game02는 ALIGNING일 때만 true */
  enabled?: boolean;
  /** 프레임 수신 시마다 호출 (FPS 카운트, lastFrameTime 등 ref 갱신용) */
  onFrame?: () => void;
}

/**
 * @param canvasRef - 그릴 canvas의 ref
 * @param options - enabled, onFrame
 * @returns hasFrame - 최소 한 번이라도 프레임을 받았는지 (대기 UI vs 영상 표시용)
 */
export function useCameraFrameCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: UseCameraFrameCanvasOptions = {}
): { hasFrame: boolean } {
  const { enabled = true, onFrame } = options;
  const frameRef = useRef<CameraFrameData | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const hasFrameRef = useRef(false);
  const pendingDecodeRef = useRef(false);
  const rafIdRef = useRef<number>(0);

  // 구독: 프레임을 ref에만 넣고, onFrame 호출. 첫 프레임 시 hasFrame true로 한 번만 setState
  useEffect(() => {
    if (!enabled) return;
    const unsub = backendWsService.addFrameListener((data) => {
      frameRef.current = data;
      onFrame?.();
      if (!hasFrameRef.current) {
        hasFrameRef.current = true;
        setHasFrame(true);
      }
    });
    return () => {
      unsub();
    };
  }, [enabled, onFrame]);

  // enabled 꺼질 때 hasFrame 리셋 (Game02가 ALIGNING 벗어날 때)
  useEffect(() => {
    if (!enabled) {
      frameRef.current = null;
      hasFrameRef.current = false;
      setHasFrame(false);
      pendingDecodeRef.current = false;
    }
  }, [enabled]);

  // rAF 루프: ref의 최신 프레임을 canvas에 그리기
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      rafIdRef.current = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      const frame = frameRef.current;
      if (!canvas || !frame) return;

      const isRaw =
        frame.format === 'raw' &&
        frame.imageBuffer != null &&
        frame.width != null &&
        frame.height != null;

      if (isRaw && frame.imageBuffer) {
        drawRawFrameToCanvas(canvas, frame.imageBuffer, frame.width, frame.height);
        return;
      }

      if (frame.imageBlob && !pendingDecodeRef.current) {
        pendingDecodeRef.current = true;
        createImageBitmap(frame.imageBlob)
          .then((bitmap) => {
            if (!canvasRef.current) {
              bitmap.close();
              pendingDecodeRef.current = false;
              return;
            }
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              canvasRef.current.width = bitmap.width;
              canvasRef.current.height = bitmap.height;
              ctx.drawImage(bitmap, 0, 0);
            }
            bitmap.close();
          })
          .catch(() => {})
          .finally(() => {
            pendingDecodeRef.current = false;
          });
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [enabled, canvasRef]);

  return { hasFrame };
}
