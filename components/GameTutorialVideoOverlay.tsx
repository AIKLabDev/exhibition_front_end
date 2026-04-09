import React, { useEffect, useRef } from 'react';

export interface GameTutorialVideoOverlayProps {
  src: string;
  onEnded: () => void;
  className?: string;
}

/**
 * 타이틀 카운트다운 직후 본게임 전 튜토리얼 mp4 전체 화면 재생.
 * 재생 실패·로드 오류 시에도 onEnded로 흐름이 멈추지 않게 함.
 */
export const GameTutorialVideoOverlay: React.FC<GameTutorialVideoOverlayProps> = ({
  src,
  onEnded,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch((err) => {
      console.warn('[GameTutorialVideo] play failed:', src, err);
      onEndedRef.current();
    });
  }, [src]);

  return (
    <div
      className={`absolute inset-0 z-[35] flex items-center justify-center bg-black ${className}`}
      role="region"
      aria-label="튜토리얼 영상"
    >
      <video
        ref={videoRef}
        className="max-h-full max-w-full object-contain"
        src={src}
        playsInline
        preload="auto"
        onEnded={() => onEndedRef.current()}
        onError={() => {
          console.warn('[GameTutorialVideo] load/error:', src);
          onEndedRef.current();
        }}
      />
    </div>
  );
};
