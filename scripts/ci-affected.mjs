#!/usr/bin/env node
// Decides which CI areas a change touches, for ci.yml's `changes` job.
//
// Packages come from turbo's dependency graph (`turbo ls --affected`), so a
// change to lib.pets marks lib.pets plus the apps that depend on it, and no
// service. That replaces hand-kept path lists, which had to over-trigger
// (`packages/**` fired both frontend and backend) to stay safe.
//
// Files that sit outside the package graph but still change what a job tests
// (root configs, pacts, the e2e stack) are matched by the patterns below.
//
// Outputs (GITHUB_OUTPUT): frontend, backend, libs, packages, e2e as
// 'true'/'false', and apps as a JSON array of app short names ('client', ...).

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SCOPE = '@adopt-dont-shop/';
const TURBO = 'turbo@2.9.18';

// A change to any of these can alter every package, so every area runs. The CI
// workflow and its actions are included so an edit to CI exercises CI.
const GLOBAL_FILES = [
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  /^tsconfig[^/]*\.json$/,
  /^turbo\.json$/,
  /^vite\.shared\.config\.ts$/,
  /^vitest\.(shared\.config|workspace)\.ts$/,
  /^eslint\.config\.js$/,
  /^\.prettierrc$/,
  /^\.nvmrc$/,
  /^\.npmrc$/,
  /^\.github\/workflows\/ci\.yml$/,
  /^\.github\/actions\//,
];

// Not packages, but the contract tests read pacts/.
const BACKEND_FILES = [/^pacts\//];

// What the Playwright stack is built from and driven by.
const E2E_FILES = [
  /^e2e\//,
  /^docker-compose[^/]*\.yml$/,
  /^docker-bake\.hcl$/,
  /^Dockerfile[^/]*$/,
  /^\.dockerignore$/,
  /^scripts\/init-postgis\.sql$/,
  /^scripts\/write-redis-secret\.mjs$/,
  /^nginx\//,
  /^\.github\/actions\/e2e-suite\//,
];

const matchesAny = (patterns, files) => files.some(file => patterns.some(p => p.test(file)));

const shortName = name => name.replace(SCOPE, '');
const isApp = name => shortName(name).startsWith('app.');
const isService = name => shortName(name).startsWith('service.');
const isLib = name => shortName(name).startsWith('lib.');
const isSharedPackage = name =>
  !isApp(name) && !isService(name) && !isLib(name) && shortName(name) !== 'e2e';

const appNames = names =>
  names
    .filter(isApp)
    .map(name => shortName(name).slice('app.'.length))
    .sort();

export const classifyAffected = ({ affected, files, allPackages }) => {
  const everything = matchesAny(GLOBAL_FILES, files);
  const touched = everything ? allPackages : affected;

  return {
    frontend: touched.some(isApp),
    backend: touched.some(isService) || matchesAny(BACKEND_FILES, files),
    libs: touched.some(isLib),
    packages: touched.some(isSharedPackage),
    e2e:
      touched.some(name => isApp(name) || isService(name)) ||
      matchesAny(E2E_FILES, files) ||
      everything,
    apps: appNames(touched),
  };
};

const lsPackages = (args, env) =>
  JSON.parse(
    execFileSync('npx', ['--yes', TURBO, 'ls', ...args, '--output=json'], {
      encoding: 'utf8',
      env,
      // npx is npx.cmd on Windows, which spawn only finds through a shell.
      shell: process.platform === 'win32',
    }).replace(/^[^{]*/, '')
  ).packages.items.map(item => item.name);

const git = args => execFileSync('git', args, { encoding: 'utf8' });

// Booleans go out bare ('true'/'false'); the apps array goes out as JSON.
const writeOutputs = outputs => {
  const text = Object.entries(outputs)
    .map(([key, value]) => `${key}=${typeof value === 'boolean' ? value : JSON.stringify(value)}`)
    .join('\n');
  process.stdout.write(`${text}\n`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${text}\n`);
  }
};

const runEverything = allPackages =>
  classifyAffected({ affected: allPackages, files: ['package.json'], allPackages });

const main = () => {
  const base = process.env.CI_BASE_SHA;
  const head = process.env.CI_HEAD_SHA || 'HEAD';
  const allPackages = lsPackages([], process.env);

  // No usable base (manual run, first push of a branch): run everything.
  if (!base || /^0+$/.test(base)) {
    writeOutputs(runEverything(allPackages));
    return;
  }

  try {
    const files = git(['diff', '--name-only', `${base}...${head}`])
      .split('\n')
      .filter(Boolean);
    const affected = lsPackages(['--affected'], {
      ...process.env,
      TURBO_SCM_BASE: base,
      TURBO_SCM_HEAD: head,
    });
    writeOutputs(classifyAffected({ affected, files, allPackages }));
  } catch (err) {
    // A base that can't be diffed (e.g. a force-pushed-away commit) must not
    // silently skip jobs: fail safe and run everything.
    console.warn(`could not compute affected packages, running everything: ${err.message}`);
    writeOutputs(runEverything(allPackages));
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
