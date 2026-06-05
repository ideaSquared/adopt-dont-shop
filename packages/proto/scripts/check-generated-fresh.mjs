#!/usr/bin/env node
/**
 * Drift guard for ts-proto generated output (CAD lesson #13: audit every
 * glob whenever a new file shape arrives).
 *
 * Runs `buf generate` into a tmpdir, diffs against `src/generated/`, and
 * fails CI if they disagree. Caller fix: run `npm run generate` and
 * commit the result. Identical pattern to CAD's
 * `tools/scripts/check-proto-fresh.mjs`.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(PKG_ROOT, '..', '..');
const BUF_BIN = join(REPO_ROOT, 'node_modules', '.bin', 'buf');
const TS_PROTO_BIN = join(REPO_ROOT, 'node_modules', '.bin', 'protoc-gen-ts_proto');

const tmp = mkdtempSync(join(tmpdir(), 'proto-fresh-'));
try {
  cpSync(join(PKG_ROOT, 'buf.yaml'), join(tmp, 'buf.yaml'));
  cpSync(join(PKG_ROOT, 'proto'), join(tmp, 'proto'), { recursive: true });

  // Tmpdir-local gen.yaml points at the same hermetic ts-proto plugin
  // but writes to ./out instead of stomping the committed src/generated.
  // Absolute paths so resolution doesn't depend on cwd or node_modules
  // walk-up (the tmpdir has neither).
  const genYaml = `version: v1
plugins:
  - plugin: ts_proto
    path: ${TS_PROTO_BIN}
    out: out
    opt:
      - esModuleInterop=true
      - importSuffix=.js
      - useOptionals=messages
      - outputJsonMethods=true
      - outputServices=false
`;
  writeFileSync(join(tmp, 'buf.gen.yaml'), genYaml);

  // Invoke buf via absolute path — `npx buf` from inside the tmpdir
  // would fail npx's node_modules walk-up (the tmpdir has no
  // package.json ancestor).
  execSync(`${BUF_BIN} generate`, { cwd: tmp, stdio: 'inherit' });

  // Diff the fresh output against what's committed.
  try {
    execSync(`diff -r ${join(tmp, 'out', 'proto')} ${join(PKG_ROOT, 'src', 'generated', 'proto')}`, {
      stdio: 'pipe',
    });
    console.log('OK — generated proto output is in sync with the .proto sources.');
  } catch (err) {
    console.error(
      'Generated proto output is STALE — re-run `npm run generate` and commit the result.',
    );
    console.error('Diff vs committed src/generated/:');
    console.error(err.stdout?.toString() ?? '');
    console.error(err.stderr?.toString() ?? '');
    process.exit(1);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
