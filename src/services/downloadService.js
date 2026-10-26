import ytDlp from 'yt-dlp-exec';
import path from 'path';
import { getDownloadDir } from '../config/paths.js';

export function sanitizeFilename(title) {
  if (!title || typeof title !== 'string') {
    return 'untitled_track';
  }
  const stripped = title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');

  return stripped.length > 0 ? stripped : 'untitled_track';
}

export async function downloadTrack(track) {
  if (!track || !track.url) {
    return {
      success: false,
      title: track?.title || 'Unknown Track',
      error: 'Missing track URL',
    };
  }

  const downloadDir = getDownloadDir();
  const sanitizedTitle = sanitizeFilename(track.title);
  const safeTemplateName = sanitizedTitle.replace(/%/g, '%%');
  const outputTemplate = path.join(downloadDir, `${safeTemplateName}.%(ext)s`);

  try {
    await ytDlp.exec(track.url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: '0', // VBR 0 (~320kbps)
      output: outputTemplate,
      embedMetadata: true,
      noWarnings: true,
      format: 'bestaudio/best',
      jsRuntimes: 'node',
    });
    return {
      success: true,
      title: track.title,
      path: path.join(downloadDir, `${sanitizedTitle}.mp3`),
    };
  } catch (error) {
    return {
      success: false,
      title: track.title,
      error: error.message,
    };
  }
}

export async function downloadBatch(tracks, onUpdate) {
  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    return [];
  }

  const concurrency = 2;
  const results = new Array(tracks.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tracks.length) {
      const idx = currentIndex++;
      const track = tracks[idx];
      if (typeof onUpdate === 'function') {
        onUpdate({ status: 'started', track, index: idx });
      }
      const res = await downloadTrack(track);
      results[idx] = res;
      if (typeof onUpdate === 'function') {
        onUpdate({ status: 'completed', track, result: res, index: idx });
      }
    }
  }

  const workerCount = Math.min(concurrency, tracks.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}
