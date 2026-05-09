import Dexie from 'dexie';

export const db = new Dexie('QuranDB');
db.version(2).stores({
  surahs: 'number, name, englishName', // metadata
  ayahs: '++id, number, surahNumber, numberInSurah, page, juz', // added 'number' index
  lastRead: 'id, page, ayahId, surahNumber, numberInSurah' // current status
});
