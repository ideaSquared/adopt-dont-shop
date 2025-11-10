#!/usr/bin/env node

/**
 * Environment Configuration Validation Script
 *
 * This script validates the environment configuration across all apps and libraries
 * to ensure they follow the industry standard URL environment variable setup.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: msg => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: msg => console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

// Configuration - go up one level from scripts directory to project root
const rootDir = path.dirname(__dirname);
const apps = ['app.client', 'app.rescue', 'app.admin'];
const libs = ['lib.api', 'lib.utils'];

// Standard environment variables
const standardVars = ['VITE_API_BASE_URL', 'VITE_WS_BASE_URL'];
const deprecatedVars = ['VITE_API_URL', 'VITE_WEBSOCKET_URL', 'VITE_SOCKET_URL'];

let errorCount = 0;
let warningCount = 0;

/**
 * Check if file exists
 */
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Read file content safely
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Check environment file
 */
function checkEnvFile(appPath, fileName) {
  const filePath = path.join(appPath, fileName);

  if (!fileExists(filePath)) {
    log.error(`Missing ${fileName} in ${path.basename(appPath)}`);
    errorCount++;
    return;
  }

  const content = readFile(filePath);
  if (!content) {
    log.error(`Cannot read ${fileName} in ${path.basename(appPath)}`);
    errorCount++;
    return;
  }

  // Check for standard variables
  let hasStandardVars = false;
  for (const varName of standardVars) {
    if (content.includes(varName)) {
      hasStandardVars = true;
      break;
    }
  }

  if (!hasStandardVars) {
    log.error(
      `${fileName} in ${path.basename(appPath)} missing standard variables: ${standardVars.join(', ')}`
    );
    errorCount++;
  } else {
    log.success(`${fileName} in ${path.basename(appPath)} has standard variables`);
  }

  // Check for deprecated variables
  for (const varName of deprecatedVars) {
    if (content.includes(varName) && !content.includes('Legacy support')) {
      log.warning(
        `${fileName} in ${path.basename(appPath)} still uses deprecated variable: ${varName}`
      );
      warningCount++;
    }
  }
}

/**
 * Check TypeScript environment definitions
 */
function checkViteEnvFile(appPath) {
  const filePath = path.join(appPath, 'src', 'vite-env.d.ts');

  if (!fileExists(filePath)) {
    log.error(`Missing vite-env.d.ts in ${path.basename(appPath)}/src/`);
    errorCount++;
    return;
  }

  const content = readFile(filePath);
  if (!content) {
    log.error(`Cannot read vite-env.d.ts in ${path.basename(appPath)}`);
    errorCount++;
    return;
  }

  // Check for standard type definitions
  let hasStandardTypes = false;
  for (const varName of standardVars) {
    if (content.includes(`readonly ${varName}`)) {
      hasStandardTypes = true;
      break;
    }
  }

  if (!hasStandardTypes) {
    log.error(`vite-env.d.ts in ${path.basename(appPath)} missing standard type definitions`);
    errorCount++;
  } else {
    log.success(`vite-env.d.ts in ${path.basename(appPath)} has standard type definitions`);
  }
}

/**
 * Check source code for deprecated variables
 */
function checkSourceCode(appPath) {
  const srcPath = path.join(appPath, 'src');
  if (!fs.existsSync(srcPath)) return;

  function checkDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        checkDirectory(itemPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        const content = readFile(itemPath);
        if (!content) continue;

        // Check for deprecated variables in actual usage (not in comments)
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Skip comments and legacy support lines
          if (line.startsWith('//') || line.startsWith('*') || line.includes('Legacy support')) {
            continue;
          }

          for (const varName of deprecatedVars) {
            if (line.includes(`${varName}`) && line.includes('import.meta.env')) {
              const relativePath = path.relative(rootDir, itemPath);
              log.warning(`${relativePath}:${i + 1} still uses deprecated variable: ${varName}`);
              warningCount++;
            }
          }
        }
      }
    }
  }

  checkDirectory(srcPath);
}

/**
 * Main validation function
 */
function validateEnvironmentConfig() {
  log.title('🔍 Environment Configuration Validation');
  console.log('');

  // Check applications
  log.title('📱 Checking Applications');
  for (const app of apps) {
    const appPath = path.join(rootDir, app);

    if (!fs.existsSync(appPath)) {
      log.error(`Application directory not found: ${app}`);
      errorCount++;
      continue;
    }

    log.info(`Checking ${app}...`);
    checkEnvFile(appPath, '.env.example');
    checkViteEnvFile(appPath);
    checkSourceCode(appPath);
    console.log('');
  }

  // Check libraries
  log.title('📚 Checking Libraries');
  for (const lib of libs) {
    const libPath = path.join(rootDir, lib);

    if (!fs.existsSync(libPath)) {
      log.warning(`Library directory not found: ${lib}`);
      continue;
    }

    log.info(`Checking ${lib}...`);
    if (lib === 'lib.api' || lib === 'lib.utils') {
      checkViteEnvFile(libPath);
      checkSourceCode(libPath);
    }
    console.log('');
  }

  // Summary
  log.title('📊 Validation Summary');
  if (errorCount === 0 && warningCount === 0) {
    log.success('All environment configurations are correct! 🎉');
  } else {
    if (errorCount > 0) {
      log.error(`Found ${errorCount} error(s) that need to be fixed`);
    }
    if (warningCount > 0) {
      log.warning(`Found ${warningCount} warning(s) about deprecated usage`);
    }

    console.log('');
    log.info('For help with environment configuration, see: docs/environment-variables.md');
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run validation
validateEnvironmentConfig();
