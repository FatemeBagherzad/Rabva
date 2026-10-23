# Rabva — Quran Platform

**Live website:** https://www.rabva.info:5443/

Rabva is a Quran study and memorization platform. It lets users read the full Quran page by page, browse each ayah word-by-word with morphological segments, search by Arabic root with paginated results, read ayah translations in many languages, and explore an interactive research canvas for making semantic connections between ayahs. Registered users get personalized reading preferences, font and theme settings, an avatar, and a saved reading position across devices.

## Architecture

This repository (`quran-hefz-ui`) is the React frontend. The backend is a Django REST API served from `rabva-backend/django/quranserver` and sits behind an Nginx reverse proxy. The database is MySQL.

```
Browser
  └── React SPA (quran-hefz-ui)
        └── Axios (proxied in dev via Vite, direct in prod)
              ├── /main            → Django: main app
              ├── /words           → Django: words app
              ├── /translations    → Django: translations app
              ├── /grammar         → Django: grammar app
              ├── /rabva-accounts  → Django: rabva_accounts app
              └── /research-social → Django: research_social app
```

All API calls go through six Axios instances defined in `src/api/api.jsx`, one per route group.

## How The Code Works

| File / Folder                 | Role                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/main.jsx`                | Bootstraps React into the DOM                                                                                  |
| `src/App.jsx`                 | Wraps everything in `AuthProvider` and `BrowserRouter`                                                         |
| `src/pages/Home/Home.jsx`     | Central page controller — owns mode switching between Quran reading, root search, and research canvas          |
| `src/hooks/useQuranData.jsx`  | Fetches and manages all Quran content: pages, surahs, translations, word-by-word data, and root search results |
| `src/context/AuthContext.jsx` | Auth state, token storage, user info, preferences, and theme CSS variables                                     |
| `src/services/`               | One file per API group — thin wrappers over Axios                                                              |
| `src/components/`             | UI blocks described below                                                                                      |

### Route structure

| URL             | Renders                             |
| --------------- | ----------------------------------- |
| `/`             | Quran reading view                  |
| `/research`     | Research hub (requires login)       |
| `/research/new` | Create research form                |
| `/research/:id` | Research canvas for a specific item |

## Components

| Component            | Purpose                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TopNavigation`      | Top bar: logo, search trigger, language switcher, research mode toggle, user avatar                                                                |
| `MainMenu`           | Slide-out menu: Homepage, Memorize App, Memorize Plan, Coaches, About, Contact                                                                     |
| `QuranHeader`        | Surah selector, page navigator, view toggles (word-by-word, translation)                                                                           |
| `QuranTxt`           | Renders full Quran ayahs by page, highlights selected ayah using `--rabva-selected`                                                                |
| `QuranTxtByWord`     | Word-by-word view with morphological segments per word                                                                                             |
| `QuranPlayer`        | Quran audio player tied to currently displayed Quran data                                                                                          |
| `Search`             | Root search input with autocomplete from the full root list                                                                                        |
| `SearchResult`       | Paginated list of ayahs matching a selected root                                                                                                   |
| `AyahMapCanvas`      | Interactive research canvas: pan/zoom viewport, draggable ayah nodes, connection drawing between words/segments, undo/redo, subset group selection |
| `UserProfileOverlay` | Profile panel: avatar upload, display name, theme picker, font and size pickers, reading preferences                                               |
| `LoadingDots`        | Shared animated loading indicator used everywhere — never replaced with inline spinners                                                            |

## Libraries

| Library                | Version | Used For                            |
| ---------------------- | ------- | ----------------------------------- |
| `react`                | ^18.3.1 | UI rendering                        |
| `react-dom`            | ^18.3.1 | DOM mounting                        |
| `react-router-dom`     | ^7.5.1  | Client-side routing                 |
| `axios`                | ^1.7.7  | All HTTP requests                   |
| `sass`                 | ^1.79.5 | Component and global styling        |
| `bootstrap`            | ^5.3.5  | Layout grid and utility classes     |
| `react-swipeable`      | ^7.0.2  | Touch swipe to navigate Quran pages |
| `react-hot-toast`      | ^2.4.1  | Toast notifications                 |
| `react-helmet`         | ^6.1.0  | Document head management            |
| `jsonwebtoken`         | ^9.0.2  | JWT decode on the client            |
| `vite`                 | ^5.4.0  | Dev server and production bundler   |
| `@vitejs/plugin-react` | ^4.3.1  | React Fast Refresh in Vite          |
| `eslint`               | ^9.8.0  | Linting                             |

## Authentication

Authenticated endpoints require an `Authorization: Bearer <token>` header. The token is obtained from `POST /rabva-accounts/login/` and stored in `localStorage` under the key `rabva_auth_v1`. The `AuthContext` injects it automatically via the `withAuthHeaders(token)` helper in `src/services/rabvaAccountService.jsx`.

---

## API Reference

> **Auth column:** `—` = no auth needed, `Bearer` = `Authorization: Bearer <token>` required.
> All endpoints return `Content-Type: application/json` unless noted.

---

### Quran Data (`/main`)

#### `GET /main/surahnames/`

Returns the list of all 114 surahs.

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{
  "surahs": [
    {
      "surah_number": 1,
      "name": "الفاتحة",
      "english_name": "Al-Fatiha",
      "ayah_count": 7
    }
  ]
}
```

---

#### `GET /main/pagesinfo/`

Returns start/end ayah for every Quran page (1–604).

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{
  "pages": {
    "1": [1, 1, 2, 141],
    "2": [2, 142, 2, 252]
  }
}
```

Each value is `[startSurah, startAyah, endSurah, endAyah]`.

---

#### `GET /main/ayahpagesinfo/`

Maps every ayah to its Quran page number.

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{
  "ayah_page": { "1": { "1": 1, "2": 1 }, "2": { "1": 2 } }
}
```

---

#### `GET /main/quran/`

Returns Quran ayah text for a range starting from a given ayah.

| Auth | Query params                                                                |
| ---- | --------------------------------------------------------------------------- |
| —    | `surah_number`, `ayah_number`, `per_page` (default 500), `page` (default 1) |

**Response**

```json
{
  "data": {
    "1": { "1": "بِسْمِ ٱللَّهِ...", "2": "ٱلْحَمْدُ لِلَّهِ..." }
  },
  "pagination": { "current_page": 1, "total_pages": 1 }
}
```

---

### Words (`/words`)

#### `GET /words/quran_word_by_word/`

Returns the full word-by-word breakdown for a page range.

| Auth | Query params                                      |
| ---- | ------------------------------------------------- |
| —    | `surah_number`, `ayah_number`, `per_page`, `page` |

**Response**

```json
{
  "data": {
    "1": {
      "1": {
        "whole_words": ["بِسْمِ", "ٱللَّهِ"],
        "segments_by_word": [["bi", "ism"], ["Allah"]]
      }
    }
  }
}
```

---

#### `GET /words/one_ayah_word_by_word/`

Returns word-by-word data for a single ayah. Used by the research canvas to resolve typed ayah addresses.

| Auth | Query params                  |
| ---- | ----------------------------- |
| —    | `surah_number`, `ayah_number` |

**Response**

```json
{
  "data": {
    "surah_number": 2,
    "ayah_number": 4,
    "ayah_word_by_word": {
      "whole_words": ["وَٱلَّذِينَ"],
      "segments_by_word": [["wa", "alladhina"]]
    }
  }
}
```

---

#### `GET /words/root/`

Search all ayahs containing a given Arabic root. Results are paginated and the UI caches previously loaded pages in a `Map` ref.

| Auth | Query params                                                  |
| ---- | ------------------------------------------------------------- |
| —    | `root` (Arabic root string), `per_page` (default 100), `page` |

**Response**

```json
{
  "data": [
    {
      "surah_number": 2,
      "ayah_number": 30,
      "text": "...",
      "matched_words": ["يَعْلَمُ"]
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 250,
    "has_next": true,
    "has_previous": false
  }
}
```

---

#### `GET /words/word_root/`

Returns the full Arabic root list used to populate the search autocomplete.

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{ "data": ["علم", "كتب", "قرأ"] }
```

---

### Translations (`/translations`)

#### `GET /translations/languages/`

Returns all supported translation languages.

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{
  "data": {
    "fa": ["فارسی", true],
    "en": ["English", false]
  }
}
```

Each value is `[displayName, isRtl]`.

---

#### `GET /translations/translation_names/`

Returns all available translators grouped by language.

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{
  "data": {
    "language_category": {
      "fa": [{ "translator": "مهدی حسینی", "translation_code": 1 }]
    },
    "1": { "translation_code": 1, "language_code": "fa" }
  }
}
```

---

#### `GET /translations/translate_ayahs/`

Returns per-ayah translation text for a given translator and page range.

| Auth | Query params                                                          |
| ---- | --------------------------------------------------------------------- |
| —    | `translation_code`, `surah_number`, `ayah_number`, `per_page`, `page` |

**Response**

```json
{
  "data": {
    "1": { "1": "به نام خداوند بخشنده مهربان" }
  }
}
```

---

#### `GET /translations/quran_h_translate_word_by_word/`

Returns the word-by-word translation overlay (used in `QuranTxtByWord` mode).

| Auth | Query params                                      |
| ---- | ------------------------------------------------- |
| —    | `surah_number`, `ayah_number`, `per_page`, `page` |

**Response** shape mirrors `/main/quran/` but values are translated word strings.

---

### Grammar (`/grammar`)

#### `GET /grammar/roots/`

Returns the complete root list from the grammar database (used differently from `/words/word_root/`).

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{ "data": ["علم", "قرأ"] }
```

---

### Accounts (`/rabva-accounts`)

#### `GET /rabva-accounts/captcha/`

Generates a CAPTCHA challenge required before register and login.

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{ "captcha_id": "uuid", "image_url": "/media/captcha/uuid.png" }
```

---

#### `POST /rabva-accounts/register/`

Creates a new user account.

| Auth | Body                                                        |
| ---- | ----------------------------------------------------------- |
| —    | `{ username, email, password, captcha_id, captcha_answer }` |

**Response**

```json
{ "detail": "Registration successful." }
```

---

#### `POST /rabva-accounts/login/`

Authenticates a user and returns a Bearer token.

| Auth | Body                                                 |
| ---- | ---------------------------------------------------- |
| —    | `{ username, password, captcha_id, captcha_answer }` |

**Response**

```json
{
  "token": "eyJ...",
  "user": {
    "id": 1,
    "username": "ali",
    "profile": { "avatar_cropped": "/media/avatars/ali.jpg" },
    "preferences": { "theme_code": "night", "quran_font_size": 2.5 }
  }
}
```

---

#### `POST /rabva-accounts/logout/`

Invalidates the session token server-side.

| Auth   | Body         |
| ------ | ------------ |
| Bearer | `{}` (empty) |

**Response**

```json
{ "detail": "Logged out." }
```

---

#### `GET /rabva-accounts/me/`

Returns the currently authenticated user's full profile and preferences.

| Auth   | Query params |
| ------ | ------------ |
| Bearer | none         |

**Response** — same shape as the `user` object in the login response.

---

#### `GET /rabva-accounts/today-ayah/`

Returns the ayah of the day (no auth required).

| Auth | Query params |
| ---- | ------------ |
| —    | none         |

**Response**

```json
{
  "surah_number": 2,
  "ayah_number": 255,
  "text": "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ..."
}
```

---

#### `PUT /rabva-accounts/me/profile/`

Updates display name, bio, or other profile fields.

| Auth   | Body                      |
| ------ | ------------------------- |
| Bearer | `{ display_name?, bio? }` |

**Response** — updated profile object.

---

#### `PUT /rabva-accounts/me/preferences/`

Saves reading/display preferences. The full normalized preferences object is always sent.

| Auth   | Body                                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bearer | `{ theme_code, quran_font_family, quran_font_size, translation_font_family, translation_font_size, menu_font_size, quran_translation_gap, line_height_quran, line_height_translation }` |

**Response** — updated preferences object.

---

#### `POST /rabva-accounts/me/avatar/`

Uploads a user avatar image.

| Auth   | Body                                    |
| ------ | --------------------------------------- |
| Bearer | `multipart/form-data` with `file` field |

**Response**

```json
{
  "avatar_cropped": "/media/avatars/cropped_uuid.jpg",
  "crop": {
    "x": 0,
    "y": 0,
    "width": 200,
    "height": 200,
    "scale": 1,
    "rotation": 0
  }
}
```

---

#### `POST /rabva-accounts/password-recovery/request/`

Sends a password reset email.

| Auth | Body        |
| ---- | ----------- |
| —    | `{ email }` |

**Response**

```json
{ "detail": "Recovery email sent." }
```

---

#### `POST /rabva-accounts/password-recovery/reset/`

Completes a password reset using the token from the email.

| Auth | Body                      |
| ---- | ------------------------- |
| —    | `{ token, new_password }` |

**Response**

```json
{ "detail": "Password updated." }
```

---

### Research Canvas (`/research-social`)

All endpoints in this group require `Bearer` auth.

#### `GET /research-social/researches/`

Lists all researches owned by the authenticated user, ordered by last update.

| Auth   | Response includes                                                                        |
| ------ | ---------------------------------------------------------------------------------------- |
| Bearer | `id`, `name`, `visibility`, `node_count`, `connection_count`, `created_at`, `updated_at` |

**Response**

```json
[
  {
    "id": "uuid",
    "name": "My Study",
    "node_count": 5,
    "connection_count": 3,
    "updated_at": "..."
  }
]
```

---

#### `POST /research-social/researches/`

Creates a new research. Name must be unique per user.

| Auth   | Body       |
| ------ | ---------- |
| Bearer | `{ name }` |

**Response** — full research detail object (201 Created). Returns 409 if name already exists.

---

#### `GET /research-social/researches/:id/`

Returns full research detail including all nodes and connections.

| Auth   |            |
| ------ | ---------- |
| Bearer | owner only |

**Response**

```json
{
  "id": "uuid",
  "name": "My Study",
  "canvas_state": { "pan": { "x": 0, "y": 0 }, "scale": 1 },
  "nodes": [
    {
      "client_id": "n1",
      "address": "2:255",
      "surah_number": 2,
      "ayah_number": 255,
      "x": 100,
      "y": 200,
      "node_type": "ready"
    }
  ],
  "connections": [
    {
      "client_id": "c1",
      "source_point_id": "n:n1:cp:right",
      "target_point_id": "n:n2:cp:left",
      "direction": "uni",
      "description": ""
    }
  ]
}
```

---

#### `DELETE /research-social/researches/:id/`

Deletes a research (owner only). Returns 204 No Content.

| Auth   |            |
| ------ | ---------- |
| Bearer | owner only |

---

#### `PUT /research-social/researches/:id/rename/`

Renames a research. Returns 409 if the new name is already taken.

| Auth   | Body       |
| ------ | ---------- |
| Bearer | `{ name }` |

**Response** — updated research detail.

---

#### `PUT /research-social/researches/:id/save/`

Saves the full canvas state (nodes, connections, viewport). Replaces all nodes and connections in bulk.

| Auth   | Body                                                 |
| ------ | ---------------------------------------------------- |
| Bearer | `{ canvas_state, nodes: [...], connections: [...] }` |

**Node object**

```json
{
  "client_id": "n1",
  "address": "2:255",
  "surah_number": 2,
  "ayah_number": 255,
  "x": 100,
  "y": 200,
  "width": 320,
  "height": 150,
  "node_type": "ready"
}
```

**Connection object**

```json
{
  "client_id": "c1",
  "source_point_id": "n:n1:cp:right",
  "target_point_id": "n:n2:cp:left",
  "direction": "uni",
  "description": "semantic link"
}
```

**Response** — full updated research detail. Returns 409 if duplicate ayah detected in nodes.

---

## Theming

Three built-in themes are applied via CSS custom properties on `:root` by `AuthContext`:

| Theme     | `--rabva-bg` | `--rabva-text` | `--rabva-translation` | `--rabva-selected` |
| --------- | ------------ | -------------- | --------------------- | ------------------ |
| `default` | `#ffffff`    | `#101828`      | `#039855`             | `#0ea5e9`          |
| `sepia`   | `#f8f2e6`    | `#3b2f22`      | `#775c2b`             | `#2563eb`          |
| `night`   | `#0f172a`    | `#e5e7eb`      | `#86efac`             | `#4ade80`          |

Font sizes and spacing are controlled via `--quran-font-size`, `--translation-font-size`, `--menu-font-size`, and `--quran-translation-gap`.

---

## Local Development

### 1. Start the backend

```bash
cd rabva-backend
source deploy/env-local.sh
./up-all.sh
```

This runs Django (port `8880`), Nginx, and MySQL via Docker Compose.

### 2. Start the frontend

```bash
cd quran-hefz-ui
npm install
```

Create `.env`:

```env
VITE_BACKEND_URL=http://localhost:8880
```

```bash
npm run dev
```

Frontend runs at `http://localhost:3004`. Vite proxies all `/main`, `/words`, `/translations`, `/grammar`, `/rabva-accounts`, and `/research-social` paths to the backend.

### Scripts

| Command           | Action                         |
| ----------------- | ------------------------------ |
| `npm run dev`     | Local dev server with HMR      |
| `npm run build`   | Production bundle to `dist/`   |
| `npm run preview` | Serve production build locally |
| `npm run lint`    | Run ESLint                     |

## Folder Guide

```
src/
├── api/            Axios instances (one per API group)
├── components/     UI components
├── context/        AuthContext — auth, preferences, theme
├── hooks/          useQuranData, useLocalStorageState, useOutsideClick
├── pages/Home/     App shell and route controller
├── services/       API call wrappers
├── styles/         global.scss and partials
└── utils/          Number conversion, scroll helpers
```
