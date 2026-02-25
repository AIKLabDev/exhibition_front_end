/**
 * Game03 (Heart Hunt) 상수
 * REVEAL: 하트 위치 암기 시간, SHUFFLE: 카드 셔플 시간
 * 문자열은 여기서 한 곳에 모아 수정하기 쉽게 관리
 */

export const REVEAL_DURATION = 2000; // 2초
export const FLIPPING_BACK_DURATION = 600; // 0.6초
export const SHUFFLE_DURATION = 5000; // 5초
export const NUM_CARDS = 5;

/** 셔플 스왑 간격(ms): lerp(시작, 끝, progress) — 처음 느리게, 끝에 빠르게 */
export const SHUFFLE_START_INTERVAL_MS = 500;
export const SHUFFLE_END_INTERVAL_MS = 300;

/** 카드 위치 이동(셔플) 시 layout 애니메이션 — stiffness↓ 느리게, damping 조절로 떨림 제어 */
export const CARD_LAYOUT_TRANSITION = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

/** Game03 UI 문자열 — 수정 시 이 객체만 편집 */
export const GAME03_STRINGS = {
  /** 튜토리얼 (헤더 한 줄용: 타이틀 + 이 문구 + 버튼) */
  TUTORIAL_TITLE: '❤️를 기억하세요!',
  TUTORIAL_DESC: '카드를 잠깐 본 뒤 섞입니다. 하트가 있던 자리를 찾아 탭하세요!',
  TUTORIAL_DESC_ONE_LINE: '잠깐 본 뒤 섞이면 하트 자리를 찾아 탭하세요!',
  START_GAME: '게임 시작',
  MEMORIZE: '❤️를',
  MEMORIZE_SUB: '기억하세요!',
  SHUFFLE_PHASE_1: '셔플 중...',
  SHUFFLE_PHASE_2: '더 빨리!',
  SHUFFLE_PHASE_3: '최고 속도!',
  PICK_THE_HEART: '❤️를 맞춰보세요!',
  YOU_WIN: '정답! 🎉',
  GAME_OVER: '아쉽습니다 💀',
  TRY_AGAIN: '다시 시작',
  WAITING: '게임을 시작합니다...',
  CARD_BACK_AI: 'AI',
  CARD_HEART_LABEL: 'Heart',
  CARD_BOMB_LABEL: 'Bomb',
  CARD_HEART_ICON: '❤️',
  CARD_BOMB_ICON: '💣',
  CARD_LOGO_ALT: 'AI Korea',
} as const;

/** 카드 앞면 타입별 정의 — 새 카드 종류 추가 시 여기만 추가 */
export const CARD_FACE_CONFIG = {
  HEART: {
    icon: GAME03_STRINGS.CARD_HEART_ICON,
    label: GAME03_STRINGS.CARD_HEART_LABEL,
    borderClassName: 'border-red-500',
    labelClassName: 'text-red-600',
    iconClassName: 'animate-pulse',
  },
  BOMB: {
    icon: GAME03_STRINGS.CARD_BOMB_ICON,
    label: GAME03_STRINGS.CARD_BOMB_LABEL,
    borderClassName: 'border-zinc-300',
    labelClassName: 'text-zinc-800',
    iconClassName: '',
  },
} as const satisfies Record<string, {
  icon: string;
  label: string;
  borderClassName: string;
  labelClassName: string;
  iconClassName: string;
}>;
