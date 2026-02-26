/**
 * Game02 공통 유틸: 수학, 에러 정규화, 뷰 계산, 클릭 판정 등
 */

import {
  DEFAULT_SCENE_ASPECT,
  VIEW_AREA,
  CLICK_PADDING_RATIO,
  CLICK_PADDING_MIN,
} from './constants';
import type { GameScenario } from './Game02.types';

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(
      value,
      (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
      2
    );
  } catch {
    return String(value);
  }
}

export function normalizeError(err: unknown): { message: string; detail?: string } {
  if (err instanceof Error) {
    const message = err.message || '알 수 없는 오류';
    const detail = err.stack && err.stack !== message ? err.stack : undefined;
    return { message, detail };
  }
  if (typeof err === 'string') return { message: err };
  if (err && typeof err === 'object')
    return { message: '요청 실패', detail: safeJsonStringify(err) };
  return { message: String(err) };
}

export function computeViewWindow(
  viewportAspect: number,
  sceneAspect: number
): { w: number; h: number } {
  const va =
    Number.isFinite(viewportAspect) && viewportAspect > 0
      ? viewportAspect
      : sceneAspect;
  const sa =
    Number.isFinite(sceneAspect) && sceneAspect > 0
      ? sceneAspect
      : DEFAULT_SCENE_ASPECT;

  const ratio = va / sa;
  const w = Math.sqrt(VIEW_AREA * ratio);
  const h = Math.sqrt(VIEW_AREA / ratio);

  return {
    w: clamp(w, 1e-6, 1),
    h: clamp(h, 1e-6, 1),
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 클릭 좌표(x01, y01: 전체 이미지 기준 0~1)가 타겟 박스 위인지 */
export function isClickOnTarget(
  scenario: GameScenario,
  x01: number,
  y01: number
): boolean {
  const [ymin, xmin, ymax, xmax] = scenario.targetBox;
  const boxW = xmax - xmin;
  const boxH = ymax - ymin;

  const pad = Math.max(
    CLICK_PADDING_MIN,
    Math.max(boxW, boxH) * CLICK_PADDING_RATIO
  );
  const pxmin = Math.max(0, xmin - pad);
  const pxmax = Math.min(1000, xmax + pad);
  const pymin = Math.max(0, ymin - pad);
  const pymax = Math.min(1000, ymax + pad);

  const x = x01 * 1000;
  const y = y01 * 1000;

  return x >= pxmin && x <= pxmax && y >= pymin && y <= pymax;
}

/** base64 장면 이미지에서 targetBox 영역 크롭 → data URL */
export function cropTargetImage(
  base64: string,
  box: [number, number, number, number]
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const [ymin, xmin, ymax, xmax] = box;

      const sx = (xmin / 1000) * img.width;
      const sy = (ymin / 1000) * img.height;
      const sw = ((xmax - xmin) / 1000) * img.width;
      const sh = ((ymax - ymin) / 1000) * img.height;

      const padding = Math.max(sw, sh) * 0.8;
      const fsx = Math.max(0, sx - padding);
      const fsy = Math.max(0, sy - padding);
      const fsw = Math.min(img.width - fsx, sw + padding * 2);
      const fsh = Math.min(img.height - fsy, sh + padding * 2);

      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, fsx, fsy, fsw, fsh, 0, 0, 300, 300);
      }
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = `data:image/png;base64,${base64}`;
  });
}
