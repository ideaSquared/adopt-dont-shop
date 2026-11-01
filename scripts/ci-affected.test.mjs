import { describe, expect, it } from 'vitest';

import { classifyAffected } from './ci-affected.mjs';

const ALL_PACKAGES = [
  '@adopt-dont-shop/app.admin',
  '@adopt-dont-shop/app.client',
  '@adopt-dont-shop/app.rescue',
  '@adopt-dont-shop/lib.pets',
  '@adopt-dont-shop/db',
  '@adopt-dont-shop/service.gateway',
  '@adopt-dont-shop/service.pets',
  '@adopt-dont-shop/e2e',
];

const classify = ({ affected = [], files = [] } = {}) =>
  classifyAffected({ affected, files, allPackages: ALL_PACKAGES });

describe('classifyAffected', () => {
  it('triggers nothing for a change that touches no package', () => {
    expect(classify({ files: ['docs/runbooks/README.md'] })).toEqual({
      frontend: false,
      backend: false,
      libs: false,
      packages: false,
      e2e: false,
      apps: [],
    });
  });

  it('scopes a frontend lib change to the apps that depend on it, not services', () => {
    const result = classify({
      affected: [
        '@adopt-dont-shop/lib.pets',
        '@adopt-dont-shop/app.client',
        '@adopt-dont-shop/app.rescue',
      ],
      files: ['packages/lib.pets/src/schemas.ts'],
    });

    expect(result).toMatchObject({ frontend: true, backend: false, libs: true, packages: false });
    expect(result.apps).toEqual(['client', 'rescue']);
  });

  it('scopes a service change to backend and the e2e stack only', () => {
    const result = classify({
      affected: ['@adopt-dont-shop/service.pets'],
      files: ['services/pets/src/grpc/handlers.ts'],
    });

    expect(result).toMatchObject({
      frontend: false,
      backend: true,
      libs: false,
      packages: false,
      e2e: true,
      apps: [],
    });
  });

  it('flags a service-side shared package change as packages, plus backend through its dependents', () => {
    const result = classify({
      affected: ['@adopt-dont-shop/db', '@adopt-dont-shop/service.pets'],
      files: ['packages/db/src/index.ts'],
    });

    expect(result).toMatchObject({ packages: true, backend: true, libs: false });
  });

  it('runs the e2e stack for an app change but not for a lib-only change with no app dependents', () => {
    expect(classify({ affected: ['@adopt-dont-shop/app.admin'] })).toMatchObject({
      e2e: true,
      apps: ['admin'],
    });
    expect(classify({ affected: ['@adopt-dont-shop/lib.pets'] })).toMatchObject({
      libs: true,
      e2e: false,
    });
  });

  it.each([
    'e2e/tests/client/pet-discovery.spec.ts',
    'docker-compose.yml',
    'Dockerfile.service',
    '.github/actions/e2e-suite/action.yml',
  ])('runs the e2e stack when %s changes', file => {
    expect(classify({ files: [file] }).e2e).toBe(true);
  });

  it('treats a pact change as a backend change', () => {
    const result = classify({ files: ['pacts/applications/consumer.json'] });

    expect(result).toMatchObject({ backend: true, frontend: false });
  });

  it.each([
    'package.json',
    'pnpm-lock.yaml',
    'turbo.json',
    'tsconfig.base.json',
    'eslint.config.js',
  ])('treats a root config change (%s) as affecting everything', file => {
    const result = classify({ files: [file] });

    expect(result).toEqual({
      frontend: true,
      backend: true,
      libs: true,
      packages: true,
      e2e: true,
      apps: ['admin', 'client', 'rescue'],
    });
  });

  it('treats an edit to the CI workflow itself as affecting everything so it self-tests', () => {
    expect(classify({ files: ['.github/workflows/ci.yml'] }).backend).toBe(true);
  });
});
