import ytDlp from 'yt-dlp-exec';
import { Track } from '../models/track.js';

export async function searchTracks(query, maxResults = 8) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Valid search query required');
  }

  try {
    const rawOutput = await ytDlp.exec(`ytsearch${maxResults}:${query.trim()}`, {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true,
      jsRuntimes: 'node',
    });

    const parsed = JSON.parse(rawOutput.stdout);

    if (!parsed?.entries || !Array.isArray(parsed.entries)) {
      return [];
    }

    return parsed.entries
      .filter((item) => item && (item.id || item.url))
      .map((item) => new Track({
        id: item.id,
        title: item.title,
        channel: item.uploader || item.channel || 'Unknown Artist',
        duration: item.duration ?? 0,
        url: item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : null),
        thumbnail: item.thumbnails?.[0]?.url || item.thumbnail || null
      }));
  } catch (error) {
    throw new Error(`Search operation failed: ${error.message}`);
  }
}
