/**
 * QR 씬 전용: Vision WebSocket에서 QR_ROI 메시지를 구독하고,
 * 파란 스캔 상자 위치·크기에 쓸 ROI(left/top/width/height, 0~1) 상태를 반환합니다.
 * Python에서 ROI를 보내기 전에는 null → QR 씬에서는 기본 ROI로 렌더.
 */

import { useEffect, useState } from 'react';
import { getVisionWsService } from '../services/visionWebSocketService';
import type { VisionQRROIData } from '../protocol';

const LOG_PREFIX = '[useQRROI]';

export function useQRROI(): VisionQRROIData | null {
  const [roi, setRoi] = useState<VisionQRROIData | null>(null);

  useEffect(() => {
    const vision = getVisionWsService();
    const unsubscribe = vision.onQRROI((data) => {
      setRoi(data);
      console.log(LOG_PREFIX, 'ROI updated', {
        left: data.left,
        top: data.top,
        width: data.width,
        height: data.height,
      });
    });
    return () => {
      unsubscribe();
      console.log(LOG_PREFIX, 'unsubscribed');
    };
  }, []);

  return roi;
}

/** ROI 미수신 시 사용할 기본값 (화면 중앙, width 0.3, height 0.5). */
export const DEFAULT_QR_ROI: VisionQRROIData = {
  left: (1 - 0.3) / 2,
  top: (1 - 0.5) / 2,
  width: 0.3,
  height: 0.5,
};
