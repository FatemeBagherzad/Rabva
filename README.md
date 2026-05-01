# Rabva Quran Hefz Platform

Live website: https://rabva.ddns.net/

This repository is the frontend for the Rabva Quran platform. It works with the backend services in `rabva-backend` (same workspace) to provide Quran reading, search, translation, account features, and the research canvas experience.

## Project Overview

The product combines two main parts:

- Frontend: `quran-hefz-ui` (React + Vite)
- Backend: `rabva-backend` (mainly Django REST API + MySQL + Docker + Nginx)

At runtime, the frontend calls backend API groups through these base paths:

- `/main`
- `/words`
- `/translations`
- `/grammar`
- `/rabva-accounts`
- `/research-social`

In local development, Vite proxies these paths to `VITE_BACKEND_URL`.

## How The Code Works

1. `src/main.jsx` bootstraps React.
2. `src/App.jsx` wraps the app with `AuthProvider` and Router.
3. `src/pages/Home/Home.jsx` is the central page controller:
   - Quran reading mode
   - Search-by-root mode
   - Research mode (`/research`, `/research/new`, `/research/:id`)
4. `src/hooks/useQuranData.jsx` loads and manages Quran data, translations, roots, and pagination.
5. `src/services/*.jsx` files are API adapters.
6. `src/context/AuthContext.jsx` manages authentication, user profile, preferences, and theme variables.

## Frontend Technologies (`quran-hefz-ui`)

- React 18
- Vite 5
- React Router
- Axios
- Sass
- Bootstrap
- React Swipeable

Key scripts:

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - lint frontend code

## Backend Technologies (`rabva-backend`)

Main backend stack (active API layer):

- Python Django
- Django REST Framework
- MySQL
- drf-yasg (Swagger and ReDoc)
- Docker Compose
- Nginx reverse proxy

There is also legacy/auxiliary code in the backend workspace (for example Angular and Go folders), but the API used by this frontend is served by the Django project under `rabva-backend/django/quranserver`.

## Core Features

- Quran page reading and navigation (1-604)
- Word-by-word Quran mode
- Translation by ayah with language and translator selection
- Root-based search with pagination and incremental caching
- Research mode with authenticated access:
  - research list/hub
  - create research
  - load research canvas
  - rename/delete research
  - save nodes, connections, and canvas state
- Account system:
  - register/login/logout
  - profile update
  - preferences and theme
  - avatar upload
  - password recovery

## API Surface Used By Frontend

### Quran Data

- `GET /main/surahnames/`
- `GET /main/pagesinfo/`
- `GET /main/ayahpagesinfo/`
- `GET /main/quran/`

### Words and Root Search

- `GET /words/quran_word_by_word/`
- `GET /words/one_ayah_word_by_word/`
- `GET /words/root/`
- `GET /words/word_root/`

### Translations

- `GET /translations/languages/`
- `GET /translations/translation_names/`
- `GET /translations/translate_ayahs/`
- `GET /translations/quran_h_translate_word_by_word/`

### Grammar

- `GET /grammar/roots/`

### Accounts

- `GET /rabva-accounts/captcha/`
- `POST /rabva-accounts/register/`
- `POST /rabva-accounts/login/`
- `POST /rabva-accounts/logout/`
- `GET /rabva-accounts/me/`
- `PUT /rabva-accounts/me/profile/`
- `PUT /rabva-accounts/me/preferences/`
- `POST /rabva-accounts/me/avatar/`
- `POST /rabva-accounts/password-recovery/request/`
- `POST /rabva-accounts/password-recovery/reset/`

### Research Social

- `GET /research-social/researches/`
- `POST /research-social/researches/`
- `GET /research-social/researches/:id/`
- `DELETE /research-social/researches/:id/`
- `PUT /research-social/researches/:id/rename/`
- `PUT /research-social/researches/:id/save/`

## Local Development

### 1) Start Backend

From workspace root:

```bash
cd rabva-backend
source deploy/env-local.sh
./up-all.sh
```

This starts Django and related services using Docker Compose.

### 2) Start Frontend

From workspace root:

```bash
cd quran-hefz-ui
npm install
```

Create `.env` in `quran-hefz-ui` and set:

```env
VITE_BACKEND_URL=http://localhost:8880
```

Then run:

```bash
npm run dev
```

Default local frontend URL is `http://localhost:3004`.

## Deployment Notes

- Production/public access is available at: https://rabva.ddns.net/
- Frontend expects backend route groups to be reachable under the same host or through proxy rules.

## Folder Guide

Frontend focus:

- `src/pages/Home/` - app orchestration and route mode switching
- `src/components/` - UI blocks (Quran, search, player, research canvas, profile)
- `src/hooks/useQuranData.jsx` - Quran data loader and composition logic
- `src/services/` - API client modules
- `src/context/AuthContext.jsx` - authentication and preferences state

Backend focus:

- `rabva-backend/django/quranserver/quran/` - Django settings and root URLs
- `rabva-backend/django/quranserver/main/` - Quran core endpoints
- `rabva-backend/django/quranserver/words/` - word and root endpoints
- `rabva-backend/django/quranserver/translations/` - translation endpoints
- `rabva-backend/django/quranserver/grammar/` - grammar endpoints
- `rabva-backend/django/quranserver/rabva_accounts/` - auth/profile/preferences
- `rabva-backend/django/quranserver/research_social/` - research domain API

## Quick Summary

`quran-hefz-ui` is the active React frontend. `rabva-backend` provides the API and infrastructure it depends on. Together they power Quran reading, linguistic lookup, personalization, and collaborative research workflows.
