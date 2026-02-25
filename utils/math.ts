/**
 * 수학 유틸 — lerp, easing, slerp 등
 * Three.js 같은 무거운 의존 없이 로직/애니메이션용 보간에 사용
 */

/** Linear interpolation: a에서 b로 t(0~1) 비율만큼 보간 */
export function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/** value를 [min, max] 구간으로 클램프 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 한 구간 [inMin, inMax]의 값을 [outMin, outMax]로 선형 리맵 (lerp 기반) */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = (value - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, t);
}

/** Smoothstep: 시작/끝이 부드러운 S자 곡선. t는 0~1 */
export function easeInOut(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** 처음에 천천히 가속 */
export function easeIn(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x;
}

/** 끝에서 천천히 감속 */
export function easeOut(t: number): number {
  const x = clamp(t, 0, 1);
  return x * (2 - x);
}

/**
 * 각도 보간 (도 단위). 짧은 쪽 경로로 보간.
 * 예: 350° → 10° 는 360° 돌지 않고 350→360→10 방향으로 감
 */
export function slerpAngle(aDeg: number, bDeg: number, t: number): number {
  let diff = bDeg - aDeg;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return aDeg + diff * t;
}

/**
 * Spherical linear interpolation (2D 단위 벡터).
 * (x0,y0), (x1,y1)을 단위원 위에서 곡선 보간. t는 0~1.
 */
export function slerp2D(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number
): { x: number; y: number } {
  const dot = clamp(x0 * x1 + y0 * y1, -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-8) return { x: lerp(x0, x1, t), y: lerp(y0, y1, t) };
  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;
  return { x: a * x0 + b * x1, y: a * y0 + b * y1 };
}
