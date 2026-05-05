import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgPath = path.join(__dirname, '../package.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;
const date = new Date().toLocaleDateString('id-ID', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const defaultEntry = `
## [${version}] - ${date}
### Ditambahkan
- Inisialisasi Mushaf Desktop Indonesia.
- Layout spread view (Halaman 1-2, 3-4, dst).
- Offline-first dengan Dexie.js (IndexedDB).
- Dukungan PWA untuk instalasi desktop.
- Font Al-Qur'an (Amiri) dengan teks justified.
- Navigasi per Surah, Juz, Halaman, dan Ayat.
- Fitur Terakhir Baca (Last Read).
- Audio Murattal & Terjemahan Bahasa Indonesia.
`;

let changelogContent = '';
if (fs.existsSync(changelogPath)) {
  changelogContent = fs.readFileSync(changelogPath, 'utf-8');
}

// Check if version already exists to avoid duplicates during retries
if (!changelogContent.includes(`## [${version}]`)) {
  const newContent = `# Changelog\n\n${defaultEntry}\n${changelogContent.replace('# Changelog\n\n', '')}`;
  fs.writeFileSync(changelogPath, newContent);
  console.log(`Updated CHANGELOG.md for version ${version}`);
} else {
  console.log(`Version ${version} already exists in CHANGELOG.md`);
}
