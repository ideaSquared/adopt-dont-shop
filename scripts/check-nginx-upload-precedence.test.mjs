import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { findMissingCaretTilde, REQUIRED_PREFIXES } from './check-nginx-upload-precedence.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('findMissingCaretTilde', () => {
  it('finds nothing when both upload prefixes use ^~', () => {
    const text = `
        location ^~ /uploads/documents/ {
            deny all;
        }

        location ^~ /uploads/ {
            root /srv;
        }
    `;
    expect(findMissingCaretTilde(text)).toEqual([]);
  });

  it('flags a prefix location missing ^~ (ADS-1294 regression case)', () => {
    const text = `
        location /uploads/documents/ {
            deny all;
        }

        location ^~ /uploads/ {
            root /srv;
        }
    `;
    expect(findMissingCaretTilde(text)).toEqual(['/uploads/documents/']);
  });

  it('flags both prefixes when neither uses ^~', () => {
    const text = `
        location /uploads/documents/ {
            deny all;
        }

        location /uploads/ {
            root /srv;
        }
    `;
    expect(findMissingCaretTilde(text)).toEqual(REQUIRED_PREFIXES);
  });

  it('flags a prefix that is missing from the config entirely', () => {
    expect(findMissingCaretTilde('server { location / { return 200; } }')).toEqual(
      REQUIRED_PREFIXES
    );
  });
});

describe('nginx/nginx.prod.conf (real file)', () => {
  it('keeps ^~ on the /uploads/documents/ and /uploads/ prefix locations', () => {
    // Regression guard for ADS-1294: without ^~, the server-level
    // static-asset regex location (line ~276) wins over these prefixes,
    // bypassing the /uploads/documents/ deny for any matching extension.
    const text = readFileSync(join(REPO_ROOT, 'nginx/nginx.prod.conf'), 'utf8');
    expect(findMissingCaretTilde(text)).toEqual([]);
  });
});
