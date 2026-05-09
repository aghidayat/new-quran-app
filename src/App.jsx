import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { marked } from "marked";
import { db } from "./db";
import packageJson from "../package.json";
import { QuranPage } from "./components/mushaf/QuranPage";

const TOTAL_PAGES = 604;

function normalizeArabic(text) {
  return (text || "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/ٱ/g, "ا")
    .trim();
}

async function fetchQuranData() {
  const response = await fetch(
    "https://api.alquran.cloud/v1/quran/quran-uthmani",
  );
  if (!response.ok) {
    throw new Error("Failed to fetch Quran data");
  }
  const payload = await response.json();
  return payload.data;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [spreadIndex, setSpreadIndex] = useState(0);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [selectedAyahModal, setSelectedAyahModal] = useState(null);
  const [translationText, setTranslationText] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogHtml, setChangelogHtml] = useState("");
  
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlayingSurah, setIsPlayingSurah] = useState(false);
  const [playingAyahId, setPlayingAyahId] = useState(null);
  const audioRef = useRef(null);

  const surahs = useLiveQuery(() => db.surahs.toArray());
  const lastRead = useLiveQuery(() => db.lastRead.get(1));

  const rightPageNumber = spreadIndex * 2 + 1;
  const leftPageNumber = Math.min(TOTAL_PAGES, spreadIndex * 2 + 2);

  const rightPageAyahs = useLiveQuery(
    () => db.ayahs.where("page").equals(rightPageNumber).toArray(),
    [rightPageNumber],
  );
  const leftPageAyahs = useLiveQuery(
    () => db.ayahs.where("page").equals(leftPageNumber).toArray(),
    [leftPageNumber],
  );

  useEffect(() => {
    const boot = async () => {
      try {
        const count = await db.surahs.count();
        if (count === 0) {
          setLoading(true);
          const data = await fetchQuranData();
          await db.transaction("rw", db.surahs, db.ayahs, async () => {
            for (const s of data.surahs) {
              await db.surahs.add({
                number: s.number,
                name: s.name,
                englishName: s.englishName,
                ayahCount: s.ayahs.length,
                firstPage: s.ayahs[0].page,
              });
              const ayahsWithMetadata = s.ayahs.map((a) => ({
                ...a,
                surahNumber: s.number,
                surahName: s.englishName,
                surahArabicName: s.name,
              }));
              await db.ayahs.bulkAdd(ayahsWithMetadata);
            }
          });
        }

        const lr = await db.lastRead.get(1);
        if (lr) {
          setSpreadIndex(Math.floor((lr.page - 1) / 2));
          setSelectedSurah(lr.surahNumber);
        }
      } catch (e) {
        console.error(e);
        setError("Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  const surahOptions = useMemo(() => surahs || [], [surahs]);
  const currentJuz = rightPageAyahs?.[0]?.juz || leftPageAyahs?.[0]?.juz || 1;

  const isPlayingRef = useRef(false);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingSurah(false);
    isPlayingRef.current = false;
    setPlayingAyahId(null);
  };

  const playFullSurah = async () => {
    if (isPlayingSurah) {
      stopAudio();
      return;
    }

    setAudioLoading(true);
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/ar.alafasy`);
      const payload = await response.json();
      const ayahs = payload.data.ayahs;
      
      setIsPlayingSurah(true);
      isPlayingRef.current = true;
      
      const playSequentially = (index) => {
        if (index >= ayahs.length || !isPlayingRef.current) {
          stopAudio();
          return;
        }

        const ayah = ayahs[index];
        setPlayingAyahId(ayah.number);

        // Auto-navigate if needed
        const p = ayah.page;
        const currentRight = spreadIndex * 2 + 1;
        const currentLeft = spreadIndex > 0 ? spreadIndex * 2 : null;
        
        if (p !== currentRight && p !== currentLeft) {
          setSpreadIndex(Math.floor((p - 1) / 2));
        }

        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(ayah.audio);
        audioRef.current.onended = () => {
          if (isPlayingRef.current) {
            setTimeout(() => playSequentially(index + 1), 500);
          }
        };
        audioRef.current.onerror = (err) => {
          console.error("Audio error at index", index, err);
          stopAudio();
        };
        audioRef.current.play().catch(e => {
          console.error("Play failed", e);
          stopAudio();
        });
      };

      playSequentially(0);
    } catch (e) {
      console.error("Surah fetch failed", e);
      alert("Gagal memuat audio surah");
      stopAudio();
    } finally {
      setAudioLoading(false);
    }
  };

  const navigateToPage = (p) => {
    setSpreadIndex(Math.floor((p - 1) / 2));
  };

  const onAyahClick = async (ayahNumber) => {
    stopAudio();
    let ayah = await db.ayahs.where("number").equals(ayahNumber).first();
    if (!ayah) ayah = await db.ayahs.get(ayahNumber);
    if (ayah) {
      setSelectedAyahModal(ayah);
      setTranslationText("");
    }
  };

  const markLastRead = async (ayah) => {
    await db.lastRead.put({
      id: 1,
      page: ayah.page,
      ayahId: ayah.number,
      surahNumber: ayah.surahNumber,
      numberInSurah: ayah.numberInSurah,
    });
  };

  const playMurattal = async () => {
    if (!selectedAyahModal) return;
    setAudioLoading(true);
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${selectedAyahModal.number}/ar.alafasy`);
      const payload = await response.json();
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(payload.data.audio);
      await audioRef.current.play();
    } catch (e) {
      alert("Gagal memutar audio");
    } finally {
      setAudioLoading(false);
    }
  };

  const loadTranslation = async () => {
    if (!selectedAyahModal) return;
    setTranslationLoading(true);
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${selectedAyahModal.number}/id.indonesian`);
      const payload = await response.json();
      setTranslationText(payload.data.text);
    } catch (e) {
      alert("Gagal memuat terjemahan");
    } finally {
      setTranslationLoading(false);
    }
  };

  const openChangelog = async () => {
    try {
      const response = await fetch("/CHANGELOG.md");
      if (response.ok) {
        const text = await response.text();
        setChangelogHtml(marked(text));
        setShowChangelog(true);
      }
    } catch (e) {
      alert("Gagal memuat Changelog.");
    }
  };

  const [seeding, setSeeding] = useState(false);

  const reseedData = async () => {
    setSeeding(true);
    try {
      await db.ayahs.clear();
      await db.surahs.clear();
      const data = await fetchQuranData();
      await db.transaction("rw", db.surahs, db.ayahs, async () => {
        for (const s of data.surahs) {
          await db.surahs.add({
            number: s.number,
            name: s.name,
            englishName: s.englishName,
            ayahCount: s.ayahs.length,
            firstPage: s.ayahs[0].page,
          });
          const ayahsWithMetadata = s.ayahs.map((a) => ({
            ...a,
            surahNumber: s.number,
            surahName: s.englishName,
            surahArabicName: s.name,
          }));
          await db.ayahs.bulkAdd(ayahsWithMetadata);
        }
      });
      window.location.reload();
    } catch (e) {
      alert("Gagal mengunduh ulang data.");
    } finally {
      setSeeding(false);
    }
  };

  if (loading || seeding)
    return (
      <div className="h-screen grid place-items-center bg-mushaf-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mushaf-dark mx-auto mb-4"></div>
          <p className="text-xl font-bold text-mushaf-dark">{seeding ? "Mengunduh Ulang..." : "Menyiapkan Offline..."}</p>
        </div>
      </div>
    );

  if (rightPageAyahs === undefined) return <div className="h-screen grid place-items-center">Memuat...</div>;

  if (error) return <div className="h-screen grid place-items-center text-red-600">{error}</div>;

  return (
    <main className="w-full h-screen text-mushaf-text bg-slate-200 flex flex-col overflow-hidden">
      <header className={`bg-mushaf-bg border-b border-mushaf-border shadow-sm overflow-hidden z-20 ${headerCollapsed ? "p-1" : "p-4"}`}>
        <div className="flex justify-between items-center px-4">
          <h1 className={`font-bold text-mushaf-dark ${headerCollapsed ? "text-xs" : "text-xl"}`}>Mushaf Desktop Indonesia</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setHeaderCollapsed(!headerCollapsed)} className="px-3 py-1 text-[10px] font-bold bg-mushaf-accent text-white rounded-full hover:bg-mushaf-dark transition-colors">
              {headerCollapsed ? 'Navigasi' : 'Sembunyikan'}
            </button>
            <div className={`text-xs font-bold bg-mushaf-dark text-mushaf-bg px-3 py-1 rounded-full transition-all duration-300 ${headerCollapsed ? "scale-75" : ""}`}>
              Juz {currentJuz}
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 origin-top px-4 ${headerCollapsed ? "max-h-0 opacity-0 mt-0" : "max-h-96 opacity-100 mt-2"}`}>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-mushaf-dark/60">Surah
            <div className="flex gap-2">
              <select className="flex-1 p-1 rounded border border-mushaf-border bg-white text-xs focus:ring-1 focus:ring-mushaf-accent outline-none" value={selectedSurah} onChange={(e) => { const num = Number(e.target.value); setSelectedSurah(num); const s = surahOptions.find(opt => opt.number === num); if (s) navigateToPage(s.firstPage); stopAudio(); }}>
                {surahOptions.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
              </select>
              <button onClick={playFullSurah} disabled={audioLoading} className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all shadow-sm ${isPlayingSurah ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-mushaf-dark text-mushaf-bg hover:bg-black'}`}>
                {audioLoading ? "..." : isPlayingSurah ? "Berhenti" : "Putar Surah"}
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-mushaf-dark/60">Juz
            <select className="p-1 rounded border border-mushaf-border bg-white text-xs focus:ring-1 focus:ring-mushaf-accent outline-none" value={currentJuz} onChange={async (e) => { const juzNum = Number(e.target.value); const f = await db.ayahs.where("juz").equals(juzNum).first(); if (f) navigateToPage(f.page); }}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map(j => <option key={j} value={j}>Juz {j}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-mushaf-dark/60">Halaman
            <select className="p-1 rounded border border-mushaf-border bg-white text-xs focus:ring-1 focus:ring-mushaf-accent outline-none" value={rightPageNumber} onChange={(e) => navigateToPage(Number(e.target.value))}>
              {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map(p => <option key={p} value={p}>Halaman {p}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-mushaf-dark/60">Ayat
            <select className="p-1 rounded border border-mushaf-border bg-white text-xs focus:ring-1 focus:ring-mushaf-accent outline-none" onChange={async (e) => { const num = Number(e.target.value); const a = await db.ayahs.where({ surahNumber: selectedSurah, numberInSurah: num }).first(); if (a) navigateToPage(a.page); }}>
              {Array.from({ length: surahOptions.find(s => s.number === selectedSurah)?.ayahCount || 0 }, (_, i) => i + 1).map(n => <option key={n} value={n}>Ayat {n}</option>)}
            </select>
          </label>
        </div>
      </header>

      <section className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-0 overflow-y-auto bg-mushaf-bg custom-scrollbar relative pb-[200px]" dir="rtl">
        <div className="flex justify-center h-fit min-h-full border-l border-slate-400/20">
          {rightPageAyahs && rightPageAyahs.length > 0 ? (
            <QuranPage data={{ ayahs: rightPageAyahs, pageNumber: rightPageNumber }} highlightedAyahId={playingAyahId || lastRead?.ayahId} isPlayingSurah={isPlayingSurah} onAyahClick={onAyahClick} onPlaySurah={playFullSurah} />
          ) : (
            <div className="p-10 text-center self-center"><p className="text-red-500 font-bold mb-4">Data tidak ditemukan</p><button onClick={reseedData} className="px-4 py-2 bg-mushaf-dark text-white rounded-lg">Unduh Data</button></div>
          )}
        </div>
        <div className="flex justify-center h-fit min-h-full">
          {leftPageAyahs && leftPageAyahs.length > 0 && leftPageNumber <= TOTAL_PAGES ? (
            <QuranPage data={{ ayahs: leftPageAyahs, pageNumber: leftPageNumber }} highlightedAyahId={playingAyahId || lastRead?.ayahId} isPlayingSurah={isPlayingSurah} onAyahClick={onAyahClick} onPlaySurah={playFullSurah} />
          ) : leftPageNumber <= TOTAL_PAGES ? (
            <div className="p-10 text-center self-center"><p className="text-red-500 font-bold mb-4">Data tidak ditemukan</p><button onClick={reseedData} className="px-4 py-2 bg-mushaf-dark text-white rounded-lg">Unduh Data</button></div>
          ) : <div className="w-full h-full bg-mushaf-bg" />}
        </div>
      </section>

      <footer className="flex justify-between items-center bg-mushaf-bg border-t border-mushaf-border p-2 z-20 shadow-lg" dir="rtl">
        <button className="px-4 py-1 bg-mushaf-dark text-mushaf-bg rounded text-sm font-bold" onClick={() => setSpreadIndex(i => Math.max(0, i - 1))} disabled={spreadIndex === 0}>→ Sebelumnya</button>
        <div className="flex flex-col items-center">
          <div className="text-sm font-bold text-mushaf-dark">{rightPageNumber} - {leftPageNumber}</div>
          <button onClick={openChangelog} className="text-[9px] text-mushaf-accent hover:underline">Versi {packageJson.version}</button>
        </div>
        <button className="px-4 py-1 bg-mushaf-dark text-mushaf-bg rounded text-sm font-bold" onClick={() => setSpreadIndex(i => Math.min(Math.floor((TOTAL_PAGES - 1) / 2), i + 1))} disabled={leftPageNumber >= TOTAL_PAGES}>Berikutnya ←</button>
      </footer>

      {showChangelog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center p-4 z-[60]" onClick={() => setShowChangelog(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-mushaf-dark">Riwayat</h2>
              <button onClick={() => setShowChangelog(false)} className="text-mushaf-accent font-bold">Tutup</button>
            </div>
            <div className="flex-1 overflow-auto pr-2 text-mushaf-text changelog-content" dangerouslySetInnerHTML={{ __html: changelogHtml }} />
          </div>
        </div>
      )}

      {selectedAyahModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center p-4 z-50" onClick={() => setSelectedAyahModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-mushaf-dark">Surah {selectedAyahModal.surahNumber} : {selectedAyahModal.numberInSurah}</h2>
              <div className="text-xs font-medium text-mushaf-accent">Hal. {selectedAyahModal.page}</div>
            </div>
            <div className="grid gap-2">
              <button className="w-full text-left p-3 rounded-xl border border-mushaf-border bg-mushaf-bg hover:border-mushaf-accent transition-all group" onClick={() => { markLastRead(selectedAyahModal); setSelectedAyahModal(null); }}>
                <div className="font-bold text-mushaf-dark text-sm">Tandai Terakhir Baca</div>
              </button>
              <button className="w-full text-left p-3 rounded-xl border border-mushaf-border bg-mushaf-bg hover:border-mushaf-accent transition-all group" disabled={audioLoading} onClick={playMurattal}>
                <div className="font-bold text-mushaf-dark text-sm">{audioLoading ? "Sedang Memutar..." : "Putar Murattal"}</div>
              </button>
              <button className="w-full text-left p-3 rounded-xl border border-mushaf-border bg-mushaf-bg hover:border-mushaf-accent transition-all group" disabled={translationLoading} onClick={loadTranslation}>
                <div className="font-bold text-mushaf-dark text-sm">{translationLoading ? "Sedang Memuat..." : "Lihat Terjemahan"}</div>
              </button>
            </div>
            {translationText && <div className="mt-4 p-3 bg-mushaf-bg border-l-4 border-mushaf-accent rounded text-xs italic leading-relaxed text-mushaf-text">{translationText}</div>}
            <button className="mt-6 w-full py-2 text-mushaf-dark font-black uppercase tracking-widest text-[10px]" onClick={() => setSelectedAyahModal(null)}>Tutup</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
