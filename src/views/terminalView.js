import chalk from 'chalk';
import ora from 'ora';
import { getDownloadDir } from '../config/paths.js';
import {
  customCheckbox,
  customInput,
  customSelect,
  customConfirm,
  BACK_ACTION,
} from './customPrompts.js';

export { BACK_ACTION };

function getColumnWidths() {
  const total = Math.min(process.stdout.columns || 90, 110);
  const durWidth = 8;
  const channelWidth = Math.max(14, Math.min(22, Math.floor(total * 0.22)));
  const titleWidth = Math.max(20, total - channelWidth - durWidth - 12);
  return { titleWidth, channelWidth, durWidth, total };
}

export async function promptSearchQuery(canGoBack = false) {
  const escHint = canGoBack ? chalk.dim('(Esc to go back)') : chalk.dim('(Esc to exit)');
  return await customInput({
    message: chalk.hex('#38bdf8').bold('🔍 Search YouTube') + ` ${escHint}:`,
    validate: (value) => value.trim().length > 0 || 'Query cannot be empty',
  });
}

export async function promptTrackSelection(tracks) {
  const { titleWidth, channelWidth, durWidth, total } = getColumnWidths();
  const header =
    '  ' +
    chalk.bold.hex('#64748b')(
      `${'#'.padEnd(4)}${'TITLE'.padEnd(titleWidth)}  ${'CHANNEL'.padEnd(channelWidth)}  ${'DURATION'.padStart(durWidth)}`
    ) +
    '\n  ' +
    chalk.hex('#334155')('─'.repeat(total - 4));

  const choices = tracks.map((track, idx) => {
    const num = `${idx + 1}.`.padEnd(4);
    const rawTitle = (track.title || 'Unknown Title').replace(/\s+/g, ' ').trim();
    const rawChannel = (track.channel || 'Unknown Artist').replace(/\s+/g, ' ').trim();
    const durationStr = track.getFormattedDuration();

    const title =
      rawTitle.length > titleWidth
        ? rawTitle.slice(0, titleWidth - 1) + '…'
        : rawTitle.padEnd(titleWidth);

    const channel =
      rawChannel.length > channelWidth
        ? rawChannel.slice(0, channelWidth - 1) + '…'
        : rawChannel.padEnd(channelWidth);

    const duration = durationStr.padStart(durWidth);

    return {
      name: `${chalk.dim(num)}${chalk.white(title)}  ${chalk.hex('#a78bfa')(channel)}  ${chalk.hex('#facc15')(duration)}`,
      value: track,
      checked: false,
    };
  });

  return await customCheckbox({
    message: chalk.hex('#38bdf8').bold('🎵 Select Tracks') + chalk.dim(' (mark with Space or d):'),
    tableHeader: header,
    pageSize: 10,
    choices,
  });
}

export async function promptQueueAction(queue) {
  const countBadge =
    queue.length > 0
      ? chalk.hex('#facc15')(`[${queue.length} track${queue.length === 1 ? '' : 's'}]`)
      : chalk.dim('[empty]');
  const choices = [
    {
      name: `${chalk.hex('#38bdf8')('🔍 Search & add more songs')} ${chalk.dim('• query YouTube')}`,
      value: 'search',
    },
    {
      name: `${chalk.green('⬇️  Download queue')} ${countBadge} ${chalk.dim('• convert to 320kbps MP3')}`,
      value: 'download',
      disabled: queue.length === 0 ? chalk.dim('(queue is empty)') : false,
    },
  ];

  if (queue.length > 0) {
    choices.push({
      name: `${chalk.hex('#f43f5e')('🗑️  Clear queue')} ${chalk.dim('• remove all queued tracks')}`,
      value: 'clear',
    });
  }

  choices.push({
    name: `${chalk.hex('#94a3b8')('❌ Exit')} ${chalk.dim('• exit application')}`,
    value: 'exit',
  });

  return await customSelect({
    message: chalk.hex('#38bdf8').bold('⚡ Action Menu') + chalk.dim(' (Esc to exit):'),
    choices,
  });
}

export function displayQueueSummary(queue) {
  if (!queue || queue.length === 0) return;
  const { titleWidth, channelWidth, durWidth, total } = getColumnWidths();

  console.log(
    chalk.bold.hex('#38bdf8')('\n📋 Current Download Queue ') +
      chalk.hex('#facc15')(`(${queue.length} track${queue.length === 1 ? '' : 's'}):`)
  );
  console.log(
    '  ' +
      chalk.bold.hex('#64748b')(
        `${'#'.padEnd(4)}${'TITLE'.padEnd(titleWidth)}  ${'CHANNEL'.padEnd(channelWidth)}  ${'DURATION'.padStart(durWidth)}`
      )
  );
  console.log('  ' + chalk.hex('#334155')('─'.repeat(total - 4)));

  queue.forEach((track, idx) => {
    const num = `${idx + 1}.`.padEnd(4);
    const rawTitle = (track.title || 'Unknown Title').replace(/\s+/g, ' ').trim();
    const rawChannel = (track.channel || 'Unknown Artist').replace(/\s+/g, ' ').trim();
    const durationStr = track.getFormattedDuration();

    const title =
      rawTitle.length > titleWidth
        ? rawTitle.slice(0, titleWidth - 1) + '…'
        : rawTitle.padEnd(titleWidth);

    const channel =
      rawChannel.length > channelWidth
        ? rawChannel.slice(0, channelWidth - 1) + '…'
        : rawChannel.padEnd(channelWidth);

    console.log(
      `  ${chalk.dim(num)}${chalk.white(title)}  ${chalk.hex('#a78bfa')(channel)}  ${chalk.hex('#facc15')(durationStr.padStart(durWidth))}`
    );
  });
  console.log();
}

export async function promptContinue() {
  return await customConfirm({
    message: chalk.hex('#38bdf8')('Start another search session?'),
    default: true,
  });
}

export function createSpinner(text) {
  return ora({
    text: chalk.hex('#38bdf8')(text),
    spinner: 'dots',
  });
}

export function displayBanner() {
  const savePath = getDownloadDir();
  const width = Math.min(process.stdout.columns || 80, 80);
  const border = '─'.repeat(width - 4);
  console.log(chalk.cyan(`\n╭${border}╮`));
  console.log(
    chalk.cyan('│ ') +
      chalk.bold.hex('#38bdf8')('🎵 MSCFETCH') +
      chalk.dim('  ::  Modern Terminal Music Downloader') +
      ' '.repeat(Math.max(1, width - 53)) +
      chalk.cyan('│')
  );
  console.log(
    chalk.cyan('│ ') +
      chalk.hex('#94a3b8')('📁 Download folder: ') +
      chalk.hex('#a78bfa')(savePath.length > width - 24 ? '…' + savePath.slice(-(width - 25)) : savePath) +
      ' '.repeat(Math.max(1, width - 24 - Math.min(savePath.length, width - 24))) +
      chalk.cyan('│')
  );
  console.log(chalk.cyan(`╰${border}╯\n`));
}
