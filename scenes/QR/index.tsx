import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useCameraFrameCanvas } from '../../hooks/useCameraFrameCanvas';
import { useQRROI, DEFAULT_QR_ROI } from '../../hooks/useQRROI';
import { getVisionWsService } from '../../services/visionWebSocketService';
import { backendWsService } from '../../services/backendWebSocketService';
import type { VisionQRScannedData } from '../../protocol';
import { BackendMessageName } from '../../protocol';
import { LAYOUT_CAMERA_SIDEBAR_WIDTH_PX } from '../../layoutConstants';
import { QR_SUCCESS_DISPLAY_MS, QR_SCAN_INSTRUCTION, QR_STRINGS } from './constants';
import { QRScanBoxROI } from './QRScanBoxROI';

interface QRProps {
  onCancel: () => void;
  text?: string;
  /** 인식 완료 연출을 보여준 뒤 호출. 여기서 백엔드로 전달하면 씬 전환됨 */
  onQRScannedComplete?: (data: VisionQRScannedData) => void;
  /** Vision WebSocket 연결 여부 (오른쪽 패널 Online/Offline 표시) */
  visionOnline?: boolean;
}

const QR: React.FC<QRProps> = ({ onCancel, text, onQRScannedComplete, visionOnline = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fps, setFps] = useState(0);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [showScannedSuccess, setShowScannedSuccess] = useState(false);
  const [showDuplicated, setShowDuplicated] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannedDataRef = useRef<VisionQRScannedData | null>(null);
  const onQRScannedCompleteRef = useRef(onQRScannedComplete);
  /** 인식 완료 2초 연출 중에 QR_DUPLICATED 수신 시, 연출 끝난 뒤에 중복 연출 표시 */
  const pendingDuplicateRef = useRef(false);
  const showScannedSuccessRef = useRef(false);
  onQRScannedCompleteRef.current = onQRScannedComplete;
  showScannedSuccessRef.current = showScannedSuccess;

  // Vision: QR 인식 시 연출 표시 → 일정 시간 후 백엔드 전달(씬 전환)
  useEffect(() => {
    const vision = getVisionWsService();
    const unsubscribe = vision.onQRScanned((data) => {
      scannedDataRef.current = data;
      setShowScannedSuccess(true);
    });
    return () => { unsubscribe(); };
  }, []);

  // 백엔드 QR_DUPLICATED: 인식 완료 연출이 끝난 뒤에만 연출 표시
  useEffect(() => {
    const unsubscribe = backendWsService.addMessageListener((msg) => {
      if (msg.header.name !== BackendMessageName.QR_DUPLICATED) return;
      if (showScannedSuccessRef.current) {
        pendingDuplicateRef.current = true;
      } else {
        setShowDuplicated(true);
      }
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    showScannedSuccessRef.current = showScannedSuccess;
  }, [showScannedSuccess]);

  useEffect(() => {
    if (!showScannedSuccess) return;
    const data = scannedDataRef.current;
    successTimeoutRef.current = setTimeout(() => {
      successTimeoutRef.current = null;
      if (pendingDuplicateRef.current) {
        pendingDuplicateRef.current = false;
        setShowDuplicated(true);
      } else if (data) {
        onQRScannedCompleteRef.current?.(data);
      }
      setShowScannedSuccess(false);
      scannedDataRef.current = null;
    }, QR_SUCCESS_DISPLAY_MS);
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [showScannedSuccess]);

  const onFrame = useCallback(() => {
    frameCountRef.current += 1;
    lastFrameTimeRef.current = Date.now();
  }, []);

  const { hasFrame, frameSize } = useCameraFrameCanvas(canvasRef, { enabled: true, onFrame });
  const roiFromVision = useQRROI();
  const scanBoxRoi = roiFromVision ?? DEFAULT_QR_ROI;
  const cameraAspectRatio =
    frameSize && frameSize.height > 0 ? frameSize.width / frameSize.height : 16 / 9;

  // 첫 프레임 도착 시 바로 스트림 활성 표시
  useEffect(() => {
    if (hasFrame) setIsStreamActive(true);
  }, [hasFrame]);

  // FPS·스트림 비활성: 1초마다 ref 기준으로 state 갱신 (리렌더 최소화)
  useEffect(() => {
    fpsIntervalRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      setIsStreamActive((prev) => (prev ? Date.now() - lastFrameTimeRef.current < 2000 : false));
    }, 1000);
    return () => {
      if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    };
  }, []);

  return (
    <div
      className="h-full relative grid bg-slate-900"
      style={{ gridTemplateColumns: `1fr ${LAYOUT_CAMERA_SIDEBAR_WIDTH_PX}px` }}
    >
      {/* Left: Remote Camera Feed */}
      <div className="relative h-full bg-black overflow-hidden flex items-center justify-center">
        {isStreamActive ? (
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover opacity-90 transition-opacity duration-300"
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Overlay Scan UI: ROI에 맞춘 파란 상자. 원본 카메라 비율 안에서만 그려서 찌그러짐 방지 */}
            <QRScanBoxROI roi={scanBoxRoi} cameraAspectRatio={cameraAspectRatio} />

            {/* 인식 완료 연출: 2초 표시 후 씬 전환 */}
            {showScannedSuccess && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[qrSuccessFadeIn_0.3s_ease-out]">
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="w-28 h-28 rounded-full bg-green-500/20 border-4 border-green-400 flex items-center justify-center animate-[qrSuccessScale_0.4s_ease-out]">
                    <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-5xl font-black text-white uppercase tracking-wider">{QR_STRINGS.successTitle}</h3>
                  <p className="text-xl text-green-300/90">{QR_STRINGS.successSubtitle}</p>
                </div>
              </div>
            )}

            {/* 중복 참여자 연출: 백엔드 QR_DUPLICATED 수신 후 */}
            {showDuplicated && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[qrSuccessFadeIn_0.3s_ease-out]">
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="w-28 h-28 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center animate-[qrSuccessScale_0.4s_ease-out]">
                    <svg className="w-16 h-16 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-5xl font-black text-white uppercase tracking-wider">{QR_STRINGS.duplicatedTitle}</h3>
                  <p className="text-xl text-amber-300/90">{QR_STRINGS.duplicatedSubtitle}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-2xl bg-slate-950/50 w-full h-full">
            <div className="w-24 h-24 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-8" />
            <h3 className="text-4xl font-black text-slate-500 mb-4 uppercase">{QR_STRINGS.waitingTitle}</h3>
            <p className="text-xl text-slate-600 uppercase tracking-widest">
              {QR_STRINGS.waitingSubtitle}
            </p>
          </div>
        )}
      </div>

      {/* Right: Instructions */}
      <div className="h-full bg-slate-900 border-l border-white/10 p-16 flex flex-col relative z-10 shadow-[-50px_0_100px_rgba(0,0,0,0.5)]">
        <div className="flex-1 flex flex-col justify-center">
          <div className="absolute top-12 left-12 px-6 py-2 bg-blue-600/80 rounded-full backdrop-blur-md flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-black tracking-widest text-xs uppercase">{QR_STRINGS.serverStreamActive}</span>
            <span className="text-blue-200 font-mono text-sm tabular-nums">{fps} FPS</span>
          </div>
          <h2 className="text-7xl font-black mb-8 leading-tight tracking-tighter uppercase italic">
            QR Code<br />
            <span className={
              showDuplicated ? 'text-amber-500' : showScannedSuccess ? 'text-green-500' : 'text-blue-500'
            }>
              {showDuplicated ? QR_STRINGS.statusDuplicated : showScannedSuccess ? QR_STRINGS.statusScanned : QR_STRINGS.statusRecognizing}
            </span>
          </h2>
          <p className="text-2xl text-slate-400 mb-12 leading-relaxed">
            {text || QR_SCAN_INSTRUCTION}
          </p>

          <div className="p-8 bg-blue-500/10 rounded-3xl border border-blue-500/20 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🤖</span>
              <span className="text-lg font-bold text-blue-400 uppercase tracking-widest">{QR_STRINGS.visionSystem}</span>
            </div>
            <div className="text-2xl font-black uppercase italic">
              <span className={visionOnline ? 'text-green-400' : 'text-red-400'}>
                {visionOnline ? QR_STRINGS.online : QR_STRINGS.offline}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(500px); opacity: 0; }
        }
        @keyframes qrSuccessFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes qrSuccessScale {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default QR;
