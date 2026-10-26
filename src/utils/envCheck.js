import { execSync } from 'child_process';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';

export function isFFmpegInstalled() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function getInstallCommand() {
  const platform = process.platform;
  if (platform === 'win32') {
    return 'winget install Gyan.FFmpeg --accept-package-agreements --accept-source-agreements';
  } else if (platform === 'darwin') {
    return 'brew install ffmpeg';
  } else {
    return 'sudo apt-get update && sudo apt-get install -y ffmpeg';
  }
}

export async function checkFFmpeg() {
  if (isFFmpegInstalled()) {
    return true;
  }

  console.log(
    chalk.yellow('\n⚠️  FFmpeg is required for MP3 audio conversion, but was not found in your system PATH.')
  );
  const installCmd = getInstallCommand();
  console.log(chalk.gray(`Detected install command for your system: ${installCmd}\n`));

  let shouldInstall = false;
  try {
    shouldInstall = await confirm({
      message: chalk.cyan('Would you like mscfetch to run this install command for you?'),
      default: false, // Safe default: user has full choice to decline
    });
  } catch (err) {
    if (err?.name === 'ExitPromptError') {
      console.log(chalk.gray('\nInstallation aborted.'));
      process.exit(1);
    }
  }

  if (!shouldInstall) {
    console.log(chalk.gray('\nInstallation declined. You can install FFmpeg manually at any time by running:'));
    console.log(chalk.bold.white(`  ${installCmd}`));
    console.log(chalk.gray('Or download directly from https://ffmpeg.org/download.html\n'));
    process.exit(1);
  }

  const spinner = ora('Installing FFmpeg...').start();
  try {
    execSync(installCmd, { stdio: 'inherit' });
    spinner.succeed(chalk.green('FFmpeg installation completed!'));
    return true;
  } catch (error) {
    spinner.fail(chalk.red(`Automatic installation failed: ${error.message}`));
    console.log(chalk.yellow('\nPlease run the command manually in your terminal/admin prompt:'));
    console.log(chalk.bold.white(`  ${installCmd}\n`));
    process.exit(1);
  }
}
