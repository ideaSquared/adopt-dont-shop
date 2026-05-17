#!/usr/bin/env node
import { execSync } from 'child_process';
import { copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function logHeader(message) {
  log('', GREEN);
  log('='.repeat(60), GREEN);
  log(message, `${GREEN}${BOLD}`);
  log('='.repeat(60), GREEN);
  log('', GREEN);
}

function logStep(step, message) {
  log(`${BOLD}[${step}]${RESET} ${message}`, BLUE);
}

function logSuccess(message) {
  log(`${GREEN}OK${RESET} ${message}`, GREEN);
}

function logInfo(message) {
  log(`${BLUE}-${RESET} ${message}`, BLUE);
}

function logError(message) {
  log(`${YELLOW}X${RESET} ${message}`, YELLOW);
}

async function runCommand(command, options = {}) {
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: ROOT,
      ...options,
    });
  } catch (error) {
    throw new Error(`Failed to run: ${command}`);
  }
}

async function setup() {
  logHeader('TypeScript Monorepo - Developer Setup');

  try {
    logStep('1', 'Checking Node.js version...');
    let nodeVersion;
    try {
      nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    } catch {
      logError('Node.js is not installed');
      log('Please install Node.js v20 or higher from https://nodejs.org/', YELLOW);
      process.exit(1);
    }

    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    if (majorVersion < 20) {
      logError(`Node.js v${majorVersion} detected, but v20+ is required`);
      log(`Current version: ${nodeVersion}`, YELLOW);
      log('Please upgrade Node.js from https://nodejs.org/', YELLOW);
      process.exit(1);
    }

    logSuccess(`Node.js ${nodeVersion} detected`);
    log('', RESET);

    logStep('2', 'Installing dependencies...');
    logInfo('This may take a few minutes on first run');
    await runCommand('npm install');
    logSuccess('Dependencies installed');
    log('', RESET);

    logStep('3', 'Building shared libraries...');
    logInfo('Apps depend on built library artifacts');
    await runCommand('npm run build:libs');
    logSuccess('Libraries built successfully');
    log('', RESET);

    logStep('4', 'Setting up environment configuration...');
    const envPath = join(ROOT, '.env');
    const envExamplePath = join(ROOT, '.env.example');

    if (existsSync(envPath)) {
      logInfo('.env file already exists, skipping');
    } else if (existsSync(envExamplePath)) {
      try {
        copyFileSync(envExamplePath, envPath);
        logSuccess('.env file created from .env.example');
        logInfo('Please edit .env to configure your environment');
      } catch (error) {
        logError('Failed to copy .env.example to .env');
        throw error;
      }
    } else {
      logError('.env.example not found');
      throw new Error('.env.example is missing from the repository');
    }
    log('', RESET);

    logHeader('Setup Complete!');
    log('', GREEN);
    log('Next steps:', `${BOLD}${GREEN}`);
    log('', RESET);
    log('1. Edit your .env file with required configuration:', BLUE);
    log('   - Set POSTGRES_PASSWORD (recommended: generate a secure password)', RESET);
    log('   - Set any third-party API keys you need', RESET);
    log('', RESET);
    log('2. Generate fresh secrets (append to .env):', BLUE);
    log('   npm run secrets:generate >> .env', RESET);
    log('', RESET);
    log('3. Start the development server:', BLUE);
    log('   npm run docker:dev          # recommended (includes database)', RESET);
    log('   npm run dev                 # native (requires local Postgres + Redis)', RESET);
    log('', RESET);
    log('For more information, see:', BLUE);
    log('   README.md', RESET);
    log('', GREEN);
    logSuccess('Happy coding!');
    log('', RESET);
  } catch (error) {
    log('', RESET);
    logHeader('Setup Failed');
    logError(error.message);
    log('', RESET);
    log('Please check the error above and try again.', YELLOW);
    log('For help, see README.md', YELLOW);
    log('', RESET);
    process.exit(1);
  }
}

await setup();
