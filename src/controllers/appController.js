import { checkFFmpeg } from '../utils/envCheck.js';
import { getDownloadDir } from '../config/paths.js';
import { searchTracks } from '../services/searchService.js';
import { downloadBatch } from '../services/downloadService.js';
import {
  displayBanner,
  promptSearchQuery,
  promptTrackSelection,
  promptQueueAction,
  displayQueueSummary,
  promptContinue,
  createSpinner,
} from '../views/terminalView.js';
import chalk from 'chalk';

export async function runController() {
  await checkFFmpeg();
  getDownloadDir();

  displayBanner();

  let queue = [];
  let isRunning = true;

  while (isRunning) {
    try {
      const query = await promptSearchQuery();
      const spinner = createSpinner('Searching YouTube...').start();
      let tracks;
      try {
        tracks = await searchTracks(query);
      } finally {
        spinner.stop();
      }

      if (!tracks || tracks.length === 0) {
        console.log(chalk.yellow('No tracks found for your query.'));
      } else {
        const selected = await promptTrackSelection(tracks);
        if (selected.length > 0) {
          const newTracks = selected.filter(
            (item) => !queue.some((q) => q.id === item.id || q.url === item.url)
          );
          const duplicates = selected.length - newTracks.length;
          queue.push(...newTracks);

          const dupMsg = duplicates > 0 ? chalk.gray(` (${duplicates} duplicate(s) omitted)`) : '';
          console.log(
            chalk.green(`\n✔ Added ${newTracks.length} track(s) to queue.${dupMsg} Total in queue: ${queue.length}`)
          );
        } else {
          console.log(chalk.yellow('\nNo tracks selected from this search.'));
        }
      }

      // Queue decision loop: allow searching again, downloading, clearing, or exiting
      let deciding = true;
      while (deciding) {
        displayQueueSummary(queue);
        const action = await promptQueueAction(queue);

        if (action === 'search') {
          deciding = false; // loops back to promptSearchQuery
        } else if (action === 'download') {
          if (queue.length === 0) {
            console.log(chalk.yellow('Queue is empty. Search and select tracks first.'));
            continue;
          }

          console.log(chalk.cyan(`\nStarting batch download of ${queue.length} track(s)...`));
          const downloadSpinner = createSpinner('Initializing downloads...').start();

          let completedCount = 0;
          const total = queue.length;
          await downloadBatch(queue, (update) => {
            if (update.status === 'started') {
              downloadSpinner.text = `Downloading (${update.index + 1}/${total}): ${update.track.title}`;
            } else if (update.status === 'completed') {
              completedCount++;
              if (update.result.success) {
                downloadSpinner.succeed(chalk.green(`Downloaded: ${update.track.title}`));
              } else {
                downloadSpinner.fail(chalk.red(`Failed: ${update.track.title} - ${update.result.error}`));
              }
              if (completedCount < total) {
                downloadSpinner.start('Processing downloads...');
              }
            }
          });

          downloadSpinner.stop();
          console.log(chalk.green(`\n✔ All downloads saved to: ${getDownloadDir()}`));
          queue = []; // Reset queue after download
          deciding = false;

          isRunning = await promptContinue();
        } else if (action === 'clear') {
          queue = [];
          console.log(chalk.yellow('\nQueue cleared.'));
        } else if (action === 'exit') {
          deciding = false;
          isRunning = false;
        }
      }
    } catch (error) {
      if (error?.name === 'ExitPromptError') {
        console.log(chalk.gray('\nOperation canceled.'));
        break;
      }
      console.error(chalk.red(`Error: ${error.message}`));
      try {
        isRunning = await promptContinue();
      } catch (promptError) {
        if (promptError?.name === 'ExitPromptError') break;
        throw promptError;
      }
    }
  }

  console.log(chalk.magenta('\nThank you for using Music Fetcher CLI!\n'));
}
