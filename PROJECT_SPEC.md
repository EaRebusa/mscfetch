# Project Specification: Music Fetcher CLI

## Objective
Build an interactive Node.js terminal CLI that runs via `npx`, searches YouTube for audio tracks, allows single or batch selection, extracts highest-quality audio as MP3 via yt-dlp and FFmpeg, and saves them to `~/Downloads/MusicDownloads`.

## Architecture Pattern
Strict MVC (Model-View-Controller) with native ES Modules (`"type": "module"` in package.json).

## Directory Structure
- bin/index.js (Executable entrypoint with #!/usr/bin/env node)
- src/config/paths.js (Downloads directory resolution)
- src/models/track.js (Track data structure)
- src/services/searchService.js (yt-dlp metadata query)
- src/services/downloadService.js (yt-dlp extraction, batch queue, FFmpeg conversion)
- src/utils/envCheck.js (FFmpeg presence verification)
- src/views/terminalView.js (Prompts, spinners, checkbox menus)
- src/controllers/appController.js (Main event and flow loop)

## Core Features & Requirements
1. Environment Check: Verify `ffmpeg` exists in system PATH before allowing searches; exit cleanly with instructions if missing.
2. Cross-Platform Directory: Automatically resolve and create `Downloads/MusicDownloads` inside the user's home directory.
3. Metadata-Only Search: Query YouTube using `yt-dlp` without downloading media chunks, returning title, channel, duration, and URL.
4. Selection View: Interactive terminal checklist allowing single or multi-select with 'd' key, Esc to navigate back, and confirmation with Enter.
5. Audio Quality: Best audio stream converted to MP3 using VBR 0 (~320kbps) with metadata tags preserved.
6. Sanitization & Safety: Strip illegal filesystem characters (`<>:"/\|?*`) from track titles before writing to disk.
7. Concurrency: Process batch downloads with a limit of 2 concurrent downloads.
8. Loop Control: Prompt user to run another search or exit upon completion.