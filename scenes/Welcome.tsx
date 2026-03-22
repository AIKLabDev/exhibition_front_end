import React from 'react';
import './Welcome.css';

interface WelcomeProps {
  onStart: () => void;
  text?: string;
  showGreeting?: boolean;
}

/** 쇼츠 스타일 순차 등장용 문구 조각 (띄어쓰기는 chunk 끝에 포함) */
const SUBTITLE_CHUNKS: { text: string; accent?: boolean }[] = [
  { text: 'Game에 ' },
  { text: '참가하시면 ' },
  { text: '소정의 상품', accent: true },
  { text: '을 드립니다.' },
];

const Welcome: React.FC<WelcomeProps> = ({ onStart, text: _sceneText, showGreeting = false }) => {
  void _sceneText; // 백엔드 SET_SCENE text 유지용 (표시 안 함)

  return (
    <div
      className="welcome-root h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        boxShadow: 'inset 0 0 0 1px rgba(6, 182, 212, 0.15)',
      }}
    >
      {/* Subtle horizontal lines for depth */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
        <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--welcome-glow)] to-transparent" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--welcome-glow)] to-transparent" />
        <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--welcome-glow)] to-transparent" />
      </div>

      {/* 사람 감지 시 환영 메시지 오버레이 */}
      {showGreeting && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
        >
          <h2
            className="text-white font-black tracking-wider animate-scale-in"
            style={{
              fontSize: 'clamp(4rem, 12vw, 14rem)',
              textShadow: '0 0 60px var(--welcome-glow), 0 0 120px var(--welcome-accent)',
            }}
          >
            환영합니다
          </h2>
        </div>
      )}

      {/* 가운데 큰 눈 2개 — 깜빡임: Welcome.css */}
      <div className="welcome-eyes welcome-eyes--hero" aria-hidden>
        <div className="welcome-eye welcome-eye--left" />
        <div className="welcome-eye welcome-eye--right" />
      </div>

      {/* 유튜브 쇼츠 스타일: 구간마다 stagger delay로 촤라락 등장 후 루프 */}
      <p className="welcome-shorts-caption">
        {SUBTITLE_CHUNKS.map((chunk, i) => (
          <span
            key={i}
            className={`welcome-shorts-chunk${chunk.accent ? ' welcome-shorts-chunk--accent' : ''}`}
            style={
              {
                '--welcome-chunk-delay': `${i * 0.16}s`,
              } as React.CSSProperties
            }
          >
            {chunk.text}
          </span>
        ))}
      </p>
    </div>
  );
};

export default Welcome;
