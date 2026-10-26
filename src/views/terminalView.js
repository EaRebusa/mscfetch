import { input, checkbox, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';

export async function promptSearchQuery() {
  return await input({
    message: chalk.cyan('Enter search query (artist or song):'),
    validate: (value) => value.trim().length > 0 || 'Query cannot be empty',
  });
}

export async function promptTrackSelection(tracks) {
  const choices = tracks.map((track) => ({
    name: `${track.title} ${chalk.gray(`(${track.channel} - ${track.getFormattedDuration()})`)}`,
    value: track,
    checked: false, // Default to unchecked per user preference
  }));

  return await checkbox({
    message: chalk.cyan('Select tracks to add to queue (Space to toggle, Enter to confirm):'),
    choices,
  });
}

export async function promptQueueAction(queue) {
  const choices = [
    {
      name: '➕ Add more songs to queue (search again)',
      value: 'search',
    },
    {
      name: `⬇️ Download queue (${queue.length} track${queue.length === 1 ? '' : 's'})`,
      value: 'download',
      disabled: queue.length === 0 ? '(Queue is empty)' : false,
    },
  ];

  if (queue.length > 0) {
    choices.push({
      name: '🗑️ Clear queue',
      value: 'clear',
    });
  }

  choices.push({
    name: '❌ Exit',
    value: 'exit',
  });

  return await select({
    message: chalk.cyan('Queue Menu - choose action:'),
    choices,
  });
}

export function displayQueueSummary(queue) {
  if (!queue || queue.length === 0) return;
  console.log(chalk.bold.blue(`\n📋 Current Download Queue (${queue.length}):`));
  queue.forEach((track, idx) => {
    console.log(
      chalk.gray(`  ${idx + 1}. `) +
        chalk.white(track.title) +
        chalk.gray(` [${track.channel} - ${track.getFormattedDuration()}]`)
    );
  });
  console.log();
}

export async function promptContinue() {
  return await confirm({
    message: chalk.cyan('Would you like to start another search session?'),
    default: true,
  });
}

export function createSpinner(text) {
  return ora(text);
}

export function displayBanner() {
  console.log(chalk.bold.magenta('\n🎵 Music Fetcher CLI 🎵\n'));
}
