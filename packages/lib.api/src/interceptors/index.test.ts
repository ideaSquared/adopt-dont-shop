import { describe, expect, it } from 'vitest';
import { InterceptorManager, type RequestConfig } from './index';

const baseConfig = (): RequestConfig => ({
  url: 'https://api.example.com/test',
  method: 'GET',
  headers: {},
});

describe('InterceptorManager', () => {
  it('applies request interceptors in registration order', async () => {
    const manager = new InterceptorManager();
    manager.addRequestInterceptor((config) => ({
      ...config,
      headers: { ...config.headers, first: '1' },
    }));
    manager.addRequestInterceptor((config) => ({
      ...config,
      headers: { ...config.headers, second: '2' },
    }));

    const result = await manager.applyRequestInterceptors(baseConfig());

    expect(result.headers).toEqual({ first: '1', second: '2' });
  });

  it('awaits async request interceptors', async () => {
    const manager = new InterceptorManager();
    manager.addRequestInterceptor(async (config) => ({
      ...config,
      headers: { ...config.headers, async: 'yes' },
    }));

    const result = await manager.applyRequestInterceptors(baseConfig());

    expect(result.headers.async).toBe('yes');
  });

  it('applies response interceptors in order', async () => {
    const manager = new InterceptorManager();
    const first = { tag: 'first' } as unknown as Response;
    const second = { tag: 'second' } as unknown as Response;
    manager.addResponseInterceptor(() => first);
    manager.addResponseInterceptor(() => second);

    const result = await manager.applyResponseInterceptors({} as Response);

    expect(result).toBe(second);
  });

  it('applies error interceptors in order', async () => {
    const manager = new InterceptorManager();
    manager.addErrorInterceptor(() => new Error('mapped'));

    const result = await manager.applyErrorInterceptors(new Error('original'));

    expect(result.message).toBe('mapped');
  });

  it('returns numeric ids and skips removed request interceptors', async () => {
    const manager = new InterceptorManager();
    const id = manager.addRequestInterceptor((config) => ({
      ...config,
      headers: { ...config.headers, removed: 'yes' },
    }));
    expect(typeof id).toBe('number');

    manager.removeInterceptor('request', id);
    const result = await manager.applyRequestInterceptors(baseConfig());

    expect(result.headers.removed).toBeUndefined();
  });

  it('skips removed response interceptors', async () => {
    const manager = new InterceptorManager();
    const tagged = { tag: 'kept' } as unknown as Response;
    const id = manager.addResponseInterceptor(() => tagged);
    manager.removeInterceptor('response', id);

    const passthrough = { tag: 'passthrough' } as unknown as Response;
    const result = await manager.applyResponseInterceptors(passthrough);

    expect(result).toBe(passthrough);
  });

  it('skips removed error interceptors', async () => {
    const manager = new InterceptorManager();
    const id = manager.addErrorInterceptor(() => new Error('mapped'));
    manager.removeInterceptor('error', id);

    const result = await manager.applyErrorInterceptors(new Error('original'));

    expect(result.message).toBe('original');
  });

  it('ignores removal of a non-existent interceptor id', () => {
    const manager = new InterceptorManager();
    expect(() => manager.removeInterceptor('request', 99)).not.toThrow();
  });
});
