# Rabva UI — Copilot Instructions

## Theming & CSS Variables

- Every theme defines three mandatory CSS custom properties applied to `:root` via JS in `AuthContext.jsx`:
  - `--rabva-bg` — page background color
  - `--rabva-text` — primary text color
  - `--rabva-translation` — accent/translation color
  - `--rabva-selected` — highlight color for all interactive selections
- Never hardcode colors for highlighted/selected states. Always use `var(--rabva-selected)`.
- All UI font sizes outside of Quran/translation text use `var(--menu-font-size, 1.4rem)`.
- Quran text font size uses `var(--quran-font-size)`. Translation text uses `var(--translation-font-size)`.
- The CSS variable scope for all variables must be the root wrapper `<div>` in `Home.jsx` — never scoped only to `.quran-page`.

## Highlight & Selection Rules

- **Never use background rectangle fill** to highlight a selected ayah. Use font color change only (`color: var(--rabva-selected)`).
- All highlights across the entire app — ayah text, matched root words (`is-matched`), search row backgrounds (`.highlighted`) — must use the **same `--rabva-selected` variable**. They must be visually consistent within each theme.
- Selected ayah interaction: single click selects; double-click on already-selected ayah deselects (sets to null).
- Highlight colors must contrast well against the theme background — never near-invisible.
- Default theme highlight colors:
  - `default` (white bg): `#0ea5e9` (sky blue)
  - `sepia` (warm bg): `#2563eb` (royal blue)
  - `night` (dark bg): `#4ade80` (bright green)

## Loading State — DRY Rule

- **Always use the shared `<LoadingDots />` component** (`src/components/LoadingDots/LoadingDots.jsx`) for every loading state across the app.
- Never write inline loading markup (`<div>Loading...</div>`, `<h3>Loading ...</h3>`, text-only spinners).
- The `LoadingDots` component renders `.loading-dots-wrap > span.loading-dots`. All styles live in `global.scss`.
- The dots animate in 6 steps from dark green (`#166534`) to bright green (`#86efac`) — low to high spectrum.
- Font size is `calc(var(--menu-font-size, 1.4rem) * 2)`.

## DRY & CSS Architecture

- Global reusable styles (loading, selection, icons) belong in `src/styles/global.scss`.
- Component-scoped styles belong in the component's own `.scss` file.
- Never duplicate `@keyframes` or utility classes across component SCSS files — define once in `global.scss`.
- Theme-specific overrides go in `AuthContext.jsx` `themeMap`, not in scattered SCSS `:root[data-rabva-theme]` blocks unless unavoidable.

## UI Labels & Copy

- Keep labels concise. Example: "translation distance" not "Quran/translation distance".
- Avoid redundant words in labels that are already clear from context.

## UI Controls

- Font size pickers use the custom `CompactScrollSelect` component — never a native `<select>` or `<input type="number">`.
- Dropdowns that must open near their trigger use `position: relative` on the trigger and `position: absolute; left: 50%; transform: translateX(-50%)` on the menu for centering.
- Overflow on containing elements that clip absolutely positioned dropdowns must be `visible`, not `hidden`.
