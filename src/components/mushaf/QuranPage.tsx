import React, { useRef, useState, useEffect } from "react";
import { PageData } from "./types";
import { useQuranLayout } from "./useQuranLayout";
import { QuranLine } from "./QuranLine";

interface QuranPageProps {
  data: PageData;
  fontSize?: number;
  highlightedAyahId?: number;
  isPlayingSurah?: boolean;
  onAyahClick?: (ayahNumber: number) => void;
  onPlaySurah?: () => void;
}

/**
 * The Page component for a full-body immersive spread.
 * Features internal scrolling and full-bleed layout.
 */
export const QuranPage: React.FC<QuranPageProps> = ({ 
  data, 
  fontSize = 32,
  highlightedAyahId,
  isPlayingSurah,
  onAyahClick,
  onPlaySurah
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { lines, isFontReady } = useQuranLayout(
    data,
    containerWidth,
    fontSize,
    "'Amiri Quran', 'Scheherazade New', serif"
  );

  if (!isFontReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-mushaf-bg">
        <div className="text-mushaf-dark font-bold text-lg text-center">Menyiapkan Mushaf...</div>
      </div>
    );
  }

  const isIntroPage = data.pageNumber === 1 || data.pageNumber === 2;
  const lineSpacing = isIntroPage ? 3.0 : 2.0;

  return (
    <div
      ref={containerRef}
      className={`w-full h-fit min-h-full bg-mushaf-bg flex flex-col ${
        isIntroPage ? 'p-8 md:p-16' : 'p-4 md:p-8'
      }`}
      style={{ 
        fontSize: `${isIntroPage ? fontSize * 1.15 : fontSize}px`,
        '--mushaf-line-height': `${Math.floor(fontSize * lineSpacing)}px`
      } as React.CSSProperties}
    >
      {/* Content Area - Natural Height */}
      <div className="flex-1 flex flex-col justify-start">
        <div className="w-full py-4">
          {lines.map((line, idx) => (
            <QuranLine
              key={idx}
              line={line}
              highlightedAyahId={highlightedAyahId}
              isPlayingSurah={isPlayingSurah}
              isLastLine={idx === lines.length - 1}
              onAyahClick={onAyahClick}
              onPlaySurah={onPlaySurah}
            />
          ))}

          {!isIntroPage && lines.length < 15 && (
              Array.from({ length: 15 - lines.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-full" style={{ height: 'var(--mushaf-line-height)' }} />
              ))
          )}
        </div>
      </div>
      
      {/* Page Footer pinned at bottom */}
      <div className="mt-4 pt-2 border-t border-mushaf-border text-center font-bold text-mushaf-dark/30 text-[10px] uppercase tracking-widest">
        Halaman {data.pageNumber}
      </div>
    </div>
  );
};
