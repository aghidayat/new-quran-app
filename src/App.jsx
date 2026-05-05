import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

const TOTAL_PAGES = 604
const BISMILLAH_TEXT = 'بسم الله الرحمن الرحيم'

async function fetchQuranData() {
  const response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani')
  if (!response.ok) {
    throw new Error('Failed to fetch Quran data')
  }
  const payload = await response.json()
  return payload.data
}

function shouldBreakAfterBismillah(ayah) {
  const normalized = (ayah.text || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ٱ/g, 'ا')
    .trim()
  return normalized === BISMILLAH_TEXT && ayah.surahNumber !== 1 && ayah.surahNumber !== 9
}

function toArabicNumerals(num) {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)] || digit).join('');
}

function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // spreadIndex: 0 = Pages 1-2, 1 = Pages 3-4, etc.
  // Formula: Right Page = 2*spreadIndex + 1, Left Page = 2*spreadIndex + 2
  const [spreadIndex, setSpreadIndex] = useState(0)
  
  const [selectedSurah, setSelectedSurah] = useState(1)
  const [selectedAyah, setSelectedAyah] = useState(1)
  const [selectedAyahModal, setSelectedAyahModal] = useState(null)
  const [translationText, setTranslationText] = useState('')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const audioRef = useRef(null)

  // Dexie Queries
  const surahs = useLiveQuery(() => db.surahs.toArray())
  const lastRead = useLiveQuery(() => db.lastRead.get(1))
  
  // Calculate current page numbers based on spreadIndex
  const rightPageNumber = spreadIndex * 2 + 1
  const leftPageNumber = Math.min(TOTAL_PAGES, spreadIndex * 2 + 2)

  // Fetch current page ayahs
  const rightPageAyahs = useLiveQuery(() => db.ayahs.where('page').equals(rightPageNumber).toArray(), [rightPageNumber])
  const leftPageAyahs = useLiveQuery(() => 
    db.ayahs.where('page').equals(leftPageNumber).toArray(), 
    [leftPageNumber]
  )

  // Initial Load: Seed Data & Restore Last Read
  useEffect(() => {
    const boot = async () => {
      try {
        const count = await db.surahs.count()
        if (count === 0) {
          setLoading(true)
          const data = await fetchQuranData()
          await db.transaction('rw', db.surahs, db.ayahs, async () => {
            for (const s of data.surahs) {
              await db.surahs.add({
                number: s.number,
                name: s.name,
                englishName: s.englishName,
                ayahCount: s.ayahs.length,
                firstPage: s.ayahs[0].page
              })
              const ayahsWithMetadata = s.ayahs.map(a => ({
                ...a,
                surahNumber: s.number,
                surahName: s.englishName,
                surahArabicName: s.name
              }))
              await db.ayahs.bulkAdd(ayahsWithMetadata)
            }
          })
        }
        
        // Restore Last Read after seeding or if already exists
        const lr = await db.lastRead.get(1)
        if (lr) {
          const index = Math.floor((lr.page - 1) / 2)
          setSpreadIndex(index)
          setSelectedSurah(lr.surahNumber)
        }
      } catch (e) {
        console.error(e)
        setError('Gagal memuat data. Periksa koneksi internet.')
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [])

  const surahOptions = useMemo(() => surahs || [], [surahs])
  const currentJuz = rightPageAyahs?.[0]?.juz || leftPageAyahs?.[0]?.juz || 1

  const markLastRead = async (ayah) => {
    await db.lastRead.put({
      id: 1,
      page: ayah.page,
      ayahId: ayah.number,
      surahNumber: ayah.surahNumber,
      numberInSurah: ayah.numberInSurah
    })
  }

  const navigateToPage = (p) => {
    const index = Math.floor((p - 1) / 2)
    setSpreadIndex(index)
  }

  const playMurattal = async () => {
    if (!selectedAyahModal) return
    setAudioLoading(true)
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${selectedAyahModal.number}/ar.alafasy`)
      const payload = await response.json()
      if (audioRef.current) audioRef.current.pause()
      audioRef.current = new Audio(payload.data.audio)
      await audioRef.current.play()
    } catch (e) {
      alert('Gagal memutar audio')
    } finally {
      setAudioLoading(false)
    }
  }

  const loadTranslation = async () => {
    if (!selectedAyahModal) return
    setTranslationLoading(true)
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${selectedAyahModal.number}/id.indonesian`)
      const payload = await response.json()
      setTranslationText(payload.data.text)
    } catch (e) {
      alert('Gagal memuat terjemahan')
    } finally {
      setTranslationLoading(false)
    }
  }

  const renderAyahFlow = (ayahList = []) => (
    <div className="w-full text-justify [text-align-last:right] leading-[3.2] font-quran text-[40px] text-mushaf-text" dir="rtl" style={{ textJustify: 'inter-word' }}>
      {ayahList.map((ayah) => {
        const isFirstAyah = ayah.numberInSurah === 1;
        const needsBismillahBreak = shouldBreakAfterBismillah(ayah);
        
        return (
          <span key={ayah.number} className="inline">
            {isFirstAyah && ayah.surahNumber !== 1 && (
              <span className="block w-full h-4" />
            )}
            
            <button
              type="button"
              className={`inline px-1 rounded transition-colors hover:bg-mushaf-accent/20 ${lastRead?.ayahId === ayah.number ? 'bg-mushaf-accent/30' : ''}`}
              onClick={() => {
                setSelectedAyahModal(ayah)
                setTranslationText('')
              }}
            >
              <span className="align-middle whitespace-normal">{ayah.text}</span>
              <span className="inline-flex items-center justify-center min-w-[44px] h-[44px] border border-mushaf-dark rounded-full mx-2 text-2xl align-middle font-quran text-mushaf-dark pt-1">
                {toArabicNumerals(ayah.numberInSurah)}
              </span>
            </button>

            {needsBismillahBreak && <span className="block w-full h-6" />}
          </span>
        );
      })}
    </div>
  )

  if (loading) return (
    <div className="h-screen grid place-items-center bg-mushaf-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mushaf-dark mx-auto mb-4"></div>
        <p className="text-xl font-bold text-mushaf-dark">Menyiapkan Mushaf Offline...</p>
        <p className="text-sm text-mushaf-accent">Mohon tunggu sebentar (hanya sekali)</p>
      </div>
    </div>
  )

  if (error) return <div className="h-screen grid place-items-center text-xl text-red-600">{error}</div>

  return (
    <main className="max-w-[1400px] mx-auto p-4 text-mushaf-text bg-white min-h-screen flex flex-col">
      <header className="mb-4 bg-mushaf-bg p-4 rounded-xl border border-mushaf-border shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-mushaf-dark">Mushaf Desktop Indonesia</h1>
          <div className="text-sm font-bold bg-mushaf-dark text-mushaf-bg px-3 py-1 rounded-full">
            Juz {currentJuz}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-mushaf-dark/60">
            Surah
            <select
              className="p-2 rounded-lg border border-mushaf-border bg-white text-sm focus:ring-2 focus:ring-mushaf-accent outline-none"
              value={selectedSurah}
              onChange={(e) => {
                const num = Number(e.target.value)
                setSelectedSurah(num)
                const s = surahOptions.find(opt => opt.number === num)
                if (s) navigateToPage(s.firstPage)
              }}
            >
              {surahOptions.map(s => (
                <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-mushaf-dark/60">
            Juz
            <select
              className="p-2 rounded-lg border border-mushaf-border bg-white text-sm focus:ring-2 focus:ring-mushaf-accent outline-none"
              value={currentJuz}
              onChange={async (e) => {
                const juzNum = Number(e.target.value)
                const firstAyahInJuz = await db.ayahs.where('juz').equals(juzNum).first()
                if (firstAyahInJuz) navigateToPage(firstAyahInJuz.page)
              }}
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                <option key={j} value={j}>Juz {j}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-mushaf-dark/60">
            Halaman
            <select 
              className="p-2 rounded-lg border border-mushaf-border bg-white text-sm focus:ring-2 focus:ring-mushaf-accent outline-none"
              value={rightPageNumber} 
              onChange={(e) => navigateToPage(Number(e.target.value))}
            >
              {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map(p => (
                <option key={p} value={p}>Halaman {p}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-mushaf-dark/60">
            Ayat
            <select
              className="p-2 rounded-lg border border-mushaf-border bg-white text-sm focus:ring-2 focus:ring-mushaf-accent outline-none"
              value={selectedAyah}
              onChange={async (e) => {
                const num = Number(e.target.value)
                setSelectedAyah(num)
                const a = await db.ayahs.where({ surahNumber: selectedSurah, numberInSurah: num }).first()
                if (a) navigateToPage(a.page)
              }}
            >
              {Array.from({ length: surahOptions.find(s => s.number === selectedSurah)?.ayahCount || 0 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Ayat {n}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="flex-1 grid grid-cols-2 gap-6" dir="rtl">
        {/* Right Column in RTL: Odd Page */}
        <article className="bg-mushaf-bg border-2 border-mushaf-border rounded-2xl shadow-inner p-8 flex flex-col">
          <div className="mb-6 text-center font-bold text-mushaf-accent border-b border-mushaf-border pb-2">Halaman {rightPageNumber}</div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {renderAyahFlow(rightPageAyahs)}
          </div>
        </article>

        {/* Left Column in RTL: Even Page */}
        <article className="bg-mushaf-bg border-2 border-mushaf-border rounded-2xl shadow-inner p-8 flex flex-col transition-opacity duration-300">
          <div className="mb-6 text-center font-bold text-mushaf-accent border-b border-mushaf-border pb-2">Halaman {leftPageNumber}</div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {renderAyahFlow(leftPageAyahs)}
          </div>
        </article>
      </section>

      <footer className="flex justify-between items-center bg-mushaf-bg/50 p-4 mt-4 rounded-xl border border-mushaf-border" dir="rtl">
        <button 
          className="flex items-center gap-2 px-6 py-2 bg-mushaf-dark text-mushaf-bg rounded-lg hover:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md font-bold"
          onClick={() => setSpreadIndex(i => Math.max(0, i - 1))}
          disabled={spreadIndex === 0}
        >
          <span>→</span> Halaman Sebelumnya
        </button>
        
        <div className="text-lg font-bold text-mushaf-dark bg-white px-6 py-2 rounded-full border border-mushaf-border shadow-sm">
          {rightPageNumber} - {leftPageNumber}
        </div>

        <button 
          className="flex items-center gap-2 px-6 py-2 bg-mushaf-dark text-mushaf-bg rounded-lg hover:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md font-bold"
          onClick={() => setSpreadIndex(i => Math.min(Math.floor((TOTAL_PAGES - 1) / 2), i + 1))}
          disabled={leftPageNumber >= TOTAL_PAGES}
        >
          Halaman Berikutnya <span>←</span>
        </button>
      </footer>

      {selectedAyahModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setSelectedAyahModal(null)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-mushaf-dark">
                Surah {selectedAyahModal.surahNumber} : {selectedAyahModal.numberInSurah}
              </h2>
              <div className="text-sm font-medium text-mushaf-accent">Halaman {selectedAyahModal.page}</div>
            </div>
            
            <div className="grid gap-3">
              <button 
                className="w-full text-left p-4 rounded-2xl border-2 border-mushaf-border bg-mushaf-bg hover:border-mushaf-accent hover:bg-white transition-all group"
                onClick={() => { markLastRead(selectedAyahModal); setSelectedAyahModal(null); }}
              >
                <div className="font-bold text-mushaf-dark group-hover:text-mushaf-accent">Tandai Terakhir Baca</div>
                <div className="text-xs text-mushaf-dark/60">Simpan posisi bacaan Anda di sini</div>
              </button>
              
              <button 
                className="w-full text-left p-4 rounded-2xl border-2 border-mushaf-border bg-mushaf-bg hover:border-mushaf-accent hover:bg-white transition-all group"
                disabled={audioLoading}
                onClick={playMurattal}
              >
                <div className="font-bold text-mushaf-dark group-hover:text-mushaf-accent">{audioLoading ? 'Sedang Memutar...' : 'Putar Murattal'}</div>
                <div className="text-xs text-mushaf-dark/60">Dengarkan qari Sheikh Al-Afasy</div>
              </button>
              
              <button 
                className="w-full text-left p-4 rounded-2xl border-2 border-mushaf-border bg-mushaf-bg hover:border-mushaf-accent hover:bg-white transition-all group"
                disabled={translationLoading}
                onClick={loadTranslation}
              >
                <div className="font-bold text-mushaf-dark group-hover:text-mushaf-accent">{translationLoading ? 'Sedang Memuat...' : 'Lihat Terjemahan'}</div>
                <div className="text-xs text-mushaf-dark/60">Bahasa Indonesia (Kemenag RI)</div>
              </button>
            </div>
            
            {translationText && (
              <div className="mt-6 p-5 bg-mushaf-bg border-l-4 border-mushaf-accent rounded-xl text-mushaf-text animate-in slide-in-from-top-2 duration-300">
                <p className="text-sm leading-relaxed italic">{translationText}</p>
              </div>
            )}
            
            <button 
              className="mt-8 w-full py-3 text-mushaf-dark font-black uppercase tracking-widest text-xs hover:text-red-600 transition-colors" 
              onClick={() => setSelectedAyahModal(null)}
            >
              Tutup Panel
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
