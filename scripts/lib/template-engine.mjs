import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root. Overridable via ADS_GENERATOR_ROOT so the generator smoke tests
// can run the real generators into a throwaway temp dir instead of the repo.
const ROOT_DIR = process.env.ADS_GENERATOR_ROOT
  ? path.resolve(process.env.ADS_GENERATOR_ROOT)
  : path.resolve(__dirname, '..', '..');

// ANSI color codes for console output
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

export function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`📁 Created directory: ${path.relative(ROOT_DIR, dirPath)}`, 'cyan');
  }
}

export function writeFile(filePath, content) {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  log(`📄 Created file: ${path.relative(ROOT_DIR, filePath)}`, 'green');
}

/**
 * Replace {{KEY}} placeholders with their values from vars.
 */
export function renderTemplate(content, vars) {
  return content.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key];
    }
    return match;
  });
}

/**
 * Copy a templates directory into dest, substituting placeholders in file
 * contents and file paths. Returns the list of files written.
 */
export function copyTemplateDir(srcDir, destDir, vars, options = {}) {
  const { renameMap = {} } = options;
  const written = [];

  const walk = (currentSrc, currentDest) => {
    const entries = fs.readdirSync(currentSrc, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(currentSrc, entry.name);
      const renamedName = renameMap[entry.name] ?? renderTemplate(entry.name, vars);
      const destPath = path.join(currentDest, renamedName);

      if (entry.isDirectory()) {
        walk(srcPath, destPath);
        continue;
      }

      const raw = fs.readFileSync(srcPath, 'utf8');
      const rendered = renderTemplate(raw, vars);
      writeFile(destPath, rendered);
      written.push(destPath);
    }
  };

  walk(srcDir, destDir);
  return written;
}

// Pure: does the pnpm-workspace manifest already match `workspaceRelPath`
// (either an exact entry or a `<parent>/*` | `<parent>/**` glob)? Exported so
// the generator smoke tests can assert the registration logic directly.
export function isWorkspaceCovered(manifestText, workspaceRelPath) {
  const parent = path.dirname(workspaceRelPath); // 'apps' | 'packages' | ...
  const globs = [...manifestText.matchAll(/^\s*-\s*'([^']+)'/gm)].map(m => m[1]);
  return globs.some(g => g === workspaceRelPath || g === `${parent}/*` || g === `${parent}/**`);
}

/**
 * Ensure a newly-generated workspace is discoverable by pnpm.
 *
 * This repo uses pnpm workspaces (pnpm-workspace.yaml), not npm/yarn
 * `package.json` "workspaces". The manifest globs `apps/*` and `packages/*`
 * already cover every generated app (apps/<name>) and lib (packages/lib.<name>),
 * so registration is normally a no-op: pnpm picks the new package up on the
 * next install with no manifest edit. We only append a glob when the target's
 * parent directory isn't already matched — a genuinely new top-level location.
 *
 * `workspaceRelPath` is the new package's path relative to the repo root,
 * e.g. `apps/dashboard` or `packages/lib.chat`.
 */
export function registerWorkspace(workspaceRelPath) {
  const manifestPath = path.join(ROOT_DIR, 'pnpm-workspace.yaml');
  let manifest;
  try {
    manifest = fs.readFileSync(manifestPath, 'utf8');
  } catch {
    log(`⚠️  pnpm-workspace.yaml not found — add ${workspaceRelPath} to it manually`, 'yellow');
    return;
  }

  const parent = path.dirname(workspaceRelPath); // 'apps' | 'packages' | ...

  if (isWorkspaceCovered(manifest, workspaceRelPath)) {
    log(
      `📦 pnpm-workspace.yaml already covers ${parent}/* — ${workspaceRelPath} is registered`,
      'green'
    );
    return;
  }

  // Append the new parent glob under the `packages:` list.
  const glob = `${parent}/*`;
  const updated = manifest.replace(/(packages:\s*\n)/, `$1  - '${glob}'\n`);
  fs.writeFileSync(manifestPath, updated);
  log(`📦 Added '${glob}' to pnpm-workspace.yaml for ${workspaceRelPath}`, 'green');
}

/**
 * Print a reminder that a new workspace package needs a node_modules mount in
 * docker-compose.dev.yml's x-dev-volumes anchor. The ADS-987 drift guard
 * (scripts/check-workspace-consistency.mjs) fails CI otherwise, and the dev
 * container silently shadows the package's deps until it's added.
 */
export function remindDevVolumesMount(workspaceRelPath) {
  log('', 'reset');
  log('🐳 One manual step for the Docker dev stack:', 'cyan');
  log(
    `   Add a mount for ${workspaceRelPath} to docker-compose.dev.yml's x-dev-volumes anchor:`,
    'reset'
  );
  log(`     - /app/${workspaceRelPath}/node_modules`, 'yellow');
  log(
    '   (scripts/check-workspace-consistency.mjs / `pnpm check:workspaces` enforces this.)',
    'reset'
  );
}

export { ROOT_DIR };
