/**
 * LASER_STYLE Scene — 레이저 스타일 선택
 *
 * Python SKETCH_RESULT로 받은 4가지 스타일 이미지(Base64)를 카드로 표시.
 * 사용자가 하나를 터치하면 클릭 애니메이션 후 STYLE_SELECTED 이벤트를 백엔드에 전송.
 *
 * props.images: Base64 문자열 4개 (순서: REAL, ANIME, DISNEY, CHIBI)
 */

import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import './LaserStyle.css';

/** 클릭 피드백 애니메이션 길이 (ms). 이 시간이 지난 뒤 백엔드로 메시지 전달 */
const CLICK_ANIMATION_MS = 700;

/** ls-tap 한 애니메이션 사이클 (ms) */
const HINT_TAP_CYCLE_MS = 2600;

/**
 * 카드 간 슬라이드 전환 시간 (ms). CSS transition과 동일.
 * HINT_TAP_CYCLE_MS의 rest 구간(0~15% = 390ms) 이내여야 슬라이드가
 * "손이 쉬는 동안" 일어나므로, 400ms로 설정 (15% × 2600ms = 390ms에 근접).
 */
const HINT_SLIDE_MS = 400;

/**
 * setInterval 주기 = 탭 한 사이클과 정확히 일치.
 * 슬라이드는 rest 구간(0~15%)에 시작·완료되므로 JS 리셋 없이 자연스럽게 동기화된다.
 * 동작: 슬라이드(400ms) → 손 쉬는 자리 도착 → 올라옴(15~40%) → 탭+리플(40%) → 복귀 → 슬라이드
 */
const HINT_DWELL_MS = HINT_TAP_CYCLE_MS; // 2600ms

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

/**
 * 터치 탭 제스처 힌트 오버레이.
 * forwardRef로 외부에서 ls-hint-wrapper DOM 노드에 직접 접근할 수 있도록 함.
 * LaserStyle에서 JS로 카드 위치를 측정해 wrapper의 left를 직접 설정함.
 */
const TouchHint = forwardRef<HTMLDivElement, { visible: boolean }>(({ visible }, ref) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div ref={ref} className="ls-hint-wrapper">
        {/* 손 아이콘 SVG — click.svg 기반, 흰색. 아래서 위로 탭하는 동작 */}
        <div className="ls-tap-hand">
          <svg
            width="96"
            height="96"
            viewBox="0 0 256 256"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <path
                d="M 68.929 30.449 h -0.581 c -1.475 0 -2.856 0.401 -4.044 1.1 c -0.448 -3.985 -3.84 -7.094 -7.943 -7.094 h -0.581 c -1.612 0 -3.115 0.48 -4.373 1.305 c -1.032 -3.22 -4.055 -5.558 -7.614 -5.558 h -0.581 c -1.454 0 -2.818 0.39 -3.994 1.071 V 7.994 C 39.218 3.586 35.632 0 31.225 0 h -0.582 c -4.407 0 -7.993 3.586 -7.993 7.994 v 31.859 l -4.147 3.148 c -2.983 2.265 -4.874 5.56 -5.325 9.277 c -0.451 3.719 0.598 7.37 2.954 10.282 l 12.333 15.247 v 6.209 c 0 3.299 2.685 5.983 5.984 5.983 h 30.455 c 3.299 0 5.983 -2.685 5.983 -5.983 v -5.901 c 3.897 -4.821 6.036 -10.835 6.036 -17.018 V 38.443 C 76.923 34.035 73.337 30.449 68.929 30.449 z M 72.923 61.098 c 0 5.45 -1.952 10.748 -5.499 14.928 c -0.336 0.361 -0.537 0.844 -0.537 1.364 v 6.627 c 0 1.094 -0.89 1.983 -1.983 1.983 H 34.449 c -1.094 0 -1.984 -0.89 -1.984 -1.983 V 77.1 c 0 -0.458 -0.157 -0.902 -0.445 -1.258 L 19.242 60.045 c -1.669 -2.063 -2.412 -4.65 -2.093 -7.285 c 0.319 -2.634 1.659 -4.969 3.773 -6.573 l 1.728 -1.312 v 8.36 c 0 1.104 0.896 2 2 2 s 2 -0.896 2 -2 v -12.37 c 0 -0.014 0 -0.029 0 -0.043 V 7.994 C 26.65 5.792 28.441 4 30.643 4 h 0.582 c 2.202 0 3.993 1.792 3.993 3.994 v 20.203 c 0 0 0 0 0 0.001 s 0 0 0 0.001 l 0.013 16.804 c 0.001 1.104 0.896 1.999 2 1.999 c 0 0 0.001 0 0.001 0 c 1.104 -0.001 2 -0.896 1.999 -2.001 l -0.013 -16.802 c 0 -2.202 1.792 -3.994 3.994 -3.994 h 0.581 c 2.202 0 3.994 1.792 3.994 3.994 v 4.253 c 0 0 0 0.001 0 0.001 c 0 0 0 0.001 0 0.001 l 0.013 12.551 c 0.001 1.104 0.896 1.998 2 1.998 c 0.001 0 0.001 0 0.002 0 c 1.104 -0.001 1.999 -0.897 1.998 -2.002 l -0.013 -12.549 c 0 -2.202 1.791 -3.994 3.993 -3.994 h 0.581 c 2.202 0 3.994 1.792 3.994 3.994 v 5.316 c -0.011 0.085 -0.026 0.169 -0.025 0.256 l 0.013 6.981 c 0.002 1.104 0.897 1.997 2 1.997 c 0.001 0 0.002 0 0.004 0 c 1.104 -0.002 1.998 -0.899 1.996 -2.003 l -0.011 -6.314 c 0.01 -0.08 0.024 -0.158 0.024 -0.24 c 0 -2.202 1.791 -3.994 3.993 -3.994 h 0.581 c 2.202 0 3.994 1.792 3.994 3.994 V 61.098 z"
                fill="gray"
                fillRule="nonzero"
              />
            </g>
          </svg>
        </div>
        {/* 접촉 시 퍼져나가는 리플 원 */}
        <div className="ls-tap-ripple" />
      </div>
    </div>
  );
});
TouchHint.displayName = 'TouchHint';

const LaserStyle: React.FC<LaserStyleProps> = ({ onSelect, images = [] }) => {

  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const pendingSendRef = useRef<{ style: string; number: number } | null>(null);

  /** 각 카드 버튼 DOM 참조 — 실제 렌더링 위치 측정에 사용 */
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** TouchHint 내부 ls-hint-wrapper DOM 참조 — JS로 left를 직접 설정 */
  const hintWrapperRef = useRef<HTMLDivElement>(null);

  /** 현재 손이 가리키고 있는 카드 인덱스 (sweep 루프 추적용) */
  const cardIdxRef = useRef(0);

  /**
   * 카드 인덱스를 받아 해당 카드 중심 위치를 측정하고
   * ls-hint-wrapper의 left를 직접 설정한다.
   * instant=true이면 transition 없이 즉시 이동 (첫 배치 또는 카드4→1 순환 시).
   *
   * JS 리셋 없이 타이밍을 맞추는 원리:
   *   - ls-tap 사이클 2600ms, HINT_DWELL_MS = 2600ms, HINT_SLIDE_MS = 400ms
   *   - setInterval이 2600ms마다 발생 → 발생 시점의 애니메이션 위상 ≈ 98% (rest 구간 85~100%)
   *   - 슬라이드 400ms 후 위상 ≈ 13% → 여전히 rest 구간(0~15%)
   *   - 이후 자연스럽게 탭 올라옴(15%) → 탭+리플(40%) → 복귀 → 다음 슬라이드
   */
  const moveToCard = useCallback((idx: number, instant = false) => {
    const wrapper = hintWrapperRef.current;
    const card = cardRefs.current[idx];
    if (!wrapper || !card) return;

    const parentRect = wrapper.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    const cardRect = card.getBoundingClientRect();
    const left = cardRect.left + cardRect.width / 2 - parentRect.left - 48;

    if (instant) {
      wrapper.style.transition = 'none';
      wrapper.style.left = `${left}px`;
      wrapper.getBoundingClientRect();
      wrapper.style.transition = `left ${HINT_SLIDE_MS}ms ease-in-out`;
    } else {
      wrapper.style.left = `${left}px`;
    }
  }, []);

  /**
   * animatingId가 null일 때(힌트가 표시될 때)만 sweep 루프를 시작한다.
   * setInterval로 HINT_DWELL_MS마다 다음 카드로 슬라이드 이동.
   * 마지막 카드(3)에서 다음 카드(0)로는 instant=true로 순간이동 후 재시작.
   */
  useEffect(() => {
    if (animatingId !== null) return;

    cardIdxRef.current = 0;

    // 컴포넌트가 마운트되고 ref가 붙을 시간을 50ms 준 뒤 첫 위치로 즉시 이동
    const initTimer = setTimeout(() => {
      moveToCard(0, true);
    }, 50);

    const interval = setInterval(() => {
      const next = (cardIdxRef.current + 1) % STYLES.length;
      cardIdxRef.current = next;
      // 마지막 → 첫 번째는 순간이동, 나머지는 슬라이드
      moveToCard(next, next === 0);
    }, HINT_DWELL_MS);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [animatingId, moveToCard]);

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

      {/* relative: TouchHint의 absolute inset-0이 이 컨테이너를 기준으로 배치됨 */}
      <div className="flex-1 min-h-0 flex justify-center items-center relative">
        <TouchHint visible={animatingId === null} ref={hintWrapperRef} />
        <div className="flex justify-center items-stretch gap-20">
          {STYLES.map((style, index) => {
            const base64 = images[index];
            const imgSrc = base64 ? `data:image/jpeg;base64,${base64}` : undefined;
            const isAnimating = animatingId === style.id;

            return (
              <button
                key={style.id}
                ref={el => { cardRefs.current[index] = el; }}
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
