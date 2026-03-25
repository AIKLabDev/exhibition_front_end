import React, { useEffect, useState } from 'react';
import './Farewell.css';

const PHRASES: { text: string; accent?: boolean }[] = [
  { text: '상품을', accent: true },
  { text: '수령해주세요' },
  { text: '참여해주셔서' },
  { text: '감사합니다' },
];

const PHRASE_INTERVAL_MS = 800;

const Farewell: React.FC = () => {
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
      style={{ boxShadow: 'inset 0 0 0 1px rgba(6, 182, 212, 0.15)' }}
    >
      <div className="farewell-phrase-stage" aria-live="polite">
        <p
          key={phraseIndex}
          className={`farewell-phrase-line${current.accent ? ' farewell-phrase-line--accent' : ''}`}
        >
          {current.text}
        </p>
      </div>
    </div>
  );
};

export default Farewell;
