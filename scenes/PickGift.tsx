
import React from 'react';

interface PickGiftProps {
  progress: number;
  label: string;
}

// ============================================================
// 텍스트 상수 - 필요시 여기서 변경
// ============================================================

// 메인 제목
const TEXT_TITLE_MAIN = '상품';
const TEXT_TITLE_HIGHLIGHT = '배송';

// 상태별 설명 텍스트
const TEXT_PICKING = '상품을 찾는중...';    // isPicking === true
const TEXT_PLACING = '상품을 배송합니다...'; // isPicking === false

// 워크플로우 라벨
const TEXT_LABEL_STORAGE = '창고';
const TEXT_LABEL_DELIVERY = '배송';
const TEXT_ROBOT_ACTIVE = 'ROBOT 동작중';

// Legend 텍스트
const TEXT_PHASE1 = '단계 1: 상품 찾기';
const TEXT_PHASE2 = '단계 2: 상품 배송';

// 이모지/아이콘
const ICON_STORAGE = '📦';
const ICON_ROBOT = '🦾';
const ICON_DELIVERY = '📥';
const ICON_COMPLETE = '✅';

const PickGift: React.FC<PickGiftProps> = ({ progress, label }) => {
  // Determine phase based on progress
  const isPicking = progress < 0.5;
  const stageProgress = isPicking ? progress * 2 : (progress - 0.5) * 2;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900 p-20">
      <div className="w-full max-w-7xl">
        <div className="flex justify-between items-end mb-16">
          <div className="text-left">
            <h2 className="text-7xl font-black uppercase tracking-tighter mb-4 italic">
              {TEXT_TITLE_MAIN} <span className="text-blue-500">{TEXT_TITLE_HIGHLIGHT}</span>
            </h2>
            <p className="text-3xl text-white/50 font-bold uppercase tracking-widest">
              {label || (isPicking ? TEXT_PICKING : TEXT_PLACING)}
            </p>
          </div>
          <div className="text-9xl font-black text-blue-500/20 italic">
            {Math.round(progress * 100)}%
          </div>
        </div>

        {/* Visual Workflow */}
        <div className="relative h-64 bg-black/40 rounded-[3rem] border-4 border-white/5 flex items-center px-12 overflow-hidden shadow-inner">
          {/* Track Line */}
          <div className="absolute top-1/2 left-24 right-24 h-2 bg-white/10 -translate-y-1/2" />

          {/* Start Point */}
          <div className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center border-4 transition-colors ${isPicking ? 'border-blue-500 bg-blue-500' : 'border-blue-500 bg-blue-500/20'}`}>
            <span className="text-4xl">{ICON_STORAGE}</span>
            <div className="absolute -top-12 whitespace-nowrap font-black uppercase text-sm tracking-widest">{TEXT_LABEL_STORAGE}</div>
          </div>

          {/* Robot Arm representation */}
          <div
            className="absolute top-1/2 -translate-y-1/2 flex items-center transition-all duration-300 ease-out"
            style={{ left: `calc(6rem + ${progress * (100 - 12)}%)` }}
          >
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] rotate-45 border-4 border-white/20">
              <span className="-rotate-45 text-4xl">{ICON_ROBOT}</span>
            </div>
            {progress > 0 && progress < 1 && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-sm font-black px-4 py-1 rounded-full whitespace-nowrap animate-pulse">
                {TEXT_ROBOT_ACTIVE}
              </div>
            )}
          </div>

          {/* Delivery Point */}
          <div className={`relative z-10 ml-auto w-24 h-24 rounded-full flex items-center justify-center border-4 transition-colors ${progress >= 1.0 ? 'border-green-500 bg-green-500' : 'border-white/20 bg-white/5'}`}>
            <span className="text-4xl">{progress >= 1.0 ? ICON_COMPLETE : ICON_DELIVERY}</span>
            <div className="absolute -top-12 whitespace-nowrap font-black uppercase text-sm tracking-widest">{TEXT_LABEL_DELIVERY}</div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 flex gap-12 justify-center">
          <div className={`flex items-center gap-4 text-2xl font-bold uppercase ${isPicking ? 'text-white' : 'text-white/20'}`}>
            <div className={`w-6 h-6 rounded-full ${isPicking ? 'bg-blue-500' : 'bg-white/10'}`} />
            {TEXT_PHASE1}
          </div>
          <div className={`flex items-center gap-4 text-2xl font-bold uppercase ${!isPicking && progress < 1 ? 'text-white' : 'text-white/20'}`}>
            <div className={`w-6 h-6 rounded-full ${!isPicking && progress < 1 ? 'bg-blue-500' : 'bg-white/10'}`} />
            {TEXT_PHASE2}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickGift;
