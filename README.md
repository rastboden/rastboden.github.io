# Leksaksutlåning (school deposit tool)

A small app for school staff to keep track of which toy is lent to which child,
and for how long. It is a PWA: it is installed from the browser on iOS and
Android, works offline, and keeps all data on the device. Nothing is sent
anywhere.

## Commands

```
npm install        # once
npm run dev        # start the dev server
npm run typecheck
npm run lint
npm test
npm run build      # production build in dist/
npm run preview    # serve the production build (the service worker only runs here)
```

## Stack

| Concern    | Choice                                             |
| ---------- | -------------------------------------------------- |
| App        | Vite, React, TypeScript                            |
| PWA        | `vite-plugin-pwa` (manifest + offline cache)       |
| Storage    | IndexedDB through Dexie                            |
| Forms      | react-hook-form + zod                              |
| UI         | Tailwind CSS + shadcn/ui components                |
| Languages  | i18next, Swedish (default) and English             |

## Layout

```
src/
  db/          tables and the functions that read and write them
  features/    one folder per screen (loans, toys, children, statistics, settings)
  components/  shared layout pieces; ui/ holds generated shadcn components
  i18n/        setup and the sv / en texts
  lib/         small helpers (image resizing)
```

## Things worth knowing

- **Loans are history.** Returning a toy sets `returnedAt`; the row stays. Toys
  and children are archived, not deleted, for the same reason. Statistics will
  are built from this history.
- **A toy is one physical item** and can only be out on one loan at a time.
- **Loan times** to choose from are set in `DURATION_CHOICES` in
  `src/features/loans/LendDialog.tsx`.
- **Statistics** are computed in `src/features/statistics/statistics.ts` from the
  loans in the chosen period. The charts are plain HTML and CSS, with no chart
  library; the bar colour is `--chart-1` in `src/index.css`.
- **Toy images** are shrunk to at most 512 px (JPEG) before they are stored, and
  live in their own table so that listing toys never loads image data.
- **Texts** go in `src/i18n/locales/sv.ts` first; `en.ts` must have the same
  keys, and a missing or misspelt key is a compile error.
- **Routing uses the URL hash** and the build uses relative paths, so `dist/`
  can be hosted from any sub-path (for example GitHub Pages) as it is.
- **App icons** are generated from `public/logo.svg`:
  `npx pwa-assets-generator --preset minimal-2023 public/logo.svg`

## Not built yet

Excel import of class lists (the file format is not decided).
