/**
 * 씬 진입 시 안내 음성(WAV) 재생. 씬 이탈 시 즉시 정지.
 * Welcome만 트랙 종료 후 간격을 두고 다시 재생(간격은 appConstants.WELCOME_VOICE_GAP_MS).
 */

import { SceneDefine } from '../protocol';
import { WELCOME_VOICE_GAP_MS } from '../appConstants';
import { backgroundMusicService } from './backgroundMusicService';

type VoiceMode = 'loop' | 'once' | 'welcome_gap';

const SCENE_VOICE: Partial<Record<SceneDefine, { path: string; mode: VoiceMode }>> = {
  [SceneDefine.CAPTURE]: { path: '/sounds/capture/capture.wav', mode: 'loop' },
  [SceneDefine.FAREWELL]: { path: '/sounds/farewell/farewell.wav', mode: 'loop' },
  [SceneDefine.GAME_COMPLETE]: { path: '/sounds/gamecomplete/gamecomplete.wav', mode: 'once' },
  [SceneDefine.LASER_STYLE]: { path: '/sounds/laserstyle/laserstyle.wav', mode: 'once' },
  /** 대기/가공 진행 씬 — public/sounds/laserwait */
  [SceneDefine.LASER_PROCESS]: { path: '/sounds/laserwait/laserwait.wav', mode: 'loop' },
  [SceneDefine.PICK_GIFT]: { path: '/sounds/pickgift/pickgift.wav', mode: 'loop' },
  [SceneDefine.QR]: { path: '/sounds/qr/qr.wav', mode: 'loop' },
  [SceneDefine.REFILL_GIFT]: { path: '/sounds/refillgift/refillgift.wav', mode: 'loop' },
  [SceneDefine.WELCOME]: { path: '/sounds/welcome/welcome.wav', mode: 'welcome_gap' },
};

class SceneVoiceService {
  private audio: HTMLAudioElement | null = null;
  private activeScene: SceneDefine | null = null;
  private welcomeGapTimer: ReturnType<typeof setTimeout> | null = null;

  private ensureAudio(): HTMLAudioElement {
    if (this.audio == null) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
    }
    return this.audio;
  }

  private stopPlaybackOnly(): void {
    if (this.welcomeGapTimer != null) {
      clearTimeout(this.welcomeGapTimer);
      this.welcomeGapTimer = null;
    }
    if (this.audio) {
      this.audio.onended = null;
      this.audio.loop = false;
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  /** 현재 씬 음성만 끔 (씬 전환·언마운트용) */
  stop(): void {
    this.stopPlaybackOnly();
    this.activeScene = null;
    backgroundMusicService.setVoiceDucking(false);
  }

  /**
   * `currentScene`이 바뀔 때마다 호출. 이전 씬 음성은 항상 먼저 정지.
   */
  applyScene(scene: SceneDefine): void {
    this.stopPlaybackOnly();
    this.activeScene = scene;

    const cfg = SCENE_VOICE[scene];
    if (!cfg) {
      backgroundMusicService.setVoiceDucking(false);
      return;
    }

    const el = this.ensureAudio();

    if (cfg.mode === 'welcome_gap') {
      backgroundMusicService.setVoiceDucking(true);
      el.src = cfg.path;
      el.loop = false;
      el.load();
      el.onended = () => {
        backgroundMusicService.setVoiceDucking(false);
        if (this.activeScene !== SceneDefine.WELCOME) return;
        this.welcomeGapTimer = setTimeout(() => {
          this.welcomeGapTimer = null;
          if (this.activeScene !== SceneDefine.WELCOME) return;
          backgroundMusicService.setVoiceDucking(true);
          el.currentTime = 0;
          el.play().catch(() => {});
        }, WELCOME_VOICE_GAP_MS);
      };
      el.play().catch(() => {});
      return;
    }

    backgroundMusicService.setVoiceDucking(true);
    if (cfg.mode === 'once') {
      el.onended = () => {
        backgroundMusicService.setVoiceDucking(false);
      };
    } else {
      el.onended = null;
    }
    el.src = cfg.path;
    el.loop = cfg.mode === 'loop';
    el.load();
    el.play().catch(() => {});
  }
}

export const sceneVoiceService = new SceneVoiceService();
