import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildConnectionString } from '../../sequelize';

describe('buildConnectionString', () => {
  const originalEnv = {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };

  beforeEach(() => {
    process.env.DB_HOST = 'database';
    process.env.DB_PORT = '5432';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_PASSWORD = 'simple';
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(originalEnv)) {
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

  it.each(['DB_USERNAME', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'])(
    'throws if %s is not set',
    (key) => {
      delete process.env[key];
      expect(() => buildConnectionString('any')).toThrow(key);
    }
  );
});
