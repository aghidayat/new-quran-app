export interface Word {
  text: string;
  translation?: string;
  width: number;
  ayahNumber: number;
  isAyahSeparator?: boolean;
  isBismillah?: boolean;
  isSurahHeader?: boolean;
  surahName?: string;
}

export interface Line {
  words: Word[];
  totalWidth: number;
}

export interface Ayah {
  text: string;
  number: number;
  numberInSurah: number;
  juz: number;
  page: number;
}

export interface PageData {
  ayahs: Ayah[];
  pageNumber: number;
}
