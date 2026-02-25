/**
 * Game05 (플래포머) 타입 정의
 */

// ── Props ──
/** 디버그용: 마우스/키보드 입력 vs Vision(Python GAME05_ATTACK) 입력 */
export type Game05InputMode = 'mouse' | 'vision';

export interface Game05Props {
  onGameResult?: (result: 'WIN' | 'LOSE') => void;
  /** 백엔드 GAME_START 수신 시 App이 증가시켜 전달. 0 → N 되면 버튼 없이 게임 시작 */
  triggerStartFromBackend?: number;
  /** 디버그 UI에서 지정 시 강제 입력 모드. mouse=클릭/키보드, vision=Python GAME05_ATTACK 수신 시 공격 */
  inputMode?: Game05InputMode;
}

// ── 게임 상태 타입 ──
export type GameStateType = 'title' | 'playing' | 'victory' | 'defeat' | 'result';

// ── 적/친구 엔티티 ──
export interface EnemyLike {
  x: number;
  speed: number;
  frame: number;
  animTimer: number;
  alive: boolean;
  isFriend: boolean;
}

// ── 날아가는 적 (타격 후 애니메이션) ──
export interface FlyingEnemy {
  x: number;
  y: number;
  frame: number;
  timer: number;
  isFriend: boolean;
}

// ── 히트 이펙트 ──
export interface HitEffect {
  x: number;
  y: number;
  timer: number;
}

// ── 게임 내부 상태 ──
export interface GameState {
  gameState: GameStateType;
  titleBlinkTimer: number;
  resultTimer: number;
  resultType: 'win' | 'defeat';
  lastTime: number;
  currentFrame: number;
  animTimer: number;
  scrollX: number;
  charX: number;
  isAttacking: boolean;
  attackFrame: number;
  attackTimer: number;
  attackHitProcessed: boolean;
  enemies: EnemyLike[];
  enemySpawnTimer: number;
  enemySpawnCount: number;
  flyingEnemies: FlyingEnemy[];
  hitEffects: HitEffect[];
  friendOkTimer: number;
  score: number;
  hp: number;
  damageShakeTimer: number;
  damageRedTimer: number;
  heroHitTimer: number;
  gameTime: number;
  remainingTime: number;
  defeatTimer: number;
}

// ── 사운드 ──
export interface GameSounds {
  titleBgm: HTMLAudioElement;
  stageBgm: HTMLAudioElement;
  attackSfx: HTMLAudioElement;
  attackVoice: HTMLAudioElement;
  resultWinBgm: HTMLAudioElement;
  resultDefeatBgm: HTMLAudioElement;
  heroHitSfx: HTMLAudioElement;
  friendHitSfx: HTMLAudioElement;
  defeatCutScene: HTMLAudioElement;
  runSfx: HTMLAudioElement;
  winCutScene: HTMLAudioElement;
  energySfx: HTMLAudioElement;
  hitSfxPool: HTMLAudioElement[];
}

// ── 이미지 에셋 ──
export interface GameAssets {
  runFrames: HTMLImageElement[];
  attackFrames: HTMLImageElement[];
  enemyFrames: HTMLImageElement[];
  enemyHitImg: HTMLImageElement;
  hitEffectImg: HTMLImageElement;
  friendFrames: HTMLImageElement[];
  friendHitImg: HTMLImageElement;
  friendOkImg: HTMLImageElement;
  heartImg: HTMLImageElement;
  heroHitImg: HTMLImageElement;
  titleImg: HTMLImageElement;
  winImg: HTMLImageElement;
  defeatImg: HTMLImageElement;
  treesImg: HTMLImageElement;
  baseImg: HTMLImageElement;
  farImg: HTMLImageElement;
  groundImg: HTMLImageElement;
}

// ── State Handler 인터페이스 ──
export interface StateHandler {
  onEnter?: (state: GameState, sounds: GameSounds | null) => void;
  onExit?: (state: GameState, sounds: GameSounds | null) => void;
  update: (state: GameState, dt: number, assets: GameAssets, sounds: GameSounds | null) => GameStateType | null;
  render: (state: GameState, ctx: CanvasRenderingContext2D, assets: GameAssets, W: number, H: number) => void;
}

// ── 렌더링 컨텍스트 (draw 함수에 전달) ──
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  assets: GameAssets;
  state: GameState;
  W: number;
  H: number;
}
