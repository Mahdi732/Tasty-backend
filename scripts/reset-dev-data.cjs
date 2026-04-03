const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const runCommand = (command, args, { allowFailure = false } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0 || allowFailure) {
        resolve(code || 0);
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
  });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runSeedWithRetry = async () => {
  const maxAttempts = 12;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await runCommand(npmCmd, ['run', 'seed:dev']);
      return;
    } catch (error) {
      const isLast = attempt === maxAttempts;
      console.warn(`[reset-dev-data] Seed attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      if (isLast) {
        throw error;
      }

      await delay(5000);
    }
  }
};

const main = async () => {
  console.log('[reset-dev-data] Stopping stack and deleting all Docker volumes (this erases users, orders, restaurants, payments, everything).');
  await runCommand('docker', ['compose', 'down', '-v', '--remove-orphans'], { allowFailure: true });

  console.log('[reset-dev-data] Rebuilding and starting containers.');
  await runCommand('docker', ['compose', 'up', '-d', '--build']);

  console.log('[reset-dev-data] Reseeding users and restaurants.');
  await runSeedWithRetry();

  console.log('[reset-dev-data] Done. Fresh data is ready.');
};

main().catch((error) => {
  console.error(`[reset-dev-data] Failed: ${error.message}`);
  process.exitCode = 1;
});
