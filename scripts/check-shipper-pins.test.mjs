import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findShipperPins } from './check-shipper-pins.mjs';

const OLD_SHA = 'faf1fd936bcba4dd2f1a60ce33f18298ca1cb19c';
const NEW_SHA = '0123456789abcdef0123456789abcdef01234567';

const shipWorkflow = (usesSha, refSha) =>
  [
    'jobs:',
    '  gate:',
    `    uses: ideaSquared/shipper/.github/workflows/gate.yml@${usesSha} # v1`,
    '    with:',
    `      shipper-ref: ${refSha}`,
    '',
  ].join('\n');

describe('real .github/workflows files', () => {
  it('pins shipper to a single commit everywhere', () => {
    expect(findShipperPins()).toHaveLength(1);
  });
});

describe('findShipperPins', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'shipper-pins-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns the one SHA when uses: and shipper-ref agree', () => {
    writeFileSync(join(root, 'ship.yml'), shipWorkflow(OLD_SHA, OLD_SHA));

    expect(findShipperPins(root)).toEqual([OLD_SHA]);
  });

  it('returns both SHAs when a bump moved uses: but not shipper-ref', () => {
    writeFileSync(join(root, 'ship.yml'), shipWorkflow(NEW_SHA, OLD_SHA));

    expect(findShipperPins(root)).toEqual([NEW_SHA, OLD_SHA].sort());
  });

  it('compares pins across workflow files', () => {
    writeFileSync(join(root, 'ship.yml'), shipWorkflow(NEW_SHA, NEW_SHA));
    writeFileSync(join(root, 'rollback.yaml'), shipWorkflow(OLD_SHA, OLD_SHA));

    expect(findShipperPins(root)).toEqual([NEW_SHA, OLD_SHA].sort());
  });

  it('reads quoted shipper-ref values', () => {
    writeFileSync(
      join(root, 'ship.yml'),
      shipWorkflow(NEW_SHA, `'${OLD_SHA}'`) + shipWorkflow(NEW_SHA, `"${OLD_SHA}"`)
    );

    expect(findShipperPins(root)).toEqual([NEW_SHA, OLD_SHA].sort());
  });

  it('ignores commented-out pins', () => {
    writeFileSync(
      join(root, 'ship.yml'),
      [
        `  # uses: ideaSquared/shipper/.github/workflows/gate.yml@${OLD_SHA}`,
        `#   shipper-ref: ${OLD_SHA}`,
        shipWorkflow(NEW_SHA, NEW_SHA),
      ].join('\n')
    );

    expect(findShipperPins(root)).toEqual([NEW_SHA]);
  });

  it('ignores old pins in inline comments', () => {
    writeFileSync(
      join(root, 'ship.yml'),
      shipWorkflow(NEW_SHA, `${NEW_SHA} # was shipper-ref: "${OLD_SHA}"`)
    );

    expect(findShipperPins(root)).toEqual([NEW_SHA]);
  });

  it('reads quoted uses: values', () => {
    writeFileSync(
      join(root, 'ship.yml'),
      [
        `    uses: "ideaSquared/shipper/.github/workflows/gate.yml@${NEW_SHA}"`,
        `    uses: 'ideaSquared/shipper/.github/workflows/report.yml@${NEW_SHA}'`,
        `      shipper-ref: ${OLD_SHA}`,
        '',
      ].join('\n')
    );

    expect(findShipperPins(root)).toEqual([NEW_SHA, OLD_SHA].sort());
  });

  it('ignores prose that mentions shipper-ref without a SHA', () => {
    writeFileSync(
      join(root, 'ship.yml'),
      `# bump the SHA and shipper-ref: together\n${shipWorkflow(OLD_SHA, OLD_SHA)}`
    );

    expect(findShipperPins(root)).toEqual([OLD_SHA]);
  });
});
