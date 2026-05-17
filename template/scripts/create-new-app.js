#!/usr/bin/env node

/**
 * Generator: create-new-app
 * Usage: npm run new-app <name>
 *
 * Creates a new React + Vite + TypeScript app at app.<name>/.
 * Also updates the root package.json workspaces.
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
    logError('App name is required.');
    log('Usage: npm run new-app <name>');
    log('Example: npm run new-app admin');
    process.exit(1);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    logError(`Invalid name "${name}". Use lowercase letters, digits, and hyphens.`);
    process.exit(1);
  }
  return { name };
}

function generateFiles(appDir, name) {
  const scopedName = `${SCOPE}/app.${name}`;
  const title = `${name.charAt(0).toUpperCase()}${name.slice(1)} App`;

  fileWrite(
    path.join(appDir, 'package.json'),
    JSON.stringify(
      {
        name: scopedName,
        version: '1.0.0',
        description: `${name} React application`,
        license: 'MIT',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          'type-check': 'tsc --noEmit',
          preview: 'vite preview',
          test: 'vitest run',
          'test:watch': 'vitest',
          'test:coverage': 'vitest run --coverage',
          'test:ui': 'vitest --ui',
          lint: 'eslint . --ext ts,tsx',
          'lint:fix': 'eslint . --ext ts,tsx --fix',
          format: 'prettier --write "src/**/*.{ts,tsx,js,jsx,json}"',
          'format:check': 'prettier --check "src/**/*.{ts,tsx,js,jsx,json}"',
          clean: 'rm -rf dist',
        },
        dependencies: {
          [`${SCOPE}/lib.example`]: '*',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'react-router-dom': '^6.22.3',
        },
        devDependencies: {
          [`${SCOPE}/eslint-config-react`]: '*',
          '@testing-library/jest-dom': '^6.4.2',
          '@testing-library/react': '^16.3.2',
          '@testing-library/user-event': '^14.5.2',
          '@types/react': '^18.3.3',
          '@types/react-dom': '^18.2.19',
          '@vitejs/plugin-react': '^6.0.1',
          '@vitest/ui': '^4.1.5',
          'happy-dom': '^20.0.10',
          typescript: '^5.4.5',
          vite: '^8.0.10',
          vitest: '^4.0.8',
        },
      },
      null,
      2
    ) + '\n'
  );

  fileWrite(
    path.join(appDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noFallthroughCasesInSwitch: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          forceConsistentCasingInFileNames: true,
          baseUrl: './src',
          paths: {
            '@/*': ['*'],
          },
        },
        include: ['src', 'src/vite-env.d.ts'],
        exclude: ['dist', 'node_modules', '**/*.test.*', '**/*.spec.*'],
        references: [{ path: './tsconfig.node.json' }],
      },
      null,
      2
    ) + '\n'
  );

  fileWrite(
    path.join(appDir, 'tsconfig.node.json'),
    JSON.stringify(
      {
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          allowSyntheticDefaultImports: true,
        },
        include: ['vite.config.ts', 'vitest.config.ts'],
      },
      null,
      2
    ) + '\n'
  );

  fileWrite(
    path.join(appDir, 'vite.config.ts'),
    `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { getAppAliases, getLibraryAliases } from '../vite.shared.config';

export default defineConfig(({ mode }) => {
  const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
  const backendHost = isDocker ? 'service-api' : 'localhost';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        ...getAppAliases(__dirname),
        ...getLibraryAliases(__dirname, mode),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': { target: \`http://\${backendHost}:5000\`, changeOrigin: true, secure: false },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
`
  );

  fileWrite(
    path.join(appDir, 'vitest.config.ts'),
    `import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/setup-tests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '${SCOPE}/lib.example': path.resolve(__dirname, '../lib.example/src/index.ts'),
    },
  },
});
`
  );

  fileWrite(
    path.join(appDir, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
  );

  fileWrite(
    path.join(appDir, '.eslintrc.cjs'),
    `module.exports = {
  extends: ['${SCOPE}/eslint-config-react'],
};
`
  );

  fileWrite(
    path.join(appDir, 'src', 'vite-env.d.ts'),
    `/// <reference types="vite/client" />\n`
  );

  fileWrite(
    path.join(appDir, 'src', 'setup-tests.ts'),
    `import '@testing-library/jest-dom';\n`
  );

  fileWrite(
    path.join(appDir, 'src', 'main.tsx'),
    `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
`
  );

  fileWrite(
    path.join(appDir, 'src', 'App.tsx'),
    `function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>${title}</h1>
      <p>Edit src/App.tsx to get started.</p>
    </main>
  );
}

export default App;
`
  );
}

function updateRootPackageJson(name) {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = readJson(pkgPath);
  const wsName = `app.${name}`;
  if (!pkg.workspaces.includes(wsName)) {
    pkg.workspaces.push(wsName);
    pkg.workspaces.sort();
    writeJson(pkgPath, pkg);
    logSuccess(`Added ${wsName} to root package.json workspaces`);
  } else {
    log(`   ${wsName} already in workspaces`);
  }
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
  const appDir = path.join(ROOT, `app.${name}`);

  log('', colors.bold);
  log(`Creating ${SCOPE}/app.${name}`, `${colors.bold}${colors.green}`);
  log('', colors.bold);

  if (fs.existsSync(appDir)) {
    logError(`Directory already exists: app.${name}`);
    process.exit(1);
  }

  logStep(`Creating files in app.${name}/`);
  generateFiles(appDir, name);
  logSuccess(`Created app.${name}/`);

  logStep('Updating root package.json...');
  updateRootPackageJson(name);

  runInstall();

  log('', colors.bold);
  log(`Done. To start the new app:`, `${colors.bold}${colors.green}`);
  log(`  cd app.${name} && npm run dev`);
}

main();
