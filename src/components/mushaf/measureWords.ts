/**
 * Uses a hidden canvas to measure the exact pixel width of Arabic text.
 * This is crucial for precise line-breaking in a Mushaf layout.
 */
export const measureWordWidth = (
  text: string,
  font: string,
  translation?: string,
  translationFont?: string,
  canvas?: HTMLCanvasElement
): number => {
  const c = canvas || document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) return 0;
  
  // Measure Arabic
  ctx.font = font;
  const arabicWidth = ctx.measureText(text).width + 0.5;

  // Measure Translation if exists
  let transWidth = 0;
  if (translation && translationFont) {
    ctx.font = translationFont;
    transWidth = ctx.measureText(translation).width;
  }
  
  return Math.max(arabicWidth, transWidth);
};

/**
 * Normalizes Arabic text for measurement and rendering.
 */
export const normalizeAyahText = (text: string): string => {
  return text.trim().replace(/\s+/g, " ");
};
