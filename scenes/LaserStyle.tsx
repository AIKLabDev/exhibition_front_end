/**
 * LASER_STYLE Scene — 레이저 스타일 선택
 *
 * Python SKETCH_RESULT로 받은 4가지 스타일 이미지(Base64)를 카드로 표시.
 * 사용자가 하나를 터치하면 클릭 애니메이션 후 STYLE_SELECTED 이벤트를 백엔드에 전송.
 *
 * props.images: Base64 문자열 4개 (순서: REAL, ANIME, DISNEY, CHIBI)
 */

import React, { useState, useRef, useEffect } from 'react';

/** 클릭 피드백 애니메이션 길이 (ms). 이 시간이 지난 뒤 백엔드로 메시지 전달 */
const CLICK_ANIMATION_MS = 700;

interface LaserStyleProps {
  /** style: 스타일 ID (REAL, ANIME 등), number: 선택 번호 (1~4) — 백엔드로 둘 다 전달 */
  onSelect: (style: string, number: number) => void;
  /** SKETCH_RESULT에서 받은 Base64 이미지 4개 (순서: REAL, ANIME, DISNEY, CHIBI) */
  images?: string[];
}

const STYLES = [
  { id: 'REAL', label: 'REAL', desc: 'Realistic contour' },
  { id: 'ANIME', label: 'ANIME', desc: 'Anime style' },
  { id: 'DISNEY', label: 'DISNEY', desc: 'Disney style' },
  { id: 'CHIBI', label: 'CHIBI', desc: 'Chibi style' },
] as const;

const LaserStyle: React.FC<LaserStyleProps> = ({ onSelect, images = [] }) => {

  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const pendingSendRef = useRef<{ style: string; number: number } | null>(null);

  useEffect(() => {
    if (animatingId === null || pendingSendRef.current === null) return;
    const { style, number } = pendingSendRef.current;
    const t = setTimeout(() => {
      console.log('[LaserStyle] 클릭 애니메이션 완료 → 백엔드 전송:', style, '번호:', number);
      onSelect(style, number);
      pendingSendRef.current = null;
      setAnimatingId(null);
    }, CLICK_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [animatingId, onSelect]);

  const handleClick = (styleId: string, number: number) => {
    if (animatingId !== null) return;
    setAnimatingId(styleId);
    pendingSendRef.current = { style: styleId, number };
  };

  return (
    <div className="h-full flex flex-col py-4 px-8 bg-slate-900">
      <div className="pt-10 pb-2 flex justify-center">
        <h2 className="text-6xl font-black text-center tracking-tight text-white">레이저 스타일 선택</h2>
      </div>

      <div className="flex-1 min-h-0 flex justify-center items-center">
        <div className="flex justify-center items-stretch gap-20">
          {STYLES.map((style, index) => {
            const base64 = images[index];
            const imgSrc = base64 ? `data:image/jpeg;base64,${base64}` : undefined;
            const isAnimating = animatingId === style.id;

            return (
              <button
                key={style.id}
                onClick={() => handleClick(style.id, index + 1)}
                disabled={animatingId !== null}
                className={`group relative rounded-[2rem] border-[4px] transition-all duration-300 overflow-hidden
                  ${isAnimating
                    ? 'border-blue-400 bg-blue-500/10 scale-95 shadow-[0_0_40px_rgba(59,130,246,0.5)]'
                    : 'border-slate-700 hover:border-blue-400 active:scale-95'
                  }`}
                style={isAnimating ? { transitionDuration: `${CLICK_ANIMATION_MS}ms` } : undefined}
              >
                <div className="bg-white flex items-center justify-center relative w-[360px]" style={{ aspectRatio: '8/10' }}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={style.label}
                      className="w-full h-full object-contain object-top"
                    />
                  ) : (
                    <span className="text-5xl font-black text-blue-400">
                      {style.label.charAt(0)}
                    </span>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-14 pb-5 px-4 text-center">
                    <h3 className="text-3xl font-black mb-1 drop-shadow-lg">{style.label}</h3>
                    <p className="text-base text-slate-200 drop-shadow-md">{style.desc}</p>
                  </div>

                  {isAnimating && (
                    <span className="absolute inset-0 flex items-center justify-center bg-blue-500/30 text-6xl font-black text-white animate-pulse">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LaserStyle;
