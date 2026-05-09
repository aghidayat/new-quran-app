import React from "react";
import { Word } from "./types";

interface QuranWordProps {
  word: Word;
  isHighlighted?: boolean;
  onClick?: (ayahNumber: number) => void;
  onPlaySurah?: () => void;
  isPlayingSurah?: boolean;
}

/**
 * Renders a single word with optional translation below it.
 */
export const QuranWord: React.FC<QuranWordProps> = ({ 
  word, 
  isHighlighted, 
  onClick,
  onPlaySurah,
  isPlayingSurah
}) => {
  const toArabicNumerals = (num: string) => {
    const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return num.split("").map(d => arabicNumerals[parseInt(d)] || d).join("");
  };

  if (word.isSurahHeader) {
    return (
      <div className="w-full text-center mt-12 mb-6 flex justify-center">
        <div className="px-16 py-4 rounded-3xl bg-mushaf-dark text-mushaf-bg font-bold text-[0.8em] shadow-lg border-4 border-mushaf-accent/40 tracking-widest">
          {word.surahName}
        </div>
      </div>
    );
  }

  if (word.isBismillah) {
    return (
      <div className="w-full flex flex-col items-center my-8">
        <div 
          onClick={() => onClick?.(word.ayahNumber)}
          className="px-16 py-4 rounded-3xl bg-amber-100/60 border border-amber-200/50 text-mushaf-dark font-bold text-[1.2em] cursor-pointer hover:bg-amber-200/70 transition-all shadow-sm mb-4"
        >
          {word.text}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlaySurah?.();
          }}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-[0.4em] tracking-widest uppercase transition-all shadow-sm ${
            isPlayingSurah 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-mushaf-dark text-mushaf-bg hover:bg-black'
          }`}
        >
          <span className="text-lg">{isPlayingSurah ? '⏹' : '▶'}</span>
          {isPlayingSurah ? 'Berhenti' : 'Putar Murattal'}
        </button>
      </div>
    );
  }

  if (word.isAyahSeparator) {
    return (
      <div 
        onClick={() => onClick?.(word.ayahNumber)}
        className="flex-none flex items-center justify-center border-2 border-mushaf-dark rounded-full font-sans font-bold text-mushaf-dark cursor-pointer hover:bg-mushaf-dark hover:text-white transition-all shadow-sm"
        style={{ 
          width: '1.4em', 
          height: '1.4em', 
          fontSize: '0.45em',
          margin: '0 0.6em',
          transform: 'translateY(-0.4em)'
        }}
      >
        {toArabicNumerals(word.text)}
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(word.ayahNumber)}
      className={`flex flex-col items-center group cursor-pointer rounded-xl px-1 transition-all ${
        isHighlighted ? 'bg-mushaf-accent/40 shadow-sm' : 'hover:bg-mushaf-accent/15'
      }`}
      style={{ minWidth: `${word.width}px` }}
    >
      <span className="leading-tight mb-1 text-center w-full">{word.text}</span>
      <span className="text-[0.35em] font-sans font-medium text-mushaf-dark/80 leading-tight group-hover:text-mushaf-dark transition-colors text-center max-w-full italic px-1">
        {word.translation}
      </span>
    </div>
  );
};
