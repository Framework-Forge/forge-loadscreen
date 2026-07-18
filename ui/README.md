# FiveM Loading Screen (React)

A dark-themed FiveM loading screen with **video background** (local or YouTube), **music control widget**, loading progress, server stats, and nav buttons.

## Setup

1. **Install and build** (run from this `ui` folder)
   ```bash
   cd ui
   npm install
   npm run build
   ```

2. **FiveM resource**
   - Copy the whole project (including `ui/dist/`) into your server `resources` folder (e.g. `resources/loading/`).
   - In `server.cfg`: `ensure loading`
   - Optional: hide default spinner: `setr sv_showBusySpinnerOnLoadingScreen false`

3. **Configure**
   - **In FiveM:** edit **`PR.lua`** at the resource root (one folder above `ui/`). That file is the source of truth when players connect; the server sends it to the loading screen.
   - **For local dev** (or fallback): edit `src/PR.js` in this folder:
     - `videoSource`: path to local video (e.g. `/videos/background.mp4`) or YouTube URL.
     - `videoType`: `'auto'` (default), `'local'` or `'youtube'`.
     - `musicTracks`: array of `{ name, src }` (e.g. `src: '/music/ambient.mp3'`).
   - Rebuild after config changes: `npm run build`.

4. **Local/YouTube video**
   - **Local**: Put video in `public/videos/` and set `videoSource: '/videos/background.mp4'`.
   - **YouTube**: Set `videoSource: 'https://www.youtube.com/watch?v=VIDEO_ID'`.

5. **Music**
   - Put audio in `public/music/` and set `src` in `musicTracks`.

## Development

- `npm run dev` — local preview (run from this `ui` folder).
- `npm run build` — output in `dist/` for use as loadscreen.

The repo root only has `fxmanifest.lua` and this `ui/` folder. All UI source, assets, and build output live here.
