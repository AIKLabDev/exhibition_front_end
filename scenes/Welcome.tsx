import React, { useEffect, useState } from 'react';
import './Welcome.css';

interface WelcomeProps {
  onStart: () => void;
  text?: string;
  showGreeting?: boolean;
}

/** 순서대로 한 줄씩 표시 후 다음으로 (띄어쓰기 없이 구만 구분) */
const PHRASES: { text: string; accent?: boolean }[] = [
  { text: '게임에' },
  { text: '참여하시고' },
  { text: '선물을', accent: true },
  { text: '받아가세요' },
];

/** 한 구절당 표시 시간(ms). CSS welcome-phrase-pop 길이(2.15s)와 맞춤 */
const PHRASE_INTERVAL_MS = 1200;

const Welcome: React.FC<WelcomeProps> = ({ onStart, text: _sceneText, showGreeting = false }) => {
  void _sceneText;
  void onStart;

  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const current = PHRASES[phraseIndex];

  return (
    <div
      className="welcome-root h-full flex flex-col items-stretch justify-center relative overflow-hidden"
      style={{
        boxShadow: 'inset 0 0 0 1px rgba(6, 182, 212, 0.15)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
        <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--welcome-glow)] to-transparent" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--welcome-glow)] to-transparent" />
        <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--welcome-glow)] to-transparent" />
      </div>

      {showGreeting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
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

      <div className="welcome-phrase-stage" aria-live="polite">
        <p
          key={phraseIndex}
          className={`welcome-phrase-line${current.accent ? ' welcome-phrase-line--accent' : ''}`}
        >
          {current.text}
        </p>
      </div>
    </div>
  );
};

export default Welcome;
