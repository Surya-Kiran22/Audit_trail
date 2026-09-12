import request from 'supertest';
import app from '../../src/app.js';

describe('Backend Health & CORS Integration Test', () => {
  test('GET /health returns 200 OK with status and CORS header', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});
