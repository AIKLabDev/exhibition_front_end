import React from 'react';

interface WelcomeProps {
  onStart: () => void;
  text?: string;
  showGreeting?: boolean;
}

const TITLE = 'AIKOREA';

const Welcome: React.FC<WelcomeProps> = ({ onStart, text, showGreeting = false }) => {
  const displayTitle = (text && text.trim()) ? text : TITLE;

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

      <h1
        className="welcome-title font-black mb-8 tracking-tight text-center uppercase"
        style={{
          fontSize: 'clamp(3rem, 8vw, 10rem)',
          letterSpacing: '0.02em',
        }}
      >
        {displayTitle.split('').map((char, i) => (
          <span key={i} className="welcome-letter">
            {char}
          </span>
        ))}
      </h1>

      <p
        className="text-center font-medium tracking-wide max-w-[90%]"
        style={{
          fontSize: 'clamp(1.5rem, 3.5vw, 4.5rem)',
          color: 'var(--welcome-subtitle)',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          lineHeight: 1.4,
          marginBottom: '3rem',
        }}
      >
        Game에 참가하시면{' '}
        <span style={{ color: 'var(--welcome-accent)', fontWeight: 700 }}>
          소정의 상품
        </span>
        을 드립니다.
      </p>
    </div>
  );
};

export default Welcome;
