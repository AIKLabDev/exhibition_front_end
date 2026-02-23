/**
 * Common helper for drawing camera frame binary (raw RGBA) to canvas.
 * Backend sends raw as RGBA (width*height*4 bytes); browser ImageData is RGBA, so no conversion loop.
 */

/**
 * Draw raw RGBA frame buffer to canvas.
 * @param canvas - target canvas (can be null)
 * @param buffer - RGBA bytes, length must be width * height * 4
 * @param width - frame width
 * @param height - frame height
 */
export function drawRawFrameToCanvas(
  canvas: HTMLCanvasElement | null,
  buffer: ArrayBuffer,
  width: number,
  height: number
): void {
  if (!canvas || !width || !height) return;
  const expected = width * height * 4;
  if (buffer.byteLength < expected) return;
  try {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bytes = new Uint8ClampedArray(buffer);
    ctx.putImageData(new ImageData(bytes, width, height), 0, 0);
  } catch {
    // ignore
  }
}
