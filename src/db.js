import Dexie from 'dexie';

export const db = new Dexie('QuranDB');
db.version(1).stores({
  surahs: 'number, name, englishName', // metadata
  ayahs: '++id, surahNumber, numberInSurah, page, juz', // full text and position
  lastRead: 'id, page, ayahId, surahNumber, numberInSurah' // current status
});
