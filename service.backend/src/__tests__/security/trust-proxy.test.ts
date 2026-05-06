import express from 'express';
import request from 'supertest';

describe('Trust proxy configuration', () => {
  it('resolves req.ip from X-Forwarded-For when trust proxy is set to 1', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));

    const response = await request(app).get('/ip').set('X-Forwarded-For', '203.0.113.42');

    expect(response.status).toBe(200);
    expect(response.body.ip).toBe('203.0.113.42');
  });

  it('ignores X-Forwarded-For when trust proxy is not set (regression guard)', async () => {
    const app = express();
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));

    const response = await request(app).get('/ip').set('X-Forwarded-For', '203.0.113.42');

    expect(response.status).toBe(200);
    expect(response.body.ip).not.toBe('203.0.113.42');
  });
});
