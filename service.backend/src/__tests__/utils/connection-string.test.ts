import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildConnectionString } from '../../sequelize';

const ENV_KEYS = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD'] as const;

describe('buildConnectionString', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      originalEnv[k] = process.env[k];
    }
    process.env.DB_HOST = 'database';
    process.env.DB_PORT = '5432';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_PASSWORD = 'simple';
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      const v = originalEnv[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  });

  it('produces a postgresql URL parseable by the WHATWG URL parser', () => {
    const url = new URL(buildConnectionString('mydb'));
    expect(url.protocol).toBe('postgresql:');
    expect(url.username).toBe('postgres');
    expect(url.password).toBe('simple');
    expect(url.hostname).toBe('database');
    expect(url.port).toBe('5432');
    expect(url.pathname).toBe('/mydb');
  });

  it('encodes passwords containing reserved URI characters', () => {
    // Real-world breakage: openssl rand -base64 32 emits passwords with '/',
    // '+', and '='. Without encoding, the '/' terminates the authority and
    // the URL parser ends up reading the username as the hostname.
    process.env.DB_PASSWORD = '/PrZComp+Vi/E=';
    const url = new URL(buildConnectionString('adopt_dont_shop_dev'));
    expect(url.hostname).toBe('database');
    expect(decodeURIComponent(url.password)).toBe('/PrZComp+Vi/E=');
  });

  it('encodes usernames and database names with reserved characters', () => {
    process.env.DB_USERNAME = 'user@with:special';
    const url = new URL(buildConnectionString('db/with/slashes'));
    expect(url.hostname).toBe('database');
    expect(decodeURIComponent(url.username)).toBe('user@with:special');
    expect(decodeURIComponent(url.pathname.slice(1))).toBe('db/with/slashes');
  });

  it('throws when DB_USERNAME is not set', () => {
    process.env.DB_USERNAME = '';
    expect(() => buildConnectionString('any')).toThrow('DB_USERNAME');
  });

  it('throws when DB_PASSWORD is not set', () => {
    process.env.DB_PASSWORD = '';
    expect(() => buildConnectionString('any')).toThrow('DB_PASSWORD');
  });

  it('throws when DB_HOST is not set', () => {
    process.env.DB_HOST = '';
    expect(() => buildConnectionString('any')).toThrow('DB_HOST');
  });

  it('throws when DB_PORT is not set', () => {
    process.env.DB_PORT = '';
    expect(() => buildConnectionString('any')).toThrow('DB_PORT');
  });
});
