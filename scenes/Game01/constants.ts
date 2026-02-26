/**
 * RPS Game Constants
 */

export const HAND_EMOJIS: Record<'rock' | 'paper' | 'scissors', string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

export const HYPE_PHRASES = [
  "준비됐어?",
  "시작해볼까?",
  "MOVE IT!",
  "어떻게 할까?",
];

/** 사용자에게 표시할 메시지 (쉽게 수정 가능) */
export const GAME01_MESSAGES = {
  /** 대기 화면 */
  idle: {
    hypeText: "준비됐어?",
    aiComment: "Show me what you've got.",
  },
  /** Vision 서버 미연결 시 */
  visionNotConnected: "Vision server not connected. Please check the connection.",
  /** 카운트다운 문구 (가위 → 바위 → 보) */
  countdown: ["가위", "바위", "보"] as const,
  /** "보" 표시 후 제스처 요청까지 대기(ms). 사용자가 손을 보여줄 시간 확보. 200~400 권장 */
  gestureRequestDelayMs: 300,
  /** 손 인식 중 */
  calculating: "인식 중...",
  /** 결과 - 승리 / 패배 / 무승부 */
  result: {
    win: { hypeText: "승리!", aiComment: "You got me!" },
    lose: { hypeText: "패배!", aiComment: "Better luck next time!" },
    draw: { hypeText: "비김!", aiComment: "Great minds think alike!" },
  },
  /** 인식 실패/오류 시 */
  error: {
    hypeText: "문제가 있네요",
    aiCommentFallback: "Failed to detect gesture. Please try again.",
  },
  /** 다음 라운드 준비 */
  goAgain: {
    hypeText: "다시 시작해볼까?",
    aiComment: "다음 번에 이겨보자.",
  },
  /** 한 판당 라운드 수 (n/3 판 표시용) */
  totalRounds: 3,
  /** UI 라벨 (스코어, 버튼 등) */
  ui: {
    human: "HUMAN",
    aiCore: "AI",
    gameTitle: "가위바위보",
    nextRound: "다음 라운드",
    startGame: "게임 시작",
    connecting: "연결 중...",
  },
  /** 튜토리얼 (씬 진입 시마다 표시) */
  tutorial: {
    title: "가위바위보 튜토리얼",
    steps: [
      "게임 시작 버튼을 누르면\n카운트다운이 시작됩니다.",
      '"가위" "바위" "보" 순서에 맞춰\n카메라에 손 모양을 보여주세요.',
      "3판 중 많이 이기는 쪽이 승리합니다.",
    ] as const,
    startButton: "게임 시작하기",
  },
  /** Python에서 받은 gesture → 화면에 표시할 문자열 (HUMAN 영역) */
  gestureDisplay: {
    rock: "바위",
    paper: "보",
    scissors: "가위",
    /** 아직 인식 전이거나 없을 때 */
    none: "-",
  },
} as const;
