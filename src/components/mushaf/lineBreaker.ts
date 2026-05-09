import { Word, Line } from "./types";

/**
 * Packs words into lines based on the available container width.
 * Mimics the "Fit Width" behavior of a physical Mushaf.
 */
export const generateLines = (
  words: Word[],
  containerWidth: number,
  avgWordPadding: number = 8
): Line[] => {
  const lines: Line[] = [];
  let currentLineWords: Word[] = [];
  let currentWidth = 0;

  words.forEach((word) => {
    // Check if adding the word (plus a minimum estimated gap) overflows the line
    const wordWidthWithGap = word.width + avgWordPadding;

    if (currentWidth + wordWidthWithGap > containerWidth && currentLineWords.length > 0) {
      // Current line is full. Push it and start a new one.
      lines.push({
        words: currentLineWords,
        totalWidth: currentWidth,
      });
      currentLineWords = [];
      currentWidth = 0;
    }

    // Special case: If it's a standalone Bismillah, we often force it to start a line
    if (word.isBismillah && currentLineWords.length > 0) {
      lines.push({
        words: currentLineWords,
        totalWidth: currentWidth,
      });
      currentLineWords = [];
      currentWidth = 0;
    }

    currentLineWords.push(word);
    currentWidth += word.width;
  });

  // Handle the last remaining line
  if (currentLineWords.length > 0) {
    lines.push({
      words: currentLineWords,
      totalWidth: currentWidth,
    });
  }

  return lines;
};
