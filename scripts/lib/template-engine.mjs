import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

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

/**
 * Update the root package.json: insert `workspaceEntry` into the workspaces
 * array (sorted, deduped) and apply additional script entries.
 */
export function registerWorkspace(workspaceEntry, extraScripts = {}) {
  const packageJsonPath = path.join(ROOT_DIR, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (!packageJson.workspaces.includes(workspaceEntry)) {
    packageJson.workspaces.push(workspaceEntry);
    packageJson.workspaces.sort();
  }

  for (const [name, value] of Object.entries(extraScripts)) {
    packageJson.scripts[name] = value;
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log(`📦 Updated root package.json with ${workspaceEntry}`, 'green');
}

/**
 * Insert a `COPY lib.<name>/ ./lib.<name>/` line into Dockerfile.app
 * after the last existing such line. Skips silently when the dockerfile or
 * marker is missing.
 */
export function updateAppOptimizedDockerfile(libName) {
  const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile.app');
  if (!fs.existsSync(dockerfilePath)) {
    return;
  }

  let content = fs.readFileSync(dockerfilePath, 'utf8');
  const newLine = `COPY lib.${libName}/ ./lib.${libName}/`;

  const libCopyRegex = /COPY lib\.[^/]+\/ \.\/lib\.[^/]+\/$/gm;
  const matches = [...content.matchAll(libCopyRegex)];

  if (matches.length === 0) {
    log(`⚠️  Could not find library copy section in Dockerfile.app`, 'yellow');
    log(`💡 Manually add: ${newLine}`, 'cyan');
    return;
  }

  const last = matches[matches.length - 1];
  const insertIndex = last.index + last[0].length;
  content = content.slice(0, insertIndex) + '\n' + newLine + content.slice(insertIndex);

  fs.writeFileSync(dockerfilePath, content);
  log(`🐳 Updated Dockerfile.app with lib.${libName}`, 'green');
}

export { ROOT_DIR };
