#!/usr/bin/env node

/**
 * Generator: create-new-lib
 * Usage: npm run new-lib <name>
 *
 * Creates a new shared library at lib.<name>/ with:
 *   - package.json (scoped @my-org/lib.<name>)
 *   - tsconfig.json (ESM build to dist/)
 *   - jest.config.cjs (extends jest.config.base.cjs)
 *   - .eslintrc.cjs (extends eslint-config-base)
 *   - src/index.ts, src/<name>-service.ts, src/<name>-service.test.ts
 *
 * Also updates:
 *   - Root package.json workspaces
 *   - vite.shared.config.ts library aliases (so Vite apps can import it in dev)
 *   - Dockerfile.app.optimized (so frontend Docker builds include this lib)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.dirname(__dirname);

const SCOPE = '@my-org';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function logStep(msg) {
  log(`-> ${msg}`, colors.blue);
}

function logSuccess(msg) {
  log(`OK ${msg}`, colors.green);
}

function logError(msg) {
  log(`ERROR ${msg}`, colors.red);
}

function toCamelCase(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toPascalCase(s) {
  const camel = toCamelCase(s);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function fileWrite(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const name = args.find(a => !a.startsWith('-'));
  if (!name) {
    logError('Library name is required.');
    log('Usage: npm run new-lib <name>');
    log('Example: npm run new-lib widgets');
    process.exit(1);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    logError(`Invalid name "${name}". Use lowercase letters, digits, and hyphens.`);
    process.exit(1);
  }
  return { name };
}

function generateFiles(libDir, name) {
  const className = `${toPascalCase(name)}Service`;
  const pkgName = `lib.${name}`;
  const scopedName = `${SCOPE}/${pkgName}`;

  fileWrite(
    path.join(libDir, 'package.json'),
    JSON.stringify(
      {
        name: scopedName,
        version: '1.0.0',
        description: `${pkgName} shared library`,
        type: 'module',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        exports: {
          '.': {
            types: './dist/index.d.ts',
            import: './dist/index.js',
          },
        },
        files: ['dist', 'README.md'],
        scripts: {
          build: 'tsc',
          dev: 'tsc --watch',
          clean: 'rm -rf dist',
          test: 'jest',
          'test:watch': 'jest --watch',
          'test:coverage': 'jest --coverage',
          lint: 'eslint src --ext ts',
          'lint:fix': 'eslint src --ext ts --fix',
          'type-check': 'tsc --noEmit',
        },
        license: 'MIT',
        dependencies: {
          '@types/node': '^20.0.0',
        },
        devDependencies: {
          [`${SCOPE}/eslint-config-base`]: '*',
          '@types/jest': '^30.0.0',
          jest: '^30.2.0',
          'ts-jest': '^29.4.6',
          typescript: '^5.4.5',
        },
        peerDependencies: {
          typescript: '^5.0.0',
        },
      },
      null,
      2
    ) + '\n'
  );

  fileWrite(
    path.join(libDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'bundler',
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          outDir: './dist',
          rootDir: './src',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          esModuleInterop: true,
          resolveJsonModule: true,
          isolatedModules: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
      },
      null,
      2
    ) + '\n'
  );

  fileWrite(
    path.join(libDir, 'jest.config.cjs'),
    `const base = require('../jest.config.base.cjs');

module.exports = {
  ...base,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
};
`
  );

  fileWrite(
    path.join(libDir, '.eslintrc.cjs'),
    `module.exports = {
  extends: ['${SCOPE}/eslint-config-base'],
};
`
  );

  fileWrite(
    path.join(libDir, 'src', 'index.ts'),
    `export { ${className} } from './${name}-service';
export type { ${className}Config } from './types';
`
  );

  fileWrite(
    path.join(libDir, 'src', 'types', 'index.ts'),
    `export type ${className}Config = {
  debug?: boolean;
};
`
  );

  fileWrite(
    path.join(libDir, 'src', `${name}-service.ts`),
    `import { ${className}Config } from './types';

export class ${className} {
  private config: ${className}Config;

  constructor(config: Partial<${className}Config> = {}) {
    this.config = {
      debug: false,
      ...config,
    };
  }

  public getConfig(): ${className}Config {
    return { ...this.config };
  }
}
`
  );

  fileWrite(
    path.join(libDir, 'src', `${name}-service.test.ts`),
    `import { ${className} } from './${name}-service';

describe('${className}', () => {
  it('uses default config when none provided', () => {
    const service = new ${className}();
    expect(service.getConfig().debug).toBe(false);
  });

  it('merges user config with defaults', () => {
    const service = new ${className}({ debug: true });
    expect(service.getConfig().debug).toBe(true);
  });
});
`
  );

  fileWrite(
    path.join(libDir, 'README.md'),
    `# ${scopedName}

${pkgName} shared library.

## Usage

\`\`\`ts
import { ${className} } from '${scopedName}';

const service = new ${className}({ debug: true });
\`\`\`

## Scripts

| Script | Description |
|---|---|
| \`npm run build\` | Compile TypeScript |
| \`npm test\` | Run Jest tests |
| \`npm run lint\` | Lint with ESLint |
`
  );
}

function updateRootPackageJson(name) {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = readJson(pkgPath);
  const wsName = `lib.${name}`;
  if (!pkg.workspaces.includes(wsName)) {
    pkg.workspaces.push(wsName);
    pkg.workspaces.sort();
    writeJson(pkgPath, pkg);
    logSuccess(`Added ${wsName} to root package.json workspaces`);
  } else {
    log(`   ${wsName} already in workspaces`);
  }
}

function updateViteSharedConfig(name) {
  const filePath = path.join(ROOT, 'vite.shared.config.ts');
  if (!fs.existsSync(filePath)) {
    log('   vite.shared.config.ts not found, skipping');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const alias = `    '${SCOPE}/lib.${name}': resolve(appDir, '../lib.${name}/src'),`;
  if (content.includes(`${SCOPE}/lib.${name}`)) {
    log(`   vite.shared.config.ts already has alias for lib.${name}`);
    return;
  }
  const updated = content.replace(
    /(\s+'@my-org\/lib\.[^']*': resolve\(appDir, '\.\.\/lib\.[^']*\/src'\),)(\s+\};)/,
    `$1\n${alias}$2`
  );
  if (updated === content) {
    const fallback = content.replace(
      /(const libraryAliases = \{[\s\S]*?)\n(\s+\};)/,
      `$1\n${alias}\n$2`
    );
    fs.writeFileSync(filePath, fallback);
  } else {
    fs.writeFileSync(filePath, updated);
  }
  logSuccess(`Added alias to vite.shared.config.ts`);
}

function updateDockerfile(name) {
  const filePath = path.join(ROOT, 'Dockerfile.app.optimized');
  if (!fs.existsSync(filePath)) {
    log('   Dockerfile.app.optimized not found, skipping');
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(`lib.${name}/package.json`)) {
    log(`   Dockerfile.app.optimized already includes lib.${name}`);
    return;
  }

  const pkgCopyLine = `COPY --chown=viteuser:nodejs lib.${name}/package.json ./lib.${name}/`;
  content = content.replace(
    /(COPY --chown=viteuser:nodejs lib\.[a-z-]+\/package\.json \.\/lib\.[a-z-]+\/\n)(?!COPY --chown=viteuser:nodejs lib\.)/,
    `$1${pkgCopyLine}\n`
  );

  const srcCopyLine = `COPY --chown=viteuser:nodejs lib.${name}/ ./lib.${name}/`;
  content = content.replace(
    /(COPY --chown=viteuser:nodejs lib\.[a-z-]+\/ \.\/lib\.[a-z-]+\/\n)(?!COPY --chown=viteuser:nodejs lib\.)/,
    `$1${srcCopyLine}\n`
  );

  fs.writeFileSync(filePath, content);
  logSuccess(`Updated Dockerfile.app.optimized`);
}

function runInstall() {
  logStep('Running npm install...');
  try {
    execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
    logSuccess('npm install complete');
  } catch {
    logError('npm install failed. Run it manually.');
  }
}

function main() {
  const { name } = parseArgs(process.argv);
  const libDir = path.join(ROOT, `lib.${name}`);

  log('', colors.bold);
  log(`Creating ${SCOPE}/lib.${name}`, `${colors.bold}${colors.green}`);
  log('', colors.bold);

  if (fs.existsSync(libDir)) {
    logError(`Directory already exists: lib.${name}`);
    process.exit(1);
  }

  logStep(`Creating files in lib.${name}/`);
  generateFiles(libDir, name);
  logSuccess(`Created lib.${name}/`);

  logStep('Updating root package.json...');
  updateRootPackageJson(name);

  logStep('Updating vite.shared.config.ts...');
  updateViteSharedConfig(name);

  logStep('Updating Dockerfile.app.optimized...');
  updateDockerfile(name);

  runInstall();

  log('', colors.bold);
  log(`Done. To use the new library:`, `${colors.bold}${colors.green}`);
  log(`  1. cd lib.${name} && npm run build`);
  log(`  2. Add "${SCOPE}/lib.${name}": "*" to your app's dependencies`);
  log(`  3. Import: import { ${toPascalCase(name)}Service } from '${SCOPE}/lib.${name}';`);
}

main();
