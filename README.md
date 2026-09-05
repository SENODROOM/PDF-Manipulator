# Leaflet — PDF Page Editor

A small React app for removing pages from a PDF entirely in the browser (no upload to any server). Drop in a PDF, see every page as a thumbnail, click any page to mark it for removal (or use "Mark first page" / "Mark last page"), then download the edited PDF.

## Stack
- React 18 + Vite
- `pdfjs-dist` — renders page thumbnails
- `pdf-lib` — builds the new PDF with the marked pages removed (all done client-side)

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

The production build is written to `dist/` — you can deploy that folder to any static host (Vercel, Netlify, GitHub Pages, S3, etc.).

## How it works
1. The PDF you drop in is read locally with `pdfjs-dist` and each page is rendered to a small canvas thumbnail — nothing leaves your browser.
2. Click a thumbnail to mark it "Removed" (click again to unmark). "Mark first page" / "Mark last page" are shortcuts for the two most common trims.
3. "Download edited PDF" uses `pdf-lib` to copy every page you didn't mark into a brand-new PDF and triggers a download of `<original-name>-edited.pdf`. The original file/tab data is never sent anywhere.
