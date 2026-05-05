# PRD & Rencana Pengembangan: Mushaf Desktop Indonesia

## 1. Deskripsi Produk
Aplikasi Al-Qur'an berbasis web (khusus desktop) yang mereplikasi pengalaman membaca Mushaf fisik dengan tampilan dua halaman berdampingan (*spread view*). Visualisasi mengikuti standar Mushaf Standar Indonesia dari Kemenag RI (posisi ayat dan halaman yang presisi).

## 2. Tujuan Utama
* **Akurasi Visual:** Menghadirkan tata letak yang akrab bagi pengguna Mushaf cetak Indonesia.
* **Aksesibilitas Offline:** Memastikan aplikasi tetap berfungsi penuh meskipun tanpa koneksi internet setelah data terunduh.
* **Navigasi Cepat:** Mempermudah pengguna berpindah antar Surah, Juz, Halaman, maupun Ayat melalui menu dropdown yang intuitif.

## 3. Fitur Utama (MVP)
### A. Layout Dua Halaman (Spread View)
* Menampilkan dua halaman sekaligus (genap di kiri, ganjil di kanan).
* Desain *fixed layout* untuk menjaga presisi tata letak ayat (tidak responsif mobile).

### B. Navigasi Terpadu (Dropdowns)
* **Per Surah:** Navigasi langsung ke awal surah (1-114).
* **Per Juz:** Lompat ke awal juz tertentu (1-30).
* **Per Halaman:** Navigasi ke nomor halaman spesifik (1-604).
* **Per Ayat:** Fokus ke ayat tertentu dalam surah yang sedang dibuka.

### C. Interaksi Per Ayat
Setiap ayat dapat diklik untuk memunculkan menu pop-over:
* **Tandai Terakhir Baca:** Menyimpan progres bacaan secara lokal.
* **Lihat Terjemah:** Menampilkan terjemahan resmi bahasa Indonesia.
* **Play Audio:** Memutar murattal (1 qari pilihan, sumber open-source).

## 4. Arsitektur Teknis & Stack
* **Framework:** React JS.
* **Styling:** Tailwind CSS (fokus pada pengaturan grid untuk halaman).
* **Methodology:** Offline-first menggunakan Service Workers (PWA).
* **Penyimpanan Lokal:** * **IndexedDB (Dexie.js):** Untuk menyimpan seluruh teks Al-Qur'an dan terjemahan.
    * **LocalStorage:** Untuk menyimpan preferensi dan *last read*.
* **Sumber Data (API):** * Teks Al-Qur'an: `equran.id` atau API Kemenag (Open Source).
    * Audio: API dari Quran.com (Audio per ayat).

## 5. Rencana Pengembangan (Tanpa Timeline)

### Tahap 1: Setup Proyek & Database
* Inisialisasi aplikasi menggunakan React dan Tailwind CSS.
* Konfigurasi `vite-plugin-pwa` atau Service Worker dasar.
* Perancangan skema database IndexedDB untuk menampung data Al-Qur'an agar bisa diakses offline.

### Tahap 2: Integrasi & Seeding Data
* Pembuatan modul untuk mengambil data dari API publik.
* Proses *seeding* (pengunduhan awal) data teks Al-Qur'an ke IndexedDB saat user pertama kali membuka aplikasi.
* Pemetaan ayat ke dalam nomor halaman sesuai standar Kemenag (15 baris per halaman).

### Tahap 3: Pengembangan UI Core (Spread View)
* Pembuatan komponen `PageContainer` yang mampu merender list ayat berdasarkan nomor halaman.
* Implementasi logika navigasi halaman (Halaman `n` dan `n+1`).
* Penyusunan tata letak desktop yang bersih dan fokus pada teks.

### Tahap 4: Navigasi & Fitur Interaktif
* Implementasi logika dropdown yang sinkron (misal: pilih Surah otomatis memperbarui daftar Ayat).
* Pengembangan komponen Audio Player per ayat.
* Pembuatan sistem Bookmark (Last Read).
* Implementasi modal/overlay untuk menampilkan Terjemahan.

### Tahap 5: Finalisasi Offline & Optimasi
* Pengujian akses aplikasi dalam kondisi *airplane mode*.
* Optimasi caching untuk file audio agar tidak membebani memori namun tetap bisa diakses cepat.
* Polesan akhir pada transisi antar halaman.

## 6. Strategi Offline-First
1.  **First Load:** Mendeteksi koneksi, mengunduh data teks ke IndexedDB.
2.  **Asset Caching:** Seluruh file statis (font Arab, CSS, JS) disimpan di Cache Storage.
3.  **Fallback Mode:** Jika user tidak memiliki internet, aplikasi akan mengambil data langsung dari IndexedDB tanpa melakukan request ke API eksternal.
