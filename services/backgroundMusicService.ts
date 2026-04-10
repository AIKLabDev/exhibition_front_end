/**
 * 전역 배경 BGM (public/sounds/background.mp3)
 * - GAME02/04/05(미니게임)에서는 재생 안 함
 * - `SceneDefine`에 없는 값(백엔드 오류 등 → App renderScene default "Scene Offline")일 때 재생 안 함
 * - sceneVoiceService: WAV 안내 음성 재생 중에는 볼륨 30% 덕킹
 */

import { SceneDefine } from '../protocol';

const BGM_PATH = '/sounds/background.mp3';

/** 미니게임 씬만 BGM 끔 (WELCOME 대기 씬은 BGM 재생) */
const SCENES_NO_BGM = new Set<SceneDefine>([
  SceneDefine.GAME02,
  SceneDefine.GAME04,
  SceneDefine.GAME05,
]);

const KNOWN_SCENE_VALUES = new Set<string>(Object.values(SceneDefine));

const VOLUME_NORMAL = 0.9;
const VOLUME_VOICE_DUCK = 0.3;

class BackgroundMusicService {
  private audio: HTMLAudioElement | null = null;
  private voiceDuck = false;

  private getAudio(): HTMLAudioElement {
    if (this.audio == null) {
      this.audio = new Audio(BGM_PATH);
      this.audio.loop = true;
      this.audio.preload = 'auto';
    }
    return this.audio;
  }

  private syncVolume(): void {
    if (this.audio == null) return;
    this.audio.volume = this.voiceDuck ? VOLUME_VOICE_DUCK : VOLUME_NORMAL;
  }

  /** WAV 재생 중이면 true → BGM 30% */
  setVoiceDucking(duck: boolean): void {
    this.voiceDuck = duck;
    this.syncVolume();
  }

  updateScene(scene: SceneDefine): void {
    const el = this.getAudio();
    this.syncVolume();

    const sceneKey = String(scene);
    if (!KNOWN_SCENE_VALUES.has(sceneKey)) {
      el.pause();
      el.currentTime = 0;
      return;
    }

    if (SCENES_NO_BGM.has(scene)) {
      el.pause();
      el.currentTime = 0;
      return;
    }

    el.play().catch((err) => {
      console.warn('[BackgroundMusic] play failed:', err);
    });
  }

  stop(): void {
    if (this.audio == null) return;
    this.audio.pause();
    this.audio.currentTime = 0;
  }
}

export const backgroundMusicService = new BackgroundMusicService();
