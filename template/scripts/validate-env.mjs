#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  error: msg => console.log(`${colors.red}[ERROR] ${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}[OK]    ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}[WARN]  ${msg}${colors.reset}`),
  info: msg => console.log(`${colors.blue}[INFO]  ${msg}${colors.reset}`),
  title: msg => console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

const rootDir = path.dirname(__dirname);

// Apps and libs to validate. Update these when you add new packages.
const apps = ['app.web'];
const libs = ['lib.example'];

const deprecatedVars = ['VITE_API_URL', 'VITE_WEBSOCKET_URL', 'VITE_SOCKET_URL'];

let errorCount = 0;
let warningCount = 0;

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function checkViteEnvFile(appPath) {
  const filePath = path.join(appPath, 'src', 'vite-env.d.ts');
  if (!fileExists(filePath)) {
    log.warning(`Missing vite-env.d.ts in ${path.basename(appPath)}/src/`);
    warningCount++;
    return;
  }
  log.success(`vite-env.d.ts found in ${path.basename(appPath)}`);
}

function checkSourceCode(packagePath) {
  const srcPath = path.join(packagePath, 'src');
  if (!fs.existsSync(srcPath)) { return; }

  function checkDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        checkDirectory(itemPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        const content = readFile(itemPath);
        if (!content) { continue; }
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('//') || line.startsWith('*')) { continue; }
          for (const varName of deprecatedVars) {
            if (line.includes(varName) && line.includes('import.meta.env')) {
              const relativePath = path.relative(rootDir, itemPath);
              log.warning(`${relativePath}:${i + 1} uses deprecated variable: ${varName}`);
              warningCount++;
            }
          }
        }
      }
    }
  }
  checkDirectory(srcPath);
}

function validateEnvironmentConfig() {
  log.title('Environment Configuration Validation');
  console.log('');

  log.title('Checking Applications');
  for (const app of apps) {
    const appPath = path.join(rootDir, app);
    if (!fs.existsSync(appPath)) {
      log.warning(`Application directory not found: ${app}`);
      continue;
    }
    log.info(`Checking ${app}...`);
    checkViteEnvFile(appPath);
    checkSourceCode(appPath);
    console.log('');
  }

  log.title('Checking Libraries');
  for (const lib of libs) {
    const libPath = path.join(rootDir, lib);
    if (!fs.existsSync(libPath)) {
      log.warning(`Library directory not found: ${lib}`);
      continue;
    }
    log.info(`Checking ${lib}...`);
    checkSourceCode(libPath);
    console.log('');
  }

  const envPath = path.join(rootDir, '.env');
  if (fileExists(envPath)) {
    const content = readFile(envPath);
    const requiredVars = ['JWT_SECRET', 'POSTGRES_PASSWORD', 'SESSION_SECRET'];
    for (const v of requiredVars) {
      if (!content.includes(`${v}=`) || content.includes(`${v}=CHANGE_THIS`)) {
        log.error(`.env: ${v} is missing or still uses placeholder value`);
        errorCount++;
      }
    }
  } else {
    log.warning('.env not found. Run `cp .env.example .env` to create one.');
  }

  log.title('Validation Summary');
  if (errorCount === 0 && warningCount === 0) {
    log.success('All environment configurations are correct.');
  } else {
    if (errorCount > 0) { log.error(`Found ${errorCount} error(s) that need to be fixed`); }
    if (warningCount > 0) { log.warning(`Found ${warningCount} warning(s)`); }
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

validateEnvironmentConfig();
