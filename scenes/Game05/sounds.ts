/**
 * Game05 사운드 관리
 */

import { GameSounds } from './Game05.types';

function createAudio(src: string, options?: { loop?: boolean; volume?: number }): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'auto';
  if (options?.loop) audio.loop = true;
  if (options?.volume !== undefined) audio.volume = options.volume;
  audio.load();
  return audio;
}

export function initSounds(base: string): GameSounds {
  const hitSfxPool: HTMLAudioElement[] = [];
  for (let i = 0; i < 5; i++) {
    const hitSfx = createAudio(`${base}/asset/sound/hit1.wav`, { volume: 0.7 });
    hitSfxPool.push(hitSfx);
  }

  return {
    // BGM (루프)
    titleBgm: createAudio(`${base}/asset/sound/bgm_title.m4a`, { loop: true, volume: 0.5 }),
    stageBgm: createAudio(`${base}/asset/sound/bgm_stage.m4a`, { loop: true, volume: 0.6 }),
    runSfx: createAudio(`${base}/asset/sound/run.m4a`, { loop: true, volume: 0.3 }),

    // 결과 BGM
    resultWinBgm: createAudio(`${base}/asset/sound/bgm_result_win.m4a`, { volume: 0.7 }),
    resultDefeatBgm: createAudio(`${base}/asset/sound/bgm_result_defeat.m4a`, { volume: 0.7 }),

    // 컷씬 사운드
    winCutScene: createAudio(`${base}/asset/sound/cut_scene_win.m4a`, { volume: 0.5 }),
    defeatCutScene: createAudio(`${base}/asset/sound/cut_scene_defeat_die.m4a`, { volume: 0.7 }),

    // 게임 SFX
    attackSfx: createAudio(`${base}/asset/sound/attack.m4a`, { volume: 0.6 }),
    attackVoice: createAudio(`${base}/asset/sound/attack_1.m4a`, { volume: 0.5 }),
    heroHitSfx: createAudio(`${base}/asset/sound/hero_hit.m4a`, { volume: 0.7 }),
    friendHitSfx: createAudio(`${base}/asset/sound/friend_hit.m4a`, { volume: 0.9 }),
    energySfx: createAudio(`${base}/asset/sound/energy.m4a`, { volume: 0.9 }),
    hitSfxPool,
  };
}

export function playSfx(audio: HTMLAudioElement, playbackRate = 1.0): void {
  audio.currentTime = 0;
  audio.playbackRate = playbackRate;
  audio.play().catch(() => { });
}

export function stopAudio(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
}

export function stopAllSounds(sounds: GameSounds): void {
  stopAudio(sounds.titleBgm);
  stopAudio(sounds.stageBgm);
  stopAudio(sounds.runSfx);
  stopAudio(sounds.resultWinBgm);
  stopAudio(sounds.resultDefeatBgm);
  stopAudio(sounds.winCutScene);
  stopAudio(sounds.defeatCutScene);
}
