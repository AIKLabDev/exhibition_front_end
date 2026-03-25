import React from 'react';
import './Farewell.css';

const LINE1: { text: string; accent?: boolean }[] = [
  { text: '상품을', accent: true },
  { text: '수령해주세요' },
];

const LINE2: { text: string; accent?: boolean }[] = [
  { text: '참여해주셔서' },
  { text: '감사합니다' },
];

/** 같은 줄 안 조각 등장 간격(ms), 왼쪽 → 오른쪽 */
const STAGGER_MS = 420;
/** Farewell.css `.farewell-chip` 애니메이션 길이(초)와 동기 */
const CHIP_ANIM_MS = 550;
/** 1줄(상품을·수령해주세요)이 다 보인 뒤 2줄 시작 전 대기 */
const PAUSE_AFTER_LINE1_MS = 700;

const line2BaseDelayMs =
  STAGGER_MS + CHIP_ANIM_MS + PAUSE_AFTER_LINE1_MS;

const Farewell: React.FC = () => {
  return (
    <div
      className="welcome-root h-full flex flex-col items-center justify-center relative overflow-hidden px-6"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(6, 182, 212, 0.15)' }}
    >
      <div className="farewell-lines" aria-live="polite">
        <div className="farewell-row">
          {LINE1.map((p, i) => (
            <span
              key={p.text}
              className={`farewell-chip${p.accent ? ' farewell-chip--accent' : ''}`}
              style={{ animationDelay: `${(i * STAGGER_MS) / 1000}s` }}
            >
              {p.text}
            </span>
          ))}
        </div>
        <div className="farewell-row">
          {LINE2.map((p, i) => (
            <span
              key={p.text}
              className={`farewell-chip${p.accent ? ' farewell-chip--accent' : ''}`}
              style={{
                animationDelay: `${(line2BaseDelayMs + i * STAGGER_MS) / 1000}s`,
              }}
            >
              {p.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Farewell;
