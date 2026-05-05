# Project Overview: Mushaf Desktop Indonesia

Mushaf Desktop Indonesia is a specialized React-based Al-Qur'an application designed specifically for desktop environments. It aims to replicate the physical Mushaf reading experience using a "spread view" (two-page layout), following the Indonesian Standard Mushaf (MSI) from Kemenag RI.

## Core Features
- **Spread View Layout:** Displays two pages side-by-side (even page on the left, odd on the right).
- **Integrated Navigation:** Dropdown menus for Surah, Juz, Page, and Ayah.
- **Offline-First Strategy:** Uses `localStorage` for caching Quran data and "Last Read" position. Data is seeded from the `alquran.cloud` API.
- **Ayah Interaction:** Interactive ayahs with pop-over menus for:
  - Marking "Last Read".
  - Viewing Indonesian translations.
  - Playing murattal audio (Sheikh Alafasy).
- **Desktop Focus:** Fixed layout optimized for desktop precision (not responsive for mobile).

## Tech Stack
- **Frontend:** React (JS) + Vite.
- **Styling:** Vanilla CSS (App.css) with a focus on CSS Grid for the mushaf layout.
- **Data Source:** AlQuran.cloud API (Uthmani text, Indonesian translation, and audio).
- **State Management:** React Hooks (`useState`, `useEffect`, `useMemo`, `useRef`).

## Building and Running

| Task | Command |
| :--- | :--- |
| **Install Dependencies** | `npm install` |
| **Start Dev Server** | `npm run dev` |
| **Build for Production** | `npm run build` |
| **Linting** | `npm run lint` |
| **Preview Build** | `npm run preview` |

## Project Structure
- `PRD_Quran_App_Desktop.md`: Product Requirement Document and development roadmap.
- `quran-desktop/`: Main application directory.
    - `src/App.jsx`: Primary application logic, including data fetching, indexing, and UI rendering.
    - `src/App.css`: Visual styling and layout configuration.
    - `src/main.jsx`: Entry point for the React application.
- `public/`: Static assets (favicon, icons).

## Development Conventions
- **Naming:** Follow standard React/JavaScript camelCase conventions.
- **Styling:** Prefer Vanilla CSS for layout precision.
- **Data Fetching:** Centralized in `App.jsx` with local storage caching.
- **Language:** Code is in English (logic/comments), UI is in Indonesian (as per PRD).

## Future Roadmap (Inferred from PRD)
- Transition to `IndexedDB` (Dexie.js) for robust offline storage.
- Implementation of `vite-plugin-pwa` for full PWA support.
- Audio caching for offline playback.
