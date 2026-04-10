/**
 * LeaderBoard.tsx
 * 게임 종료 후 리더보드 오버레이.
 * - 2560×720 ultrawide 기준: 좌/우 2컬럼으로 큰 글씨 표시
 * - 좌측 5행 / 우측 5행 (총 10행)
 * - 내 점수 포함 여부에 따라:
 *   · Top 10 안 → 해당 위치에 삽입 후 10번째 이하 밀림, 내 행 금색 하이라이트
 *   · Top 10 밖 → 역대 8위까지 표시 + 구분선 + 내 행 (총 10슬롯, 대칭 유지)
 * - autoCloseSeconds: 체인 모드에서 App의 MINIGAME_CHAIN_RESULT_HOLD_MS와 동일(초) 자동 닫기
 * - autoCloseSeconds null: 비체인 — 자동 닫기 없음, 탭으로만 닫기
 */

import React, { useEffect, useRef, useState } from 'react';

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type LeaderBoardGameType = 'game02' | 'game04' | 'game05';

export interface LeaderBoardProps {
  gameType: LeaderBoardGameType;
  /** onGameResult에서 받은 내 점수. game02는 남은 제한시간(초, GAME_RESULT의 score), game04/05는 포인트 */
  myScore: number;
  /** Python GAME_ID로 수신한 플레이어 식별자. 없으면 'YOU' */
  myGameId: string;
  /**
   * 자동 닫기(초). 체인: App hold와 동일. null이면 자동 없음(비체인), 원형 타이머 탭으로만 닫기.
   */
  autoCloseSeconds: number | null;
  /** 닫힌 후 App.tsx에서 체인 진행 또는 GAME_RESULT 전송 */
  onClose: () => void;
}

interface LeaderBoardEntry {
  game_id: string;
  rank: number;
  score: number;
}

interface LeaderBoardJson {
  entries: LeaderBoardEntry[];
  game: string;
  generated_at: string;
}

interface DisplayRow {
  rank: number;       // 표시 순위 (separator이면 0)
  game_id: string;
  score: number;
  isMe: boolean;
  isSeparator: boolean;
}

// ── 상수 ──────────────────────────────────────────────────────────────────────

const GAME_LABELS: Record<LeaderBoardGameType, string> = {
  game02: 'FIND OBJECT',
  game04: 'ZOMBIE DEFENDER',
  game05: 'PLATFORMER',
};

const SCORE_LABEL: Record<LeaderBoardGameType, string> = {
  game02: 'TIME LEFT (s)',
  game04: 'SCORE',
  game05: 'SCORE',
};

// ── 유틸: 10개 DisplayRow 배열 생성 ───────────────────────────────────────────

/**
 * 역대 기록과 내 점수를 병합해 정확히 10개의 DisplayRow를 반환.
 *
 * · 내 순위 ≤ 10: 해당 위치에 삽입 → 상위 10개 슬라이스 (기존 10위 밀려남)
 * · 내 순위 > 10: 역대 1~8위 + 구분선 + 내 행 = 10슬롯 (좌5/우5 대칭)
 */
function buildDisplayRows(
  entries: LeaderBoardEntry[],
  myScore: number,
  myGameId: string,
): DisplayRow[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const top10 = sorted.slice(0, 10);

  // 내 점수보다 높은 기존 항목 수 + 1 = 삽입 순위
  const betterCount = top10.filter((e) => e.score > myScore).length;
  const myRank = betterCount + 1;
  const isInTop10 = myRank <= 10;

  const meRow: DisplayRow = {
    rank: myRank,
    game_id: myGameId || 'YOU',
    score: myScore,
    isMe: true,
    isSeparator: false,
  };

  if (isInTop10) {
    // 기존 목록에 내 항목 삽입 후 상위 10개
    const merged: DisplayRow[] = [];
    let inserted = false;
    let displayRank = 1;

    for (const e of top10) {
      if (!inserted && e.score <= myScore) {
        merged.push({ ...meRow, rank: displayRank++ });
        inserted = true;
      }
      merged.push({ rank: displayRank++, game_id: e.game_id, score: e.score, isMe: false, isSeparator: false });
    }
    if (!inserted) {
      merged.push({ ...meRow, rank: displayRank });
    }

    const topSlice = merged.slice(0, 10);
    // 역대 데이터가 적을 때도 좌 5 / 우 5 슬롯을 항상 채워 패널 높이 유지
    const emptySlot: DisplayRow = {
      rank: 0,
      game_id: '',
      score: 0,
      isMe: false,
      isSeparator: false,
    };
    while (topSlice.length < 10) {
      topSlice.push({ ...emptySlot });
    }
    return topSlice;
  } else {
    // 역대 8위까지 + 구분선 + 내 행 = 10슬롯
    const top8 = sorted.slice(0, 8).map((e, i) => ({
      rank: i + 1,
      game_id: e.game_id,
      score: e.score,
      isMe: false,
      isSeparator: false,
    }));

    // 8개 미만이면 빈 행으로 채워 좌5/우5 대칭 유지
    while (top8.length < 8) {
      top8.push({ rank: 0, game_id: '', score: 0, isMe: false, isSeparator: false });
    }

    const sep: DisplayRow = { rank: 0, game_id: '···', score: 0, isMe: false, isSeparator: true };

    return [...top8, sep, { ...meRow, rank: myRank }];
  }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

const LeaderBoard: React.FC<LeaderBoardProps> = ({
  gameType,
  myScore,
  myGameId,
  autoCloseSeconds,
  onClose,
}) => {
  const [entries, setEntries] = useState<LeaderBoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const hasAutoClose = typeof autoCloseSeconds === 'number' && autoCloseSeconds > 0;
  const [secondsLeft, setSecondsLeft] = useState(() => (hasAutoClose ? autoCloseSeconds! : 0));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // leaderboard JSON fetch (재시도 3회, 지수 백오프)
  useEffect(() => {
    let cancelled = false;
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 300;

    async function load() {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const url = `/leaderboard/${gameType}_leaderboard.json?t=${Date.now()}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json: LeaderBoardJson = await res.json();
          if (cancelled) return;
          setEntries(json.entries ?? []);
          setLoading(false);
          return;
        } catch (err) {
          console.warn(`[LeaderBoard] fetch attempt ${attempt}/${MAX_RETRIES} failed:`, err);
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, BASE_DELAY_MS * attempt));
          }
        }
      }
      if (cancelled) return;
      console.error('[LeaderBoard] 모든 재시도 실패');
      setFetchError(true);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [gameType]);

  // 체인: N초 카운트다운 후 자동 onClose (App hold와 동일). 비체인(null): 타이머 없음
  useEffect(() => {
    if (!hasAutoClose || autoCloseSeconds == null) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(autoCloseSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onCloseRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasAutoClose, autoCloseSeconds]);

  const rows = buildDisplayRows(entries, myScore, myGameId);
  const leftRows = rows.slice(0, 5);
  const rightRows = rows.slice(5, 10);

  // SVG 카운트다운 원형
  const r = 32;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = hasAutoClose && autoCloseSeconds
    ? circumference * (1 - secondsLeft / autoCloseSeconds)
    : 0;

  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
    >
      {/* 패널 — 1800px × 1.28 ≈ 2300px 고정 */}
      <div
        className="relative flex flex-col"
        style={{
          width: '2300px',
          background: 'linear-gradient(155deg, rgba(8,12,30,0.98) 0%, rgba(4,7,18,0.99) 100%)',
          border: '1px solid rgba(99,179,237,0.2)',
          borderRadius: '22px',
          boxShadow: '0 0 80px rgba(66,153,225,0.12), 0 0 0 1px rgba(99,179,237,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* 상단 글로우 라인 */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent 0%, #63b3ed 30%, #f6ad55 50%, #63b3ed 70%, transparent 100%)' }} />

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-14 pt-7 pb-5">
          {/* 좌: 타이틀 */}
          <div>
            <p
              className="font-black tracking-[0.4em] uppercase"
              style={{ color: '#63b3ed', fontSize: '16px' }}
            >
              {GAME_LABELS[gameType]}
            </p>
            <h2
              className="font-black tracking-widest uppercase mt-1"
              style={{ color: '#e2e8f0', fontSize: '54px', textShadow: '0 0 28px rgba(99,179,237,0.5)', lineHeight: 1.1 }}
            >
              LEADERBOARD
            </h2>
          </div>

          {/* 우: 내 점수 + 카운트다운 */}
          <div className="flex items-center gap-10">
            <div className="text-right">
              <p className="font-bold tracking-widest uppercase" style={{ color: '#4a5568', fontSize: '13px' }}>
                {SCORE_LABEL[gameType]}
              </p>
              <p className="font-black" style={{ color: '#f6ad55', fontSize: '28px', letterSpacing: '0.05em', textShadow: '0 0 14px rgba(246,173,85,0.45)' }}>
                MY SCORE &nbsp; {myScore.toLocaleString()}
              </p>
            </div>

            {/* 원형 카운트다운 타이머 */}
            <div
              className="relative flex items-center justify-center cursor-pointer select-none"
              onClick={onClose}
            >
              <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
                <circle
                  cx="44"
                  cy="44"
                  r={r}
                  fill="none"
                  stroke="#63b3ed"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center" style={{ gap: 0 }}>
                <span className="font-black" style={{ color: '#e2e8f0', fontSize: hasAutoClose ? '30px' : '22px', lineHeight: 1 }}>
                  {hasAutoClose ? secondsLeft : 'TAP'}
                </span>
                <span className="font-bold tracking-widest" style={{ color: '#4a5568', fontSize: '10px' }}>
                  {hasAutoClose ? 'CLOSE' : 'TO CLOSE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 본문: 2컬럼 ── */}
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="w-12 h-12 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            <span className="ml-4 font-bold tracking-widest" style={{ color: '#718096', fontSize: '18px' }}>
              LOADING...
            </span>
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-14">
            <span className="font-bold tracking-wider" style={{ color: '#fc8181', fontSize: '18px' }}>
              데이터를 불러올 수 없습니다
            </span>
          </div>
        ) : (
          <div className="flex pb-7 px-8 gap-0">
            {/* 좌측 컬럼 (1~5위) */}
            <div className="flex-1 pr-8">
              <ColumnHeader scoreLabel={SCORE_LABEL[gameType]} />
              <div className="flex flex-col gap-2 mt-2">
                {leftRows.map((row, i) => (
                  <RankRow key={`L${i}`} row={row} />
                ))}
              </div>
            </div>

            {/* 컬럼 구분선 */}
            <div
              style={{
                width: '1px',
                background: 'linear-gradient(180deg, transparent, rgba(99,179,237,0.25) 20%, rgba(99,179,237,0.25) 80%, transparent)',
                flexShrink: 0,
              }}
            />

            {/* 우측 컬럼 (6~10위 또는 6~8 + 구분 + 내 행) */}
            <div className="flex-1 pl-8">
              <ColumnHeader scoreLabel={SCORE_LABEL[gameType]} />
              <div className="flex flex-col gap-2 mt-2">
                {rightRows.map((row, i) => (
                  <RankRow key={`R${i}`} row={row} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── 컬럼 헤더 ────────────────────────────────────────────────────────────────

const ColumnHeader: React.FC<{ scoreLabel: string }> = ({ scoreLabel }) => (
  <div
    className="flex items-center rounded-xl px-6 py-3"
    style={{ background: 'rgba(99,179,237,0.07)', flexShrink: 0 }}
  >
    <span className="font-black tracking-widest uppercase text-center" style={{ color: '#4a5568', fontSize: '14px', width: '72px', flexShrink: 0 }}>
      #
    </span>
    <span className="flex-1 font-black tracking-widest uppercase pl-2" style={{ color: '#4a5568', fontSize: '14px' }}>
      PLAYER
    </span>
    <span className="font-black tracking-widest uppercase text-right" style={{ color: '#4a5568', fontSize: '14px', width: '170px', flexShrink: 0 }}>
      {scoreLabel}
    </span>
  </div>
);

// ── 개별 행 컴포넌트 ──────────────────────────────────────────────────────────

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#f6e05e', '#cbd5e0', '#c05621'];

const RankRow: React.FC<{ row: DisplayRow }> = ({ row }) => {
  // 빈 행 — 고정 높이 (1800px 버전 76px × 1.28 ≈ 97px)
  if (!row.isSeparator && !row.isMe && row.rank === 0 && row.game_id === '') {
    return <div style={{ minHeight: '97px' }} />;
  }

  // 구분선 행
  if (row.isSeparator) {
    return (
      <div className="flex items-center gap-4 px-6" style={{ height: '42px' }}>
        <div className="flex-1 border-t border-dashed" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <span className="font-bold tracking-widest" style={{ color: '#2d3748', fontSize: '20px' }}>···</span>
        <div className="flex-1 border-t border-dashed" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>
    );
  }

  const hasMedal = row.rank <= 3 && !row.isMe;

  return (
    <div
      className="flex items-center rounded-2xl"
      style={{
        padding: '18px 22px',
        minHeight: '97px',
        background: row.isMe
          ? 'linear-gradient(90deg, rgba(246,173,85,0.22) 0%, rgba(246,173,85,0.07) 100%)'
          : hasMedal
          ? 'rgba(255,255,255,0.028)'
          : 'transparent',
        borderLeft: row.isMe ? '5px solid #f6ad55' : '5px solid transparent',
        boxShadow: row.isMe ? '0 0 30px rgba(246,173,85,0.12)' : 'none',
      }}
    >
      {/* 순위 번호 / 메달 */}
      <div style={{ width: '72px', flexShrink: 0, textAlign: 'center' }}>
        {hasMedal ? (
          <span style={{ fontSize: '42px', lineHeight: 1 }}>{MEDAL_ICONS[row.rank - 1]}</span>
        ) : (
          <span
            className="font-black tabular-nums"
            style={{ color: row.isMe ? '#f6ad55' : '#4a5568', fontSize: '30px' }}
          >
            {row.isMe && row.rank > 10 ? '-' : row.rank}
          </span>
        )}
      </div>

      {/* 플레이어 이름 + YOU 배지 */}
      <div className="flex-1 flex items-center gap-4 pl-4 min-w-0">
        <span
          className="font-black truncate"
          style={{
            color: row.isMe ? '#fbd38d' : hasMedal ? MEDAL_COLORS[row.rank - 1] : '#a0aec0',
            fontSize: row.isMe ? '34px' : '30px',
            letterSpacing: '0.04em',
            lineHeight: 1.2,
          }}
        >
          {row.game_id}
        </span>
        {row.isMe && (
          <span
            className="flex-shrink-0 font-black tracking-widest rounded-full"
            style={{
              background: 'rgba(246,173,85,0.18)',
              color: '#f6ad55',
              border: '1px solid rgba(246,173,85,0.5)',
              fontSize: '14px',
              padding: '4px 16px',
            }}
          >
            YOU
          </span>
        )}
      </div>

      {/* 점수 */}
      <div style={{ width: '170px', flexShrink: 0, textAlign: 'right' }}>
        <span
          className="font-black tabular-nums"
          style={{
            color: row.isMe ? '#f6ad55' : hasMedal ? MEDAL_COLORS[row.rank - 1] : '#718096',
            fontSize: row.isMe ? '44px' : '36px',
            textShadow: row.isMe ? '0 0 20px rgba(246,173,85,0.6)' : 'none',
            lineHeight: 1,
          }}
        >
          {row.score.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default LeaderBoard;
