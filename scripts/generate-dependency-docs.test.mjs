import { describe, expect, it } from 'vitest';

import {
  buildConsumerMap,
  consumerDocFileName,
  docsIndexLibraryListSection,
  formatConsumerDoc,
  libShortName,
  readmeConsumersSection,
  upsertMarkedSection,
} from './generate-dependency-docs.mjs';

const pkg = (name, dir, deps) => ({ name, dir, deps });

describe('buildConsumerMap', () => {
  it('maps each lib.* package to the workspace packages that depend on it', () => {
    const packages = [
      pkg('@adopt-dont-shop/lib.types', 'packages/lib.types', []),
      pkg('@adopt-dont-shop/lib.api', 'packages/lib.api', ['@adopt-dont-shop/lib.types']),
      pkg('@adopt-dont-shop/app.admin', 'apps/admin', [
        '@adopt-dont-shop/lib.api',
        '@adopt-dont-shop/lib.types',
      ]),
    ];

    const map = buildConsumerMap(packages);

    expect(map.get('@adopt-dont-shop/lib.types')).toEqual([
      { name: '@adopt-dont-shop/app.admin', dir: 'apps/admin' },
      { name: '@adopt-dont-shop/lib.api', dir: 'packages/lib.api' },
    ]);
    expect(map.get('@adopt-dont-shop/lib.api')).toEqual([
      { name: '@adopt-dont-shop/app.admin', dir: 'apps/admin' },
    ]);
  });

  it('excludes non-lib.* packages from the map keys, even if other packages depend on them', () => {
    const packages = [
      pkg('@adopt-dont-shop/proto', 'packages/proto', []),
      pkg('@adopt-dont-shop/service.gateway', 'services/gateway', ['@adopt-dont-shop/proto']),
    ];

    const map = buildConsumerMap(packages);

    expect(map.has('@adopt-dont-shop/proto')).toBe(false);
  });

  it('gives a lib.* package with no consumers an empty array', () => {
    const packages = [pkg('@adopt-dont-shop/lib.orphan', 'packages/lib.orphan', [])];

    const map = buildConsumerMap(packages);

    expect(map.get('@adopt-dont-shop/lib.orphan')).toEqual([]);
  });
});

describe('libShortName / consumerDocFileName', () => {
  it('strips the workspace scope', () => {
    expect(libShortName('@adopt-dont-shop/lib.api')).toBe('lib.api');
  });

  it('builds the consumer doc filename from the short name', () => {
    expect(consumerDocFileName('@adopt-dont-shop/lib.api')).toBe('lib.api-consumers.md');
  });
});

describe('formatConsumerDoc', () => {
  it('lists each consumer with its workspace directory', () => {
    const doc = formatConsumerDoc('@adopt-dont-shop/lib.api', [
      { name: '@adopt-dont-shop/app.admin', dir: 'apps/admin' },
    ]);
    expect(doc).toContain('Consumers of `@adopt-dont-shop/lib.api`');
    expect(doc).toContain('1 workspace package(s)');
    expect(doc).toContain('`@adopt-dont-shop/app.admin` (`apps/admin`)');
  });

  it('says so explicitly when there are no consumers', () => {
    const doc = formatConsumerDoc('@adopt-dont-shop/lib.orphan', []);
    expect(doc).toContain('No workspace package currently depends on this library.');
  });
});

describe('readmeConsumersSection / docsIndexLibraryListSection', () => {
  it('links to the generated consumer doc with the correct relative path', () => {
    const section = readmeConsumersSection('@adopt-dont-shop/lib.api', [
      { name: '@adopt-dont-shop/app.admin', dir: 'apps/admin' },
    ]);
    expect(section).toContain('../../docs/libraries/lib.api-consumers.md');
    expect(section).toContain('1 workspace package(s)');
  });

  it('renders one bullet per lib.* package, sorted by name', () => {
    const map = new Map([
      ['@adopt-dont-shop/lib.utils', []],
      ['@adopt-dont-shop/lib.api', [{ name: '@adopt-dont-shop/app.admin', dir: 'apps/admin' }]],
    ]);
    const section = docsIndexLibraryListSection(map);
    const apiIndex = section.indexOf('lib.api consumers');
    const utilsIndex = section.indexOf('lib.utils consumers');
    expect(apiIndex).toBeGreaterThan(-1);
    expect(utilsIndex).toBeGreaterThan(apiIndex);
    expect(section).toContain('./libraries/lib.api-consumers.md');
    expect(section).toContain('1 consumer(s)');
  });
});

describe('upsertMarkedSection', () => {
  const start = '<!-- START -->';
  const end = '<!-- END -->';

  it('appends the section when the markers are not present yet', () => {
    const result = upsertMarkedSection(
      '# Doc\n\nSome content.',
      start,
      end,
      `${start}\nnew\n${end}`
    );
    expect(result).toContain('Some content.');
    expect(result).toContain(`${start}\nnew\n${end}`);
  });

  it('replaces a previously generated section instead of duplicating it', () => {
    const original = `# Doc\n\nIntro.\n\n${start}\nold\n${end}\n\nOutro.`;
    const result = upsertMarkedSection(original, start, end, `${start}\nnew\n${end}`);
    expect(result).toContain('new');
    expect(result).not.toContain('old');
    expect(result).toContain('Intro.');
    expect(result).toContain('Outro.');
    expect(result.match(new RegExp(start, 'g'))).toHaveLength(1);
  });
});
