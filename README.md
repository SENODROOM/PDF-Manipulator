# Leaflet — PDF Page Editor

A small React app for removing pages from a PDF entirely in the browser. Drop in a PDF, see every
page as a thumbnail, click the pages you want gone, then download the trimmed file. Nothing is ever
uploaded — the document is read, rendered and rebuilt on your own machine.

## Stack

- React 18 + Vite
- `pdfjs-dist` — renders page thumbnails and the full-size preview
- `pdf-lib` — builds the new PDF from the pages you kept

Both PDF libraries are code-split and loaded on demand, so the initial bundle stays small
(~56 kB gzipped) and the ~290 kB of PDF machinery only arrives once you open a file.

## Setup

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

The production build is written to `dist/` — deploy that folder to any static host (Vercel, Netlify,
GitHub Pages, S3, …). No server component is required.

## Using it

| Action | How |
| --- | --- |
| Open a file | Drop a PDF anywhere on the page, or click the drop zone to browse |
| Mark a page | Click its thumbnail |
| Mark a run of pages | Click the first, then **Shift**-click the last |
| Quick picks | *First page* / *Last page* / *Invert* / *Clear marks* |
| Undo a change | **Ctrl/Cmd + Z**, or the *Undo* button |
| Preview a page | Hover a thumbnail and click the ⤢ button — **←/→** to page through, **Esc** to close |
| Resize thumbnails | The slider above the grid (remembered between visits) |
| Export | *Download edited PDF* → `<original-name>-edited.pdf` |

The theme follows your system setting and can be overridden with the toggle in the header.

## Project layout

```
src/
  App.jsx                 composition + toasts + global shortcuts
  components/             presentational UI, one CSS module each
    ActionBar             fixed export bar for narrow viewports
    Board                 toolbar + page grid + empty state
    Button / Icon         shared primitives
    Dropzone
    DropOverlay           full-window "drop to open" affordance
    Masthead
    PageCard              one page thumbnail (+ skeleton placeholder)
    PreviewDialog         full-size page preview
    Sidebar               file summary, quick picks, tally, export
    Toast
  hooks/
    usePdfEditor          the document state machine (see below)
    useFileDrop           window-wide drop target
    useTheme              light/dark/system preference
    useStoredNumber       localStorage-backed number
  lib/
    pdf.js                all pdf.js / pdf-lib calls; no React
    format.js             byte sizes, pluralisation, page ranges
    cx.js
  styles/
    tokens.css            colour, type, spacing and radius tokens (light + dark)
    base.css              reset and global element styles
```

The rule the layout follows: `lib/` knows about PDFs but not React, `hooks/` holds the state and
side effects, and `components/` only renders what it is handed.

### How the document state works

`usePdfEditor` is a reducer plus a few refs, and it owns everything about the open file:

1. The file is read once into a `Uint8Array`. pdf.js transfers whatever buffer it is given to its
   worker, so it gets a private copy and the original bytes stay intact for the export step.
2. Pages are rendered one at a time and pushed into state as they arrive, so the grid fills in
   progressively instead of blocking on a long document. Un-rendered pages show as placeholders.
3. Every load is tagged with a generation id. Opening a second file abandons the first render loop
   instead of letting the two interleave, and revokes the thumbnails it had already produced.
4. Thumbnails are object URLs, not data URLs, and are revoked on reset and on unmount.
5. Selection changes are applied inside the reducer, which keeps the callbacks referentially stable
   so the memoised page grid doesn't re-render on every click, and makes undo a matter of keeping
   the previous set.

Export copies the pages you kept into a brand-new document with `pdf-lib` and hands it to the
browser as a download. The file you opened is never modified.
