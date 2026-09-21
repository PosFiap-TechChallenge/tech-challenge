import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { container } from '../../di/Container.ts';
import { createApp } from '../../server/app.ts';

describe('HealthController', () => {
  it('responde 200 em GET /health sem depender do PostgreSQL', async () => {
    const app = createApp(container);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(response.body.uptimeInSeconds).toBeGreaterThanOrEqual(0);
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('responde 404 para rota inexistente', async () => {
    const app = createApp(container);

    const response = await request(app).get('/rota-que-nao-existe');

    expect(response.status).toBe(404);
  });
});
