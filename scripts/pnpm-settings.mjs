/**
 * Reads the `overrides` and `allowBuilds` maps from pnpm-workspace.yaml.
 *
 * pnpm 12 no longer reads the `pnpm` field of package.json, so these settings live in
 * pnpm-workspace.yaml. Dependency-free on purpose (the check scripts run without node_modules), so this
 * only understands the flat `'key': 'value'` maps this repo writes there.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const unquote = text => text.trim().replace(/^(['"])(.*)\1$/, '$2');

export function parsePnpmWorkspaceMaps(yamlText) {
  const maps = {};
  let current = null;
  for (const raw of yamlText.split('\n')) {
    const line = raw.replace(/\s+#.*$/, '');
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ')) {
      const top = line.match(/^([A-Za-z]+):\s*$/);
      current = top ? top[1] : null;
      if (current) maps[current] = {};
      continue;
    }
    if (!current) continue;
    const entry = line.trim().match(/^('[^']*'|"[^"]*"|[^:]+?):\s*(.+)$/);
    if (entry) maps[current][unquote(entry[1])] = unquote(entry[2]);
  }
  return maps;
}

export function readPnpmSettings(root) {
  const maps = parsePnpmWorkspaceMaps(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8'));
  return {
    overrides: maps.overrides ?? {},
    onlyBuiltDependencies: Object.entries(maps.allowBuilds ?? {})
      .filter(([, allowed]) => allowed === 'true')
      .map(([name]) => name),
  };
}
