import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../index';

describe('Health endpoints', () => {
  it('GET /health/simple returns 200 ok', async () => {
    const res = await request(app).get('/health/simple');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(typeof res.body.data.uptime).toBe('number');
  });
});

describe('Items endpoint', () => {
  it('GET /api/v1/items returns processed item from ExampleService', async () => {
    const res = await request(app).get('/api/v1/items');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      original: 'sample-item',
      processed: 'SAMPLE-ITEM',
    });
  });
});

describe('Error handling', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Route not found');
  });
});
