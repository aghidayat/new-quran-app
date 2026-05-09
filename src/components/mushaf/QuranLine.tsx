import React from "react";
import { Line } from "./types";
import { QuranWord } from "./QuranWord";

interface QuranLineProps {
  line: Line;
  isLastLine: boolean;
  highlightedAyahId?: number;
  isPlayingSurah?: boolean;
  onAyahClick?: (ayahNumber: number) => void;
  onPlaySurah?: () => void;
}

/**
 * Renders a single line of the Mushaf.
 * Uses Flexbox justify-between to achieve the "distribute spaces" effect.
 */
export const QuranLine: React.FC<QuranLineProps> = ({ 
  line, 
  isLastLine, 
  highlightedAyahId, 
  isPlayingSurah,
  onAyahClick,
  onPlaySurah
}) => {
  const containsBismillah = line.words.some(w => w.isBismillah);

  return (
    <div
      className={`flex flex-row items-center w-full ${
        containsBismillah ? "justify-center" : 
        isLastLine ? "justify-start gap-x-6" : "justify-between"
      }`}
      style={{ 
        direction: "rtl",
        minHeight: containsBismillah ? 'auto' : 'var(--mushaf-line-height, 80px)',
        marginBottom: containsBismillah ? '0' : '0.6em'
      }}
    >
      {line.words.map((word, idx) => (
        <QuranWord 
          key={`${word.ayahNumber}-${idx}`} 
          word={word} 
          isHighlighted={word.ayahNumber === highlightedAyahId}
          isPlayingSurah={isPlayingSurah}
          onClick={onAyahClick}
          onPlaySurah={onPlaySurah}
        />
      ))}
    </div>
  );
};
