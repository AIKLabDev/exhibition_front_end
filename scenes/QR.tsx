import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useCameraFrameCanvas } from '../hooks/useCameraFrameCanvas';
import { getVisionWsService } from '../services/visionWebSocketService';
import type { VisionQRScannedData } from '../protocol';

const QR_SUCCESS_DISPLAY_MS = 2000;

/** 오른쪽 패널 안내 문구 (한글) */
const QR_SCAN_INSTRUCTION =
  '화면에 전시회 QR 티켓을 놓아주세요.';

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
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannedDataRef = useRef<VisionQRScannedData | null>(null);
  const onQRScannedCompleteRef = useRef(onQRScannedComplete);
  onQRScannedCompleteRef.current = onQRScannedComplete;

  // Vision: QR 인식 시 연출 표시 → 일정 시간 후 백엔드 전달(씬 전환)
  useEffect(() => {
    const vision = getVisionWsService();
    const unsubscribe = vision.onQRScanned((data) => {
      scannedDataRef.current = data;
      setShowScannedSuccess(true);
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!showScannedSuccess) return;
    const data = scannedDataRef.current;
    successTimeoutRef.current = setTimeout(() => {
      successTimeoutRef.current = null;
      if (data) onQRScannedCompleteRef.current?.(data);
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

  const { hasFrame } = useCameraFrameCanvas(canvasRef, { enabled: true, onFrame });

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
    <div className="h-full relative grid grid-cols-[1fr_500px] bg-slate-900">
      {/* Left: Remote Camera Feed */}
      <div className="relative h-full bg-black overflow-hidden flex items-center justify-center">
        {isStreamActive ? (
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover opacity-90 transition-opacity duration-300"
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Overlay Scan UI */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[500px] border-4 border-blue-500/50 rounded-[3rem] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-400 shadow-[0_0_20px_#60a5fa] animate-[scan_2s_linear_infinite]" />
                <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-blue-500 rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-blue-500 rounded-tr-3xl" />
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-blue-500 rounded-bl-3xl" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-blue-500 rounded-br-3xl" />
              </div>
            </div>

            {/* 인식 완료 연출: 2초 표시 후 씬 전환 */}
            {showScannedSuccess && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[qrSuccessFadeIn_0.3s_ease-out]">
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="w-28 h-28 rounded-full bg-green-500/20 border-4 border-green-400 flex items-center justify-center animate-[qrSuccessScale_0.4s_ease-out]">
                    <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-5xl font-black text-white uppercase tracking-wider">인식 완료</h3>
                  <p className="text-xl text-green-300/90">티켓이 확인되었습니다</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-2xl bg-slate-950/50 w-full h-full">
            <div className="w-24 h-24 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-8" />
            <h3 className="text-4xl font-black text-slate-500 mb-4 uppercase">Waiting for camera frame...</h3>
            <p className="text-xl text-slate-600 uppercase tracking-widest">
              need to check back-end camera frame
            </p>
          </div>
        )}
      </div>

      {/* Right: Instructions */}
      <div className="h-full bg-slate-900 border-l border-white/10 p-16 flex flex-col relative z-10 shadow-[-50px_0_100px_rgba(0,0,0,0.5)]">
        <div className="flex-1 flex flex-col justify-center">
          <div className="absolute top-12 left-12 px-6 py-2 bg-blue-600/80 rounded-full backdrop-blur-md flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-black tracking-widest text-xs uppercase">Server Stream Active</span>
            <span className="text-blue-200 font-mono text-sm tabular-nums">{fps} FPS</span>
          </div>
          <h2 className="text-7xl font-black mb-8 leading-tight tracking-tighter uppercase italic">
            QR Code<br />
            <span className={showScannedSuccess ? 'text-green-500' : 'text-blue-500'}>
              {showScannedSuccess ? '인식 완료' : '인식 중'}
            </span>
          </h2>
          <p className="text-2xl text-slate-400 mb-12 leading-relaxed">
            {text || QR_SCAN_INSTRUCTION}
          </p>

          <div className="p-8 bg-blue-500/10 rounded-3xl border border-blue-500/20 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🤖</span>
              <span className="text-lg font-bold text-blue-400 uppercase tracking-widest">VISION SYSTEM</span>
            </div>
            <div className="text-2xl font-black uppercase italic">
              <span className={visionOnline ? 'text-green-400' : 'text-red-400'}>
                {visionOnline ? 'Online' : 'Offline'}
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
