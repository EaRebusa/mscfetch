# 🎵 mscfetch

[![npm version](https://img.shields.io/npm/v/mscfetch.svg?color=cb3837)](https://www.npmjs.com/package/mscfetch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

An interactive terminal CLI that searches YouTube for audio tracks, accumulates songs into a batch queue across multiple searches, extracts high-quality audio as MP3 (VBR 0, ~320kbps), and embeds ID3 metadata automatically.

---

## ⚡ Quick Start

Run directly with zero installation via `npx`:

```bash
npx mscfetch
```

Or install globally on your system:

```bash
npm install -g mscfetch
mscfetch
```

---

## 📋 Prerequisites

1. **[Node.js](https://nodejs.org/)** (v18 or higher)
2. **[FFmpeg](https://ffmpeg.org/download.html)** in your system PATH (required for audio conversion and metadata embedding)

### Installing FFmpeg

If FFmpeg is not already installed, `mscfetch` will automatically detect your OS and offer to install it for you (with an explicit option to decline). You can also install it manually:

- **Windows**:
  ```powershell
  winget install Gyan.FFmpeg
  ```
  *(or via Chocolatey: `choco install ffmpeg`)*

- **macOS**:
  ```bash
  brew install ffmpeg
  ```

- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt-get update && sudo apt-get install -y ffmpeg
  ```

---

## 🚀 Features

- **🔍 Metadata-Only Search**: Rapidly searches YouTube using `yt-dlp` without preloading or buffering audio stream data.
- **📋 Multi-Search Queue**: Search for track 1 (e.g. *When September Ends*), add it to your queue, search for track 2 (e.g. *All I Want*), and download everything together.
- **🎧 High Quality Audio (VBR 0)**: Converts best audio streams to MP3 using VBR 0 (~320kbps) via FFmpeg.
- **🏷️ Metadata Tags Embedded**: Embeds artist, track title, and media tags directly into the generated MP3 files.
- **⚡ 2-Worker Concurrency Pool**: Processes downloads in parallel using an internal concurrency queue limited to 2 workers to prevent throttling.
- **🛡️ Windows/Unix Filename Sanitizer**: Automatically cleans illegal characters (`<>:"/\|?*`) and protects against path traversal.
- **📂 Cross-Platform Downloads**: Automatically resolves and saves output directly to `~/Downloads/MusicDownloads`.

---

## 💻 Workflow Example

```
🎵 Music Fetcher CLI 🎵

? Enter search query (artist or song): Green Day Wake Me Up When September Ends
✔ Found tracks

? Select tracks to add to queue ('d' to toggle, Enter to confirm, Esc to go back):
  [ ] Green Day - Wake Me Up When September Ends (Green Day - 4:45)
  [x] Green Day - Wake Me Up When September Ends [Official Video] (4:45)

✔ Added 1 track(s) to queue. Total in queue: 1

? Queue Menu - choose action:
❯ ➕ Add more songs to queue (search again)
  ⬇️ Download queue (1 track)
  🗑️ Clear queue
  ❌ Exit

? Enter search query (artist or song): Paramore All I Want
...
✔ Added 1 track(s) to queue. Total in queue: 2

? Queue Menu - choose action:
  ➕ Add more songs to queue (search again)
❯ ⬇️ Download queue (2 tracks)
  🗑️ Clear queue
  ❌ Exit

Starting batch download of 2 track(s)...
✔ Downloaded: Green Day - Wake Me Up When September Ends [Official Video]
✔ Downloaded: Paramore - All I Want
✔ All downloads saved to: C:\Users\...\Downloads\MusicDownloads
```

---

## 🏗️ Architecture

Built using native ES Modules (`"type": "module"`) following a strict Model-View-Controller (MVC) pattern:

```
├── bin/
│   └── index.js              # Executable entrypoint (#!/usr/bin/env node)
├── src/
│   ├── config/
│   │   └── paths.js          # Cross-platform ~/Downloads/MusicDownloads resolution
│   ├── controllers/
│   │   └── appController.js  # Main application event & queue loop
│   ├── models/
│   │   └── track.js          # Track data structure & duration formatting
│   ├── services/
│   │   ├── searchService.js  # yt-dlp metadata query
│   │   └── downloadService.js# yt-dlp audio extraction & concurrency queue
│   ├── utils/
│   │   └── envCheck.js       # FFmpeg presence verification & auto-installer
│   └── views/
│       └── terminalView.js   # Terminal prompts, spinners, & menus
├── package.json
└── README.md
```

---

## 📄 License

MIT © [EaRebusa](https://github.com/EaRebusa)
