import React, { useEffect, useState, useRef } from 'react';
import { backendWsService } from '../services/backendWebSocketService';
import { CameraFrameData } from '../types';

interface QRProps {
  onCancel: () => void;
  text?: string;
}

/** Draw raw RGB ArrayBuffer to canvas (width*height*3 bytes). */
function drawRawFromBuffer(
  canvas: HTMLCanvasElement | null,
  buffer: ArrayBuffer,
  width: number,
  height: number
): void {
  if (!canvas || !width || !height) return;
  try {
    const rgb = new Uint8Array(buffer);
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = rgb[i * 3];
      rgba[i * 4 + 1] = rgb[i * 3 + 1];
      rgba[i * 4 + 2] = rgb[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
    }
  } catch {
    // ignore
  }
}

const QR: React.FC<QRProps> = ({ onCancel, text }) => {
  const [frame, setFrame] = useState<CameraFrameData | null>(null);
  const [lastFrameTime, setLastFrameTime] = useState<number>(Date.now());
  const [fps, setFps] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = backendWsService.addFrameListener((data) => {
      setFrame(data);
      setLastFrameTime(Date.now());
      frameCountRef.current += 1;
    });
    return () => { unsubscribe(); };
  }, []);

  // FPS: every 1s, set fps = frame count and reset
  useEffect(() => {
    fpsIntervalRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);
    return () => {
      if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    };
  }, []);

  // Draw raw frames to canvas when frame updates
  const isRaw = frame?.format === 'raw' && frame?.imageBuffer != null && frame?.width != null && frame?.height != null;
  useEffect(() => {
    if (isRaw && frame?.imageBuffer) drawRawFromBuffer(canvasRef.current, frame.imageBuffer, frame.width!, frame.height!);
  }, [isRaw, frame?.imageBuffer, frame?.width, frame?.height]);

  // Blob URL for encoded frames (jpeg/png/webp); revoke on change or unmount
  useEffect(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (frame?.imageBlob && frame.format !== 'raw') {
      blobUrlRef.current = URL.createObjectURL(frame.imageBlob);
      setBlobUrl(blobUrlRef.current);
    } else {
      setBlobUrl(null);
    }
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [frame?.imageBlob, frame?.format]);

  const isStreamActive = Date.now() - lastFrameTime < 2000 && frame !== null;

  return (
    <div className="h-full relative grid grid-cols-[1fr_500px] bg-slate-900">
      {/* Left: Remote Camera Feed */}
      <div className="relative h-full bg-black overflow-hidden flex items-center justify-center">
        {isStreamActive ? (
          <div className="w-full h-full relative">
            {frame?.format === 'raw' ? (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover opacity-90 transition-opacity duration-300"
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : blobUrl ? (
              <img
                src={blobUrl}
                alt="Remote Camera Feed"
                className="w-full h-full object-cover opacity-90 transition-opacity duration-300"
              />
            ) : null}

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
            <span className="text-blue-500">인식 중</span>
          </h2>
          <p className="text-2xl text-slate-400 mb-12 leading-relaxed">
            {text || "Please place your exhibition QR ticket within the scanner's view."}
          </p>

          <div className="p-8 bg-blue-500/10 rounded-3xl border border-blue-500/20 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🤖</span>
              <span className="text-lg font-bold text-blue-400 uppercase tracking-widest">[debug]Status</span>
            </div>
            <div className="text-2xl font-black text-white uppercase italic">
              {isStreamActive ? 'Vision System Online' : 'Connecting to Core...'}
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
      `}</style>
    </div>
  );
};

export default QR;
