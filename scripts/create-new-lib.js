#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ROOT_DIR,
  copyTemplateDir,
  log,
  registerWorkspace,
  remindDevVolumesMount,
} from './lib/template-engine.mjs';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, 'templates', 'lib');

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    return null;
  }

  const useLibApi = args.includes('--with-api');
  const skipInstall = args.includes('--skip-install');
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const libType = typeArg ? typeArg.split('=')[1] : 'service';
  const positional = args.filter(arg => !arg.startsWith('--'));

  return {
    libName: positional[0].toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    libDescription: positional[1],
    libType,
    useLibApi,
    skipInstall,
  };
}

function showUsage() {
  log('❌ Please provide a library name', 'red');
  log(
    'Usage: pnpm new-lib <library-name> [description] [--type=service|utility] [--with-api]',
    'yellow'
  );
  log('Example: pnpm new-lib chat "Real-time chat functionality" --type=service', 'cyan');
  log('Example: pnpm new-lib dev-tools "Development utilities" --type=utility', 'cyan');
  log('Example: pnpm new-lib auth "Authentication service" --type=service --with-api', 'cyan');
}

function toPascalCase(libName) {
  return libName
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^./, c => c.toUpperCase());
}

function toCamelCase(libName) {
  return libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function buildVars(libName, libDescription) {
  const camelCaseName = toCamelCase(libName);
  const pascalCaseName = toPascalCase(libName);
  return {
    LIB_NAME: libName,
    LIB_DESCRIPTION: libDescription,
    // NB: match the original generator behaviour — first hyphen only.
    LIB_NAME_UNDERSCORE: libName.replace('-', '_'),
    SERVICE_NAME: `${pascalCaseName}Service`,
    PASCAL_CASE_NAME: pascalCaseName,
    CAMEL_CASE_NAME: camelCaseName,
  };
}

function patchPackageJsonForApi(libDir) {
  const pkgPath = path.join(libDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.dependencies = {
    ...pkg.dependencies,
    '@adopt-dont-shop/lib.api': 'workspace:*',
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

function pickServiceFiles(libDir, libName, useLibApi) {
  const servicesDir = path.join(libDir, 'src', 'services');
  const testsDir = path.join(servicesDir, '__tests__');

  const sourceVariant = useLibApi ? 'service-with-api.ts' : 'service.ts';
  const testVariant = useLibApi ? 'service-with-api.test.ts' : 'service.test.ts';
  const targetName = `${libName}-service.ts`;
  const targetTestName = `${libName}-service.test.ts`;

  // Rename the chosen variant; remove the unused variant.
  fs.renameSync(path.join(servicesDir, sourceVariant), path.join(servicesDir, targetName));
  fs.unlinkSync(path.join(servicesDir, useLibApi ? 'service.ts' : 'service-with-api.ts'));

  fs.renameSync(path.join(testsDir, testVariant), path.join(testsDir, targetTestName));
  fs.unlinkSync(path.join(testsDir, useLibApi ? 'service.test.ts' : 'service-with-api.test.ts'));
}

async function installDependencies(libDir) {
  try {
    log('📦 Installing dependencies...', 'yellow');
    await execAsync('pnpm install', { cwd: libDir });
    log('✅ Dependencies installed successfully', 'green');
  } catch (error) {
    log(`❌ Failed to install dependencies: ${error.message}`, 'red');
    log('💡 You can install them manually by running: pnpm install', 'yellow');
  }
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (!parsed) {
    showUsage();
    process.exit(1);
  }

  const { libName, libType, useLibApi, skipInstall } = parsed;
  const libDescription =
    parsed.libDescription || `Shared ${libName} functionality for the pet adoption platform`;

  if (!['service', 'utility'].includes(libType)) {
    log('❌ Invalid library type. Use --type=service or --type=utility', 'red');
    process.exit(1);
  }

  if (!libName.match(/^[a-z][a-z0-9-]*$/)) {
    log('❌ Invalid library name. Use lowercase letters, numbers, and hyphens only.', 'red');
    process.exit(1);
  }

  // Libraries live under packages/ as packages/lib.<name> (matching the
  // `packages/*` workspace glob and every existing lib.* package).
  const libRelPath = path.join('packages', `lib.${libName}`);
  const libDir = path.join(ROOT_DIR, libRelPath);
  if (fs.existsSync(libDir)) {
    log(`❌ Library lib.${libName} already exists!`, 'red');
    process.exit(1);
  }

  log(`🚀 Creating new library: lib.${libName}`, 'bright');
  log(`📝 Description: ${libDescription}`, 'cyan');
  log(`📦 Type: ${libType}`, 'magenta');
  if (useLibApi) {
    log(`🔗 With lib.api integration: enabled`, 'magenta');
  }
  log('', 'reset');

  const vars = buildVars(libName, libDescription);

  try {
    // Copy shared scaffolding (vitest config, eslint, dockerfile, README, etc.).
    copyTemplateDir(path.join(TEMPLATES_DIR, 'common'), libDir, vars);

    // Copy variant-specific files (service or utility).
    copyTemplateDir(path.join(TEMPLATES_DIR, libType), libDir, vars);

    if (libType === 'service') {
      // Select correct service implementation + test variant, then patch deps.
      pickServiceFiles(libDir, libName, useLibApi);
      if (useLibApi) {
        patchPackageJsonForApi(libDir);
      }
    }

    registerWorkspace(libRelPath);

    if (!skipInstall) {
      await installDependencies(libDir);
    }

    printSuccess(libName, libType);
    remindDevVolumesMount(libRelPath);
  } catch (error) {
    log(`❌ Error creating library: ${error.message}`, 'red');
    process.exit(1);
  }
}

function printSuccess(libName, libType) {
  log('', 'reset');
  log('🎉 Library created successfully!', 'green');
  log('', 'reset');
  log('📋 Next steps:', 'bright');
  log(`   1. cd packages/lib.${libName}`, 'cyan');
  log('   2. pnpm dev     # Start development build', 'cyan');
  log('   3. pnpm test        # Run tests', 'cyan');

  if (libType === 'service') {
    log(`   4. Edit src/services/${libName}-service.ts to implement your logic`, 'cyan');
  } else {
    log('   4. Add components to src/components/', 'cyan');
    log('   5. Add hooks to src/hooks/', 'cyan');
    log('   6. Add utilities to src/utils/', 'cyan');
  }

  log('', 'reset');
  log('📦 Use in apps:', 'bright');
  log('   Add to package.json dependencies:', 'cyan');
  log(`   "@adopt-dont-shop/lib-${libName}": "workspace:*"`, 'cyan');
  log('', 'reset');
  log('📖 Documentation:', 'bright');
  log(`   See lib.${libName}/README.md for detailed usage instructions`, 'cyan');
}

main().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
