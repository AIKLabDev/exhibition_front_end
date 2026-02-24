/**
 * QR 씬에서 Python QR_ROI 메시지에 맞춰 위치·크기가 정해지는 파란 스캔 상자.
 * ROI(left/top/width/height)는 원본 카메라 프레임 좌표(0~1).
 * 캔버스가 object-fit: cover 로 그려지므로, 여기서도 같은 비율로 cover 해서 비디오와 정확히 겹치게 함.
 */

import React from 'react';
import type { VisionQRROIData } from '../protocol';

/** frameSize 미수신 시 가정하는 비율 (예: 16:9) */
const FALLBACK_ASPECT_RATIO = 16 / 9;

interface QRScanBoxROIProps {
  roi: VisionQRROIData;
  /** 원본 카메라 프레임 비율 (width/height). 캔버스와 동일하게 cover 영역을 만듦 */
  cameraAspectRatio?: number;
}

export const QRScanBoxROI: React.FC<QRScanBoxROIProps> = ({
  roi,
  cameraAspectRatio = FALLBACK_ASPECT_RATIO,
}) => {
  const leftPct = roi.left * 100;
  const topPct = roi.top * 100;
  const widthPct = roi.width * 100;
  const heightPct = roi.height * 100;

  // object-fit: cover 와 동일하게, 비율 유지하며 컨테이너를 꽉 채우는 영역 (넘치는 부분 중앙 정렬)
  const ar = cameraAspectRatio;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ containerType: 'size' }}>
      {/* 캔버스와 동일한 cover 영역: 16:9 등으로 컨테이너를 덮고, ROI는 이 영역 기준 0~1 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: `max(100cqw, 100cqh * ${ar})`,
          height: `max(100cqh, 100cqw / ${ar})`,
        }}
      >
        <div
          className="absolute border-4 border-blue-500/50 rounded-[3rem] overflow-hidden box-border"
          style={{
            left: `${leftPct}%`,
            top: `${topPct}%`,
            width: `${widthPct}%`,
            height: `${heightPct}%`,
          }}
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-400 shadow-[0_0_20px_#60a5fa] animate-[scan_2s_linear_infinite]" />
          <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-blue-500 rounded-tl-3xl" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-blue-500 rounded-tr-3xl" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-blue-500 rounded-bl-3xl" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-blue-500 rounded-br-3xl" />
        </div>
      </div>
    </div>
  );
};
