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
  BACK_ACTION,
} from '../views/terminalView.js';
import chalk from 'chalk';

export async function runController() {
  await checkFFmpeg();
  getDownloadDir();

  displayBanner();

  let queue = [];
  let isRunning = true;
  let currentScreen = 'search';
  let canGoBackFromSearch = false;

  while (isRunning) {
    try {
      if (currentScreen === 'search') {
        const query = await promptSearchQuery(canGoBackFromSearch);
        if (query === BACK_ACTION) {
          if (canGoBackFromSearch) {
            currentScreen = 'queue_menu';
            continue;
          } else {
            isRunning = false;
            break;
          }
        }

        const spinner = createSpinner('Searching YouTube...').start();
        let tracks;
        try {
          tracks = await searchTracks(query);
        } finally {
          spinner.stop();
        }

        if (!tracks || tracks.length === 0) {
          console.log(chalk.yellow('No tracks found for your query.'));
          continue;
        }

        const selected = await promptTrackSelection(tracks);
        if (selected === BACK_ACTION) {
          console.log(chalk.gray('\nTrack selection canceled.'));
          continue;
        }

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

        currentScreen = 'queue_menu';
      } else if (currentScreen === 'queue_menu') {
        displayQueueSummary(queue);
        const action = await promptQueueAction(queue);

        if (action === BACK_ACTION || action === 'exit') {
          isRunning = false;
          break;
        }

        if (action === 'search') {
          currentScreen = 'search';
          canGoBackFromSearch = true;
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
          queue = [];

          const continueSession = await promptContinue();
          if (continueSession) {
            currentScreen = 'search';
            canGoBackFromSearch = false;
          } else {
            isRunning = false;
          }
        } else if (action === 'clear') {
          queue = [];
          console.log(chalk.yellow('\nQueue cleared.'));
        }
      }
    } catch (error) {
      if (error?.name === 'ExitPromptError') {
        console.log(chalk.gray('\nOperation canceled.'));
        break;
      }
      console.error(chalk.red(`Error: ${error.message}`));
      try {
        const continueSession = await promptContinue();
        if (continueSession) {
          currentScreen = 'search';
          canGoBackFromSearch = queue.length > 0;
        } else {
          break;
        }
      } catch (promptError) {
        if (promptError?.name === 'ExitPromptError') break;
        throw promptError;
      }
    }
  }

  console.log(chalk.magenta('\nThank you for using Music Fetcher CLI!\n'));
}
