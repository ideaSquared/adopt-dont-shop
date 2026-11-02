// The caller's coordinates (lat/lng/latitude/longitude query params) are
// precise PII. Every nginx access log writes the request line next to the
// client IP, so each log_format must use the sanitised $loggable_uri built by
// the map chain, never the raw $request / $request_uri / $args.
//
// The map regexes use the PCRE subset that JS regexes share (lazy groups,
// numbered captures), so this test runs the very regexes from each config over
// sample URLs. (They were also exercised against a real nginx:1.27 container.)

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const NGINX_CONFIGS = ['deploy/gateway/nginx.conf', 'nginx/nginx.conf', 'nginx/nginx.prod.conf'];

const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

const MAP_BLOCK =
  /    map \$request_uri \$log_uri_lat \{[\s\S]*?\$loggable_uri \{[\s\S]*?\n    \}\n/;

const mapStages = text => {
  const stages = [];
  const re = /map (\$\w+) (\$\w+) \{\n\s+default (\$\w+);\n\s+"~(.*)" "\$1\$2";\n\s+\}/g;
  for (const m of text.matchAll(re)) {
    stages.push({ from: m[1], to: m[2], regex: new RegExp(m[4]) });
  }
  return stages;
};

// Mirror nginx: each map takes the previous stage's value; a non-matching
// regex falls through to `default` (the unchanged input).
const logged = (text, requestUri) =>
  mapStages(text).reduce((value, { regex }) => {
    const m = value.match(regex);
    return m ? `${m[1]}${m[2]}` : value;
  }, requestUri);

describe.each(NGINX_CONFIGS)('%s access log', rel => {
  const text = read(rel);

  it('builds the sanitised request line with one map per coordinate param', () => {
    expect(mapStages(text).map(s => s.to)).toEqual([
      '$log_uri_lat',
      '$log_uri_lng',
      '$log_uri_latitude',
      '$loggable_uri',
    ]);
  });

  it('writes the sanitised line, not the raw request, to every log_format', () => {
    const formats = [...text.matchAll(/log_format \w+ ((?:'[^']*'\s*)+);/g)].map(m => m[1]);
    expect(formats.length).toBeGreaterThan(0);
    for (const format of formats) {
      expect(format).toContain('$loggable_uri');
      expect(format).not.toMatch(/\$request\b(?!_method|_uri)/);
      expect(format).not.toContain('$request_uri');
      expect(format).not.toContain('$args');
      expect(format).not.toContain('$query_string');
    }
  });

  it.each([
    ['/api/v1/pets?lat=51.5&lng=-0.12', '/api/v1/pets?'],
    [
      '/api/v1/pets/abc?x=1&latitude=51.5&limit=5&longitude=-0.12&y=2',
      '/api/v1/pets/abc?x=1&limit=5&y=2',
    ],
    ['/api/v1/pets?type=dog&lat=51.5&lng=-0.12&page=2', '/api/v1/pets?type=dog&page=2'],
    ['/rescues/nearby?lat=1&lng=2&radiusKm=5', '/rescues/nearby?radiusKm=5'],
    ['/api/v1/pets?lng=-0.12&q=lat', '/api/v1/pets?q=lat'],
  ])('logs %s without the coordinate values', (url, expected) => {
    expect(logged(text, url)).toBe(expected);
  });

  it('leaves look-alike params and coordinate-free URLs untouched', () => {
    expect(logged(text, '/api/v1/pets?flat=1&platform=x')).toBe('/api/v1/pets?flat=1&platform=x');
    expect(logged(text, '/api/v1/pets/abc')).toBe('/api/v1/pets/abc');
  });
});

describe('nginx configs', () => {
  it('carry an identical redaction map block', () => {
    const blocks = NGINX_CONFIGS.map(rel => read(rel).match(MAP_BLOCK)?.[0]);
    for (const block of blocks) {
      expect(block).toBeDefined();
    }
    expect(new Set(blocks).size).toBe(1);
  });
});
