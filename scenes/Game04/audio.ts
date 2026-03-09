const GAME04_SOUND_BASE = '/sounds/game04';

type Pool = {
  voices: HTMLAudioElement[];
  cursor: number;
  volume: number;
};

function createAudio(src: string, options?: { loop?: boolean; volume?: number }): HTMLAudioElement {
  const audio = document.createElement('audio');
  audio.preload = 'auto';
  if (options?.loop) audio.loop = true;
  if (options?.volume !== undefined) audio.volume = options.volume;

  const preferredSources = (() => {
    const match = src.match(/\.(m4a|mp3|wav)$/i);
    if (!match) {
      return [{ src, type: 'audio/mpeg' }];
    }

    const stem = src.slice(0, -match[0].length);
    return [
      { src: `${stem}.m4a`, type: 'audio/mp4' },
      { src: `${stem}.mp3`, type: 'audio/mpeg' },
      { src: `${stem}.wav`, type: 'audio/wav' },
    ];
  })();

  preferredSources.forEach(({ src: candidateSrc, type }) => {
    const source = document.createElement('source');
    source.src = candidateSrc;
    source.type = type;
    audio.appendChild(source);
  });

  audio.load();
  return audio;
}

function createPool(src: string, size: number, volume: number): Pool {
  return {
    voices: Array.from({ length: size }, () => createAudio(src, { volume })),
    cursor: 0,
    volume,
  };
}

function stopAudio(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
}

function stopPool(pool: Pool): void {
  pool.voices.forEach(stopAudio);
}

function playOneShot(audio: HTMLAudioElement, playbackRate = 1, volumeOverride?: number): void {
  audio.pause();
  audio.currentTime = 0;
  audio.playbackRate = playbackRate;
  if (volumeOverride !== undefined) {
    audio.volume = volumeOverride;
  }
  audio.play().catch(() => {});
}

function playPool(pool: Pool, playbackRate = 1, volumeScale = 1): void {
  const audio = pool.voices[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.voices.length;
  playOneShot(audio, playbackRate, Math.max(0, Math.min(1, pool.volume * volumeScale)));
}

export class Game04AudioController {
  private readonly titleLoop = createAudio(`${GAME04_SOUND_BASE}/title_loop.wav`, { loop: true, volume: 0.34 });
  private readonly battleLoop = createAudio(`${GAME04_SOUND_BASE}/battle_loop.wav`, { loop: true, volume: 0.56 });
  private readonly bossWarning = createAudio(`${GAME04_SOUND_BASE}/boss_warning.wav`, { volume: 0.72 });
  private readonly victory = createAudio(`${GAME04_SOUND_BASE}/victory.wav`, { volume: 0.68 });
  private readonly defeat = createAudio(`${GAME04_SOUND_BASE}/defeat.wav`, { volume: 0.64 });

  private readonly shootPool = createPool(`${GAME04_SOUND_BASE}/gun_shot.wav`, 10, 0.42);
  private readonly zombieHitPool = createPool(`${GAME04_SOUND_BASE}/zombie_hit.wav`, 8, 0.56);
  private readonly damagePool = createPool(`${GAME04_SOUND_BASE}/player_damage.wav`, 4, 0.58);
  private readonly zombieSpawnPool = createPool(`${GAME04_SOUND_BASE}/zombie_spawn.wav`, 5, 0.48);
  private readonly zombieGroanPool = createPool(`${GAME04_SOUND_BASE}/zombie_groan.wav`, 4, 0.36);

  private activeLoop: HTMLAudioElement | null = null;
  private zombieGroanCooldownUntil = 0;
  private zombieSpawnCooldownUntil = 0;

  preload(): void {
    [
      this.titleLoop,
      this.battleLoop,
      this.bossWarning,
      this.victory,
      this.defeat,
      ...this.shootPool.voices,
      ...this.zombieHitPool.voices,
      ...this.damagePool.voices,
      ...this.zombieSpawnPool.voices,
      ...this.zombieGroanPool.voices,
    ].forEach((audio) => audio.load());
  }

  playTitleLoop(): void {
    this.stopCombatSfx();
    stopAudio(this.bossWarning);
    stopAudio(this.victory);
    stopAudio(this.defeat);
    this.switchLoop(this.titleLoop);
  }

  startBattleLoop(): void {
    this.stopCombatSfx();
    stopAudio(this.bossWarning);
    stopAudio(this.victory);
    stopAudio(this.defeat);
    this.switchLoop(this.battleLoop);
  }

  startBossPhase(): void {
    stopAudio(this.victory);
    stopAudio(this.defeat);
    this.switchLoop(this.battleLoop);
    playOneShot(this.bossWarning, 1);
  }

  playShoot(): void {
    playPool(this.shootPool, 0.94 + Math.random() * 0.08, 0.96 + Math.random() * 0.1);
  }

  playZombieHit(): void {
    playPool(this.zombieHitPool, 0.94 + Math.random() * 0.08, 0.96 + Math.random() * 0.12);
  }

  playPlayerDamage(): void {
    playPool(this.damagePool, 0.95 + Math.random() * 0.08, 0.96 + Math.random() * 0.1);
  }

  playZombieSpawn(): void {
    const now = Date.now();
    if (now < this.zombieSpawnCooldownUntil) {
      return;
    }

    playPool(this.zombieSpawnPool, 0.92 + Math.random() * 0.1, 0.95 + Math.random() * 0.12);
    this.zombieSpawnCooldownUntil = now + 420;
  }

  maybePlayZombieGroan(nearbyZombieCount: number, enabled: boolean): void {
    if (!enabled || nearbyZombieCount <= 0) {
      return;
    }

    const now = Date.now();
    if (now < this.zombieGroanCooldownUntil) {
      return;
    }

    const intensityBoost = Math.min(1.2, 0.92 + nearbyZombieCount * 0.035);
    playPool(this.zombieGroanPool, 0.92 + Math.random() * 0.08, intensityBoost);
    this.zombieGroanCooldownUntil = now + Math.max(2400, 4200 - nearbyZombieCount * 80);
  }

  playResult(result: 'WIN' | 'LOSE'): void {
    this.stopCombatSfx();
    stopAudio(this.bossWarning);
    this.switchLoop(null);
    if (result === 'WIN') {
      playOneShot(this.victory);
      stopAudio(this.defeat);
    } else {
      playOneShot(this.defeat);
      stopAudio(this.victory);
    }
  }

  stopAll(): void {
    this.switchLoop(null);
    [this.bossWarning, this.victory, this.defeat].forEach(stopAudio);
    this.stopCombatSfx();
  }

  stopCombatSfx(): void {
    [this.shootPool, this.zombieHitPool, this.damagePool, this.zombieSpawnPool, this.zombieGroanPool].forEach(stopPool);
  }

  dispose(): void {
    this.stopAll();
  }

  private switchLoop(nextLoop: HTMLAudioElement | null): void {
    if (this.activeLoop === nextLoop) {
      if (nextLoop && nextLoop.paused) {
        nextLoop.play().catch(() => {});
      }
      return;
    }

    if (this.activeLoop) {
      stopAudio(this.activeLoop);
    }

    this.activeLoop = nextLoop;
    if (nextLoop) {
      nextLoop.currentTime = 0;
      nextLoop.play().catch(() => {});
    }
  }
}

export function createGame04AudioController(): Game04AudioController {
  return new Game04AudioController();
}
