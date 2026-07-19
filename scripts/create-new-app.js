#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT_DIR, copyTemplateDir, log, registerWorkspace } from './lib/template-engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, 'templates', 'app');

// Template metadata: features list drives the HomePage render, description
// shows in CLI help + HomePage banner. Dependency lists live inside each
// template's own package.json (no need to keep two sources of truth).
const TEMPLATES = {
  minimal: {
    name: 'Minimal',
    description: 'Basic React app with auth and routing',
    features: ['DevLogin', 'Basic Routing', 'Vanilla Extract'],
  },
  standard: {
    name: 'Standard',
    description: 'Full-featured app with data fetching and analytics',
    features: ['DevLogin', 'React Query', 'API Service', 'Analytics', 'Error Boundaries'],
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Complete enterprise app with all features',
    features: [
      'DevLogin',
      'React Query',
      'API Service',
      'Feature Flags',
      'Notifications',
      'Permissions',
      'A/B Testing',
    ],
  },
};

function parseArguments(argv) {
  const args = argv.slice(2);
  let appName = null;
  let template = 'standard';
  let overwrite = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' && i + 1 < args.length) {
      template = args[i + 1];
      i++;
    } else if (args[i] === '--overwrite') {
      overwrite = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      showHelp();
      process.exit(0);
    } else if (!appName) {
      appName = args[i];
    } else if (appName && !args[i].startsWith('--')) {
      template = args[i];
    }
  }

  return { appName, template, overwrite };
}

function showHelp() {
  log('🚀 @adopt-dont-shop App Generator', 'bright');
  log('', 'reset');
  log('Usage:', 'cyan');
  log('  pnpm new-app <app-name> [--template <template>]', 'yellow');
  log('', 'reset');
  log('Templates:', 'cyan');
  for (const key of Object.keys(TEMPLATES)) {
    log(`  ${key.padEnd(12)} - ${TEMPLATES[key].description}`, 'reset');
  }
  log('', 'reset');
  log('Examples:', 'cyan');
  log('  pnpm new-app app.dashboard', 'yellow');
  log('  pnpm new-app app.admin --template enterprise', 'yellow');
  log('  pnpm new-app app.simple --template minimal', 'yellow');
  log('', 'reset');
  log('Features by template:', 'cyan');
  for (const key of Object.keys(TEMPLATES)) {
    const tmpl = TEMPLATES[key];
    log(`  ${tmpl.name}:`, 'bright');
    for (const feature of tmpl.features) {
      log(`    ✓ ${feature}`, 'green');
    }
    log('', 'reset');
  }
}

async function main() {
  const { appName, template, overwrite } = parseArguments(process.argv);

  if (!appName) {
    log('❌ Error: Please provide an app name', 'red');
    showHelp();
    process.exit(1);
  }

  if (!appName.match(/^app\.[a-z]+(-[a-z]+)*$/)) {
    log(
      '❌ Error: App name must be in format "app.name" (e.g., app.dashboard, app.user-portal)',
      'red'
    );
    process.exit(1);
  }

  if (!TEMPLATES[template]) {
    log(`❌ Error: Unknown template "${template}"`, 'red');
    log('Available templates:', 'yellow');
    for (const key of Object.keys(TEMPLATES)) {
      log(`  - ${key}`, 'reset');
    }
    process.exit(1);
  }

  const templateConfig = TEMPLATES[template];
  const appDir = path.join(ROOT_DIR, appName);

  if (fs.existsSync(appDir) && !overwrite) {
    log(`❌ Error: App "${appName}" already exists. Use --overwrite to replace it.`, 'red');
    process.exit(1);
  }
  if (fs.existsSync(appDir) && overwrite) {
    fs.rmSync(appDir, { recursive: true, force: true });
    log(`🗑️ Removed existing app: ${appName}`, 'yellow');
  }

  log(`🚀 Creating new React app: ${appName}`, 'bright');
  log(`📋 Template: ${templateConfig.name} - ${templateConfig.description}`, 'cyan');
  log('', 'reset');

  const vars = {
    APP_NAME: appName,
    TEMPLATE_NAME: templateConfig.name,
    TEMPLATE_DESCRIPTION: templateConfig.description,
    // Features are inlined as a JS-array literal inside HomePage.tsx; keep
    // JSON.stringify so the output matches the previous generator byte-for-byte.
    TEMPLATE_FEATURES_JSON: JSON.stringify(templateConfig.features),
  };

  log('📝 Generating configuration files...', 'blue');
  copyTemplateDir(path.join(TEMPLATES_DIR, 'common'), appDir, vars);
  log('📝 Generating source files...', 'blue');
  copyTemplateDir(path.join(TEMPLATES_DIR, template), appDir, vars);

  // Empty scaffolding directories created by the legacy generator — keep so
  // downstream tooling that expects them still works.
  const emptyDirs = [
    path.join(appDir, 'public'),
    path.join(appDir, 'src', 'hooks'),
    path.join(appDir, 'src', 'services'),
    path.join(appDir, 'src', 'utils'),
    path.join(appDir, 'src', 'types'),
    path.join(appDir, 'src', 'test-utils'),
    path.join(appDir, 'src', '__tests__'),
  ];
  for (const dir of emptyDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  try {
    registerWorkspace(appName);
  } catch (error) {
    log(`⚠️  Warning: Could not update workspace package.json: ${error.message}`, 'yellow');
  }

  printSuccess(appName, templateConfig);
}

function printSuccess(appName, templateConfig) {
  log('', 'reset');
  log('🎉 Success!', 'green');
  log(`✨ Created React app: ${appName}`, 'bright');
  log(`📋 Template: ${templateConfig.name}`, 'cyan');
  log('', 'reset');
  log('🚀 Features included:', 'cyan');
  for (const feature of templateConfig.features) {
    log(`   ✓ ${feature}`, 'green');
  }
  log('', 'reset');
  log('📋 Next steps:', 'cyan');
  log(`   cd ${appName}`, 'reset');
  log(`   pnpm install`, 'reset');
  log(`   pnpm dev`, 'reset');
  log('', 'reset');
}

main().catch(error => {
  log('❌ Error creating app:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
