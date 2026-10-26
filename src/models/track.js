export class Track {
  constructor({ id, title, channel, duration, url, thumbnail }) {
    this.id = id;
    this.title = title || 'Unknown Title';
    this.channel = channel || 'Unknown Channel';
    this.duration = duration ?? 0;
    this.url = url;
    this.thumbnail = thumbnail || null;
  }

  getFormattedDuration() {
    if (!this.duration || this.duration === 'N/A') return 'Unknown';
    if (typeof this.duration === 'string') {
      if (this.duration.includes(':')) return this.duration;
      const parsed = Number(this.duration);
      if (Number.isNaN(parsed)) return 'Unknown';
      this.duration = parsed;
    }
    const totalSeconds = Math.floor(this.duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
