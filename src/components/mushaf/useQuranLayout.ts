import { useState, useMemo, useEffect } from "react";
import { Word, Line, PageData } from "./types";
import { measureWordWidth } from "./measureWords";
import { generateLines } from "./lineBreaker";
import { db } from "../../db";

const BISMILLAH_NORMALIZED = 'بسم الله الرحمن الرحيم'

function normalizeArabic(text: string) {
  return (text || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ٱ/g, 'ا')
    .trim();
}

export const useQuranLayout = (
  data: PageData | null,
  containerWidth: number,
  fontSize: number,
  fontFamily: string
) => {
  const [isFontReady, setIsFontReady] = useState(false);
  const [wordByWordData, setWordByWordData] = useState<any[]>([]);
  const [loadingWbW, setLoadingWbW] = useState(false);

  // 1. Wait for Font Loading
  useEffect(() => {
    document.fonts.ready.then(() => setIsFontReady(true));
  }, []);

  // 2. Fetch Accurate Word-by-Word data from Quran.com API
  useEffect(() => {
    if (!data || !data.pageNumber) return;
    
    const fetchWbW = async () => {
      setLoadingWbW(true);
      try {
        // Quran.com API v4: fetching verses with words and translations for a specific page
        const response = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${data.pageNumber}?words=true&word_fields=text_uthmani&language=id`
        );
        const payload = await response.json();
        setWordByWordData(payload.verses || []);
      } catch (e) {
        console.error("Failed to fetch WbW data", e);
      } finally {
        setLoadingWbW(false);
      }
    };
    fetchWbW();
  }, [data?.pageNumber]);

  // 3. Process data into words
  const lines = useMemo(() => {
    if (!data || !isFontReady || containerWidth <= 0 || loadingWbW) return [];
    
    // We prioritize wordByWordData if available for accuracy
    const sourceData = wordByWordData.length > 0 ? wordByWordData : [];
    if (sourceData.length === 0) return [];

    const fontStyle = `${fontSize}px ${fontFamily}`;
    const transFontStyle = `${Math.floor(fontSize * 0.4)}px sans-serif`;
    const wordsArray: Word[] = [];

    sourceData.forEach((verse, vIdx) => {
      // Verse key is like "1:1"
      const [surahNum, ayahNumInSurah] = verse.verse_key.split(':').map(Number);
      
      // A. Detect Surah Change to Insert Bismillah
      const prevVerse = sourceData[vIdx - 1];
      const prevSurahNum = prevVerse ? Number(prevVerse.verse_key.split(':')[0]) : null;

      if (surahNum !== prevSurahNum && surahNum !== 1 && surahNum !== 9 && ayahNumInSurah === 1) {
        wordsArray.push({
          text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
          width: containerWidth,
          ayahNumber: verse.id,
          isBismillah: true
        });
      }

      // B. Process Words
      verse.words.forEach((wordObj: any) => {
        if (wordObj.char_type_name === 'end') {
           // Ayah separator
           wordsArray.push({
            text: ayahNumInSurah.toString(),
            width: fontSize * 1.5,
            ayahNumber: verse.id,
            isAyahSeparator: true
          });
          return;
        }

        const isBismillah = normalizeArabic(wordObj.text_uthmani) === BISMILLAH_NORMALIZED;

        if (isBismillah && ayahNumInSurah === 1 && surahNum !== 1) {
            // Force Bismillah to its own line at the start of a Surah (except Fatihah)
            wordsArray.push({
                text: wordObj.text_uthmani,
                width: containerWidth,
                ayahNumber: verse.id,
                isBismillah: true
            });
            return;
        }

        const arabic = wordObj.text_uthmani;
        const translation = wordObj.translation?.text || "";

        wordsArray.push({
          text: arabic,
          translation: translation,
          width: measureWordWidth(arabic, fontStyle, translation, transFontStyle),
          ayahNumber: verse.id
        });
      });
    });

    return generateLines(wordsArray, containerWidth, 14);
  }, [wordByWordData, isFontReady, containerWidth, fontSize, fontFamily, loadingWbW]);

  return { lines, isFontReady: isFontReady && !loadingWbW };
};
