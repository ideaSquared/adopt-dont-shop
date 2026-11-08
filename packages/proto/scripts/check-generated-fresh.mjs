#!/usr/bin/env node
/**
 * Drift guard for ts-proto generated output (CAD lesson #13: audit every
 * glob whenever a new file shape arrives).
 *
 * Runs `buf generate` into a tmpdir, diffs against `src/generated/`, and
 * fails CI if they disagree. Also regenerates `src/schema.generated.ts` in
 * memory (scripts/generate-schema.mjs) and fails if the committed copy differs. Caller fix: run `pnpm generate` and
 * commit the result. Identical pattern to CAD's
 * `tools/scripts/check-proto-fresh.mjs`.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, cpSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateSchemaSource } from './generate-schema.mjs';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(PKG_ROOT, '..', '..');

// pnpm's isolated (non-hoisted) layout installs @bufbuild/buf and ts-proto as
// dependencies of *this* package, so their bins live under
// packages/proto/node_modules/.bin — NOT the repo root. Resolve the package
// copy first and fall back to the root only for a hoisted layout. (The old
// root-only path exited 127 on every clean install.)
const resolveBin = name => {
  const local = join(PKG_ROOT, 'node_modules', '.bin', name);
  if (existsSync(local)) return local;
  const root = join(REPO_ROOT, 'node_modules', '.bin', name);
  if (existsSync(root)) return root;
  console.error(
    `Could not find the \`${name}\` binary in packages/proto/node_modules/.bin ` +
      `or the repo root. Run \`pnpm install\` and retry.`
  );
  process.exit(1);
};

const BUF_BIN = resolveBin('buf');
const TS_PROTO_BIN = resolveBin('protoc-gen-ts_proto');

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
      - outputServices=grpc-js
`;
  writeFileSync(join(tmp, 'buf.gen.yaml'), genYaml);

  // Invoke buf via absolute path — `pnpm exec buf` from inside the tmpdir
  // would fail npx's node_modules walk-up (the tmpdir has no
  // package.json ancestor).
  execSync(`${BUF_BIN} generate`, { cwd: tmp, stdio: 'inherit' });

  // Diff the fresh output against what's committed.
  try {
    // Whole output dir, not just `proto/`: options.proto imports
    // google/protobuf/descriptor.proto, which ts-proto emits under `google/`.
    execSync(`diff -r ${join(tmp, 'out')} ${join(PKG_ROOT, 'src', 'generated')}`, {
      stdio: 'pipe',
    });
    console.log('OK — generated proto output is in sync with the .proto sources.');
  } catch (err) {
    console.error(
      'Generated proto output is STALE — re-run `pnpm generate` and commit the result.'
    );
    console.error('Diff vs committed src/generated/:');
    console.error(err.stdout?.toString() ?? '');
    console.error(err.stderr?.toString() ?? '');
    process.exit(1);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const SCHEMA_PATH = join(PKG_ROOT, 'src', 'schema.generated.ts');
const expectedSchema = await generateSchemaSource();
const committedSchema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, 'utf8') : '';
if (expectedSchema !== committedSchema) {
  console.error('src/schema.generated.ts is STALE — re-run `pnpm generate` and commit the result.');
  process.exit(1);
}
console.log('OK — schema.generated.ts is in sync with the .proto sources.');
