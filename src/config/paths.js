import os from 'os';
import path from 'path';
import fs from 'fs';

export function getDownloadDir() {
  const downloadDir = path.join(os.homedir(), 'Downloads', 'MusicDownloads');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  return downloadDir;
}
