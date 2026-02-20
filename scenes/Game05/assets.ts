/**
 * Game05 에셋 로딩
 */

import { GameAssets } from './Game05.types';

function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[Game05] Failed to load: ${src}`);
      resolve(img);
    };
    img.src = src;
  });
}

async function loadFramesFromFolder(folder: string, maxProbe = 100): Promise<HTMLImageElement[]> {
  const probes: Promise<{ idx: number; img: HTMLImageElement } | null>[] = [];
  for (let i = 0; i < maxProbe; i++) {
    probes.push(
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ idx: i, img });
        img.onerror = () => resolve(null);
        img.src = `${folder}/${i}.png`;
      })
    );
  }
  const results = await Promise.all(probes);
  const frames = results
    .filter((r): r is { idx: number; img: HTMLImageElement } => r !== null)
    .sort((a, b) => a.idx - b.idx)
    .map((r) => r.img);
  console.log(`[Game05] ${folder}: ${frames.length} frames loaded`);
  return frames;
}

export async function loadAllAssets(base: string): Promise<GameAssets> {
  const [runFrames, attackFrames, enemyFrames, friendFrames] = await Promise.all([
    loadFramesFromFolder(`${base}/asset/run`),
    loadFramesFromFolder(`${base}/asset/attack`),
    loadFramesFromFolder(`${base}/asset/enermy`),
    loadFramesFromFolder(`${base}/asset/friend`),
  ]);

  const [
    enemyHitImg,
    hitEffectImg,
    friendHitImg,
    friendOkImg,
    heartImg,
    heroHitImg,
    titleImg,
    winImg,
    defeatImg,
    treesImg,
    baseImg,
    farImg,
    groundImg,
  ] = await Promise.all([
    loadImageAsync(`${base}/asset/enermy_hit/0.png`),
    loadImageAsync(`${base}/asset/hit.png`),
    loadImageAsync(`${base}/asset/friend_hit/0.png`),
    loadImageAsync(`${base}/asset/friend_ok/0.png`),
    loadImageAsync(`${base}/asset/friend_ok/heart.png`),
    loadImageAsync(`${base}/asset/hero_hit/0.png`),
    loadImageAsync(`${base}/asset/title.jpeg`),
    loadImageAsync(`${base}/asset/win.jpeg`),
    loadImageAsync(`${base}/asset/defeat.jpeg`),
    loadImageAsync(`${base}/asset/background/bg_trees.png`),
    loadImageAsync(`${base}/asset/background/base.png`),
    loadImageAsync(`${base}/asset/background/far.jpeg`),
    loadImageAsync(`${base}/asset/background/ground.png`),
  ]);

  return {
    runFrames,
    attackFrames,
    enemyFrames,
    enemyHitImg,
    hitEffectImg,
    friendFrames,
    friendHitImg,
    friendOkImg,
    heartImg,
    heroHitImg,
    titleImg,
    winImg,
    defeatImg,
    treesImg,
    baseImg,
    farImg,
    groundImg,
  };
}
