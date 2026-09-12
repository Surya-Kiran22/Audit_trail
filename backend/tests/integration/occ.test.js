import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import { EventModel } from '../../src/models/Event.js';
import { ShipmentReadModel } from '../../src/models/ShipmentRead.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await EventModel.init();
  await ShipmentReadModel.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await EventModel.deleteMany({});
  await ShipmentReadModel.deleteMany({});
});

describe('Optimistic Concurrency Control (OCC) Integration Test', () => {
  test('rejects stale command with 409 Conflict when expectedVersion mismatch occurs', async () => {
    const aggregateId = 'OCC-CONT-700';

    // 1. Create container (v1)
    const createRes = await request(app)
      .post('/api/commands/shipment')
      .send({ aggregateId, location: 'Port of Hamburg' });
    expect(createRes.status).toBe(202);
    expect(createRes.body.version).toBe(1);

    // 2. Append event with expectedVersion = 1 -> succeeds (v2)
    const moveRes = await request(app)
      .post(`/api/commands/shipment/${aggregateId}/move`)
      .send({ vessel: 'Elbe Express', expectedVersion: 1 });
    expect(moveRes.status).toBe(202);
    expect(moveRes.body.version).toBe(2);

    // 3. Attempt command with stale expectedVersion = 1 (current is 2) -> Expect 409 Conflict
    const staleRes = await request(app)
      .post(`/api/commands/shipment/${aggregateId}/event`)
      .send({
        eventType: 'TEMPERATURE_SPIKE',
        payload: { temperature: 30 },
        expectedVersion: 1
      });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error).toBe('ConcurrencyConflict');
    expect(staleRes.body.currentVersion).toBe(2);
    expect(staleRes.body.expectedVersion).toBe(1);
  });
});
