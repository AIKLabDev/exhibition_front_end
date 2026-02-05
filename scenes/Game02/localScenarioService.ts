/**
 * Local Scenario Service for Game02
 * Loads image sets from /data/ImageSets/
 */

import type { GameScenario } from './Game02.types';

type ImageSet = {
  id: string;
  fullUrl: string;
  searchUrl: string;
};

type PositionFile = {
  targetBox?: [number, number, number, number];
  box_2d?: [number, number, number, number];
  theme?: string;
  targetObject?: string;
};

type GrayImage = {
  gray: Uint8Array;
  w: number;
  h: number;
  scaleX: number;
  scaleY: number;
};

// Import all Full.png and Search.png from data/ImageSets/
const FULL_IMAGES = import.meta.glob('/data/ImageSets/*/Full.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const SEARCH_IMAGES = import.meta.glob('/data/ImageSets/*/Search.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

// Build list of available image sets
const IMAGE_SETS: ImageSet[] = Object.entries(FULL_IMAGES)
  .map(([fullKey, fullUrl]) => {
    const searchKey = fullKey.replace(/\/Full\.png$/, '/Search.png');
    const searchUrl = SEARCH_IMAGES[searchKey];
    if (!searchUrl) return null;

    const id = fullKey.split('/').slice(-2, -1)[0] ?? fullKey;
    return { id, fullUrl, searchUrl } satisfies ImageSet;
  })
  .filter((v): v is ImageSet => v !== null);

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
    img.src = src;
  });
}

function isValidBox(v: unknown): v is [number, number, number, number] {
  return (
    Array.isArray(v) &&
    v.length === 4 &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

function parseTargetBoxFromPositionFile(data: unknown): [number, number, number, number] {
  const d = data as PositionFile;
  const candidate = d?.targetBox ?? d?.box_2d;
  if (!isValidBox(candidate)) {
    throw new Error('Position.json의 좌표 형식이 올바르지 않습니다.');
  }
  return candidate;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`JSON 로드 실패: ${res.status} ${url}`);
  }
  return await res.json();
}

function imageToBase64Png(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context 생성 실패');
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  const comma = dataUrl.indexOf(',');
  if (comma === -1) throw new Error('잘못된 data URL 형식');
  return dataUrl.slice(comma + 1);
}

function getGrayImage(img: HTMLImageElement, maxDim: number): GrayImage {
  const ow = img.naturalWidth || img.width;
  const oh = img.naturalHeight || img.height;
  if (!ow || !oh) throw new Error('이미지 크기를 알 수 없습니다.');

  const scale = Math.min(1, maxDim / Math.max(ow, oh));
  const w = Math.max(1, Math.round(ow * scale));
  const h = Math.max(1, Math.round(oh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context 생성 실패');
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Uint8Array(w * h);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    gray[p] = (r * 77 + g * 150 + b * 29) >> 8;
  }

  return { gray, w, h, scaleX: w / ow, scaleY: h / oh };
}

function getGrayImageWithScale(img: HTMLImageElement, scale: number): GrayImage {
  const ow = img.naturalWidth || img.width;
  const oh = img.naturalHeight || img.height;
  if (!ow || !oh) throw new Error('이미지 크기를 알 수 없습니다.');

  const s = clamp(scale, 1e-6, 1);
  const w = Math.max(1, Math.round(ow * s));
  const h = Math.max(1, Math.round(oh * s));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context 생성 실패');
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    gray[p] = (r * 77 + g * 150 + b * 29) >> 8;
  }

  return { gray, w, h, scaleX: w / ow, scaleY: h / oh };
}

function locateTemplate(full: GrayImage, tpl: GrayImage): { x: number; y: number } {
  if (tpl.w > full.w || tpl.h > full.h) {
    throw new Error('Search 이미지가 Full 이미지보다 큽니다.');
  }

  let bestScore = Number.POSITIVE_INFINITY;
  let bestX = 0;
  let bestY = 0;

  const sample = 2;

  for (let y = 0; y <= full.h - tpl.h; y += 1) {
    for (let x = 0; x <= full.w - tpl.w; x += 1) {
      let score = 0;

      for (let ty = 0; ty < tpl.h; ty += sample) {
        const fullRow = (y + ty) * full.w + x;
        const tplRow = ty * tpl.w;
        for (let tx = 0; tx < tpl.w; tx += sample) {
          const d = full.gray[fullRow + tx]! - tpl.gray[tplRow + tx]!;
          score += d < 0 ? -d : d;
          if (score >= bestScore) break;
        }
        if (score >= bestScore) break;
      }

      if (score < bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  return { x: bestX, y: bestY };
}

function computeTargetBoxFromCrop(
  fullImg: HTMLImageElement,
  cropImg: HTMLImageElement
): [number, number, number, number] {
  const fullGray = getGrayImage(fullImg, 260);
  const baseScale = Math.min(fullGray.scaleX, fullGray.scaleY);
  const tplGray = getGrayImageWithScale(cropImg, baseScale);
  const { x: sx, y: sy } = locateTemplate(fullGray, tplGray);

  const ow = fullImg.naturalWidth || fullImg.width;
  const oh = fullImg.naturalHeight || fullImg.height;
  const cropW = cropImg.naturalWidth || cropImg.width;
  const cropH = cropImg.naturalHeight || cropImg.height;

  const x0 = sx / fullGray.scaleX;
  const y0 = sy / fullGray.scaleY;

  const xmin = clamp((x0 / ow) * 1000, 0, 1000);
  const ymin = clamp((y0 / oh) * 1000, 0, 1000);
  const xmax = clamp(((x0 + cropW) / ow) * 1000, 0, 1000);
  const ymax = clamp(((y0 + cropH) / oh) * 1000, 0, 1000);

  return [ymin, xmin, ymax, xmax];
}

export async function generateLocalGameScenario(): Promise<{
  scenario: GameScenario;
  targetCropUrl: string;
}> {
  if (IMAGE_SETS.length === 0) {
    throw new Error('data/ImageSets/* 에서 이미지 세트를 찾지 못했습니다.');
  }

  const pick = IMAGE_SETS[Math.floor(Math.random() * IMAGE_SETS.length)]!;

  const [fullImg, searchImg] = await Promise.all([
    loadImage(pick.fullUrl),
    loadImage(pick.searchUrl),
  ]);

  let targetBox: [number, number, number, number];
  try {
    const bust = `?t=${Date.now()}`;
    const posData = await fetchJson(`/data/ImageSets/${pick.id}/Position.json${bust}`);
    targetBox = parseTargetBoxFromPositionFile(posData);
  } catch {
    targetBox = computeTargetBoxFromCrop(fullImg, searchImg);
  }

  const sceneImageBase64 = imageToBase64Png(fullImg);

  return {
    scenario: {
      theme: `ImageSet ${pick.id}`,
      targetObject: `ImageSet ${pick.id}`,
      sceneImageBase64,
      targetBox,
    },
    targetCropUrl: pick.searchUrl,
  };
}

export function getAvailableImageSetsCount(): number {
  return IMAGE_SETS.length;
}
