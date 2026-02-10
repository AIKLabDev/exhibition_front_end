/**
 * 사운드 재생 모듈
 * - 씬/기능별 사운드 ID를 등록하고 preload, play, stop, volume 제어
 * - 리소스는 public/sounds/ 에 두고 /sounds/... 경로로 로드
 */

// =============================================================================
// 사운드 ID 및 경로 (파일 추가 시 여기 등록)
// =============================================================================

export const SoundId = {
  // Welcome
  WELCOME_BG: 'welcome_bg',
  WELCOME_CLICK: 'welcome_click',
  // QR
  QR_AMBIENT: 'qr_ambient',
  QR_CANCEL: 'qr_cancel',
  // SelectMinigame
  SELECT_SPIN: 'select_spin',
  SELECT_ASSIGN: 'select_assign',
  // Game01
  GAME01_BG: 'game01_bg',
  GAME01_COUNT: 'game01_count',
  GAME01_WIN: 'game01_win',
  GAME01_LOSE: 'game01_lose',
  GAME01_DRAW: 'game01_draw',
  // Game02
  GAME02_BG: 'game02_bg',
  GAME02_TICK: 'game02_tick',
  GAME02_WIN: 'game02_win',
  GAME02_LOSE: 'game02_lose',
  // GameResult
  RESULT_WIN: 'result_win',
  RESULT_LOSE: 'result_lose',
  // PickGift / Laser
  PICK_AMBIENT: 'pick_ambient',
  LASER_AMBIENT: 'laser_ambient',
  // 공용
  COMMON_CLICK: 'common_click',
  COMMON_ERROR: 'common_error',
} as const;

export type SoundIdType = (typeof SoundId)[keyof typeof SoundId];

/** 사운드 ID → public/sounds 기준 경로. 파일 추가 후 경로만 맞추면 됨 */
const SOUND_PATHS: Record<SoundIdType, string> = {
  [SoundId.WELCOME_BG]: '/sounds/welcome/bg.mp3',
  [SoundId.WELCOME_CLICK]: '/sounds/welcome/click.mp3',
  [SoundId.QR_AMBIENT]: '/sounds/qr/ambient.mp3',
  [SoundId.QR_CANCEL]: '/sounds/qr/cancel.mp3',
  [SoundId.SELECT_SPIN]: '/sounds/select_minigame/spin.mp3',
  [SoundId.SELECT_ASSIGN]: '/sounds/select_minigame/assign.mp3',
  [SoundId.GAME01_BG]: '/sounds/game01/bg.mp3',
  [SoundId.GAME01_COUNT]: '/sounds/game01/count.mp3',
  [SoundId.GAME01_WIN]: '/sounds/game01/win.mp3',
  [SoundId.GAME01_LOSE]: '/sounds/game01/lose.mp3',
  [SoundId.GAME01_DRAW]: '/sounds/game01/draw.mp3',
  [SoundId.GAME02_BG]: '/sounds/game02/bg.mp3',
  [SoundId.GAME02_TICK]: '/sounds/game02/tick.mp3',
  [SoundId.GAME02_WIN]: '/sounds/game02/win.mp3',
  [SoundId.GAME02_LOSE]: '/sounds/game02/lose.mp3',
  [SoundId.RESULT_WIN]: '/sounds/game_result/win.mp3',
  [SoundId.RESULT_LOSE]: '/sounds/game_result/lose.mp3',
  [SoundId.PICK_AMBIENT]: '/sounds/pick_gift/ambient.mp3',
  [SoundId.LASER_AMBIENT]: '/sounds/laser_style/ambient.mp3',
  [SoundId.COMMON_CLICK]: '/sounds/common/click.mp3',
  [SoundId.COMMON_ERROR]: '/sounds/common/error.mp3',
};

/** 씬별로 미리 로드해 두면 좋은 사운드 ID (선택 사용) */
export const SOUNDS_BY_SCENE: Record<string, SoundIdType[]> = {
  WELCOME: [SoundId.WELCOME_BG, SoundId.WELCOME_CLICK],
  QR: [SoundId.QR_AMBIENT, SoundId.QR_CANCEL],
  SELECT_MINIGAME: [SoundId.SELECT_SPIN, SoundId.SELECT_ASSIGN],
  GAME01: [SoundId.GAME01_BG, SoundId.GAME01_COUNT, SoundId.GAME01_WIN, SoundId.GAME01_LOSE, SoundId.GAME01_DRAW],
  GAME02: [SoundId.GAME02_BG, SoundId.GAME02_TICK, SoundId.GAME02_WIN, SoundId.GAME02_LOSE],
  GAME_RESULT: [SoundId.RESULT_WIN, SoundId.RESULT_LOSE],
  PICK_GIFT: [SoundId.PICK_AMBIENT],
  LASER_STYLE: [SoundId.LASER_AMBIENT],
  LASER_PROCESS: [],
};

// =============================================================================
// 서비스 구현
// =============================================================================

export interface PlayOptions {
  volume?: number;
  loop?: boolean;
}

class SoundService {
  private cache = new Map<SoundIdType, HTMLAudioElement>();

  private getPath(id: SoundIdType): string {
    const path = SOUND_PATHS[id];
    if (!path) {
      console.warn('[SoundService] Unknown sound id:', id);
      return '';
    }
    return path;
  }

  /** 해당 ID의 Audio 인스턴스 반환 (없으면 생성 후 로드) */
  getOrCreate(id: SoundIdType): HTMLAudioElement | null {
    const cached = this.cache.get(id);
    if (cached) return cached;

    const path = this.getPath(id);
    if (!path) return null;

    const audio = new Audio(path);
    this.cache.set(id, audio);
    return audio;
  }

  /** 한 개 또는 여러 개 사운드 미리 로드 (재생 지연 방지) */
  preload(ids: SoundIdType | SoundIdType[]): void {
    const list = Array.isArray(ids) ? ids : [ids];
    list.forEach((id) => this.getOrCreate(id));
  }

  /** 씬 진입 시 해당 씬 사운드 일괄 preload */
  preloadForScene(scene: string): void {
    const ids = SOUNDS_BY_SCENE[scene];
    if (ids?.length) this.preload(ids);
  }

  /**
   * 재생
   * - loop: true면 반복 (BGM 등)
   * - volume: 0~1 (기본 1)
   */
  play(id: SoundIdType, options: PlayOptions = {}): void {
    const audio = this.getOrCreate(id);
    if (!audio) return;

    const { volume = 1, loop = false } = options;
    audio.volume = Math.max(0, Math.min(1, volume)) * this.masterVolume;
    audio.loop = loop;

    audio.play().catch((err) => {
      console.warn('[SoundService] Play failed:', id, err);
    });
  }

  /** 정지 (일시정지 + 처음으로) */
  stop(id: SoundIdType): void {
    const audio = this.cache.get(id);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /** 일시정지만 (currentTime 유지) */
  pause(id: SoundIdType): void {
    const audio = this.cache.get(id);
    if (audio) audio.pause();
  }

  /** 볼륨만 변경 (0~1) */
  setVolume(id: SoundIdType, volume: number): void {
    const audio = this.cache.get(id);
    if (audio) audio.volume = Math.max(0, Math.min(1, volume));
  }

  /** 전역 볼륨 비율 (선택: 모든 재생 전에 적용하려면 play() 내부에서 곱해서 사용 가능) */
  private masterVolume = 1;
  setMasterVolume(ratio: number): void {
    this.masterVolume = Math.max(0, Math.min(1, ratio));
  }
  getMasterVolume(): number {
    return this.masterVolume;
  }
}

export const soundService = new SoundService();
