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

describe('Full End-to-End Audit Trail Ledger Lifecycle Test', () => {
  test('executes 4 sequential lifecycle commands, detects 409 stale command, and verifies projection + timeline + state-at consistency', async () => {
    const aggregateId = 'E2E-CONTAINER-99';

    // Step 1: Create Container (v1)
    const step1 = await request(app)
      .post('/api/commands/shipment')
      .send({ aggregateId, location: 'Port of Los Angeles', itemCount: 300 });
    expect(step1.status).toBe(202);
    expect(step1.body.version).toBe(1);

    // Step 2: Load on Ship via typed /move endpoint (v2)
    const step2 = await request(app)
      .post(`/api/commands/shipment/${aggregateId}/move`)
      .send({ vessel: 'Pacific Voyager', location: 'Pacific Ocean', expectedVersion: 1 });
    expect(step2.status).toBe(202);
    expect(step2.body.version).toBe(2);

    // Step 3: Record Temperature Spike via generic /event endpoint (v3)
    const tempSpikeTimestamp = new Date('2026-09-12T14:30:00Z').toISOString();
    const step3 = await request(app)
      .post(`/api/commands/shipment/${aggregateId}/event`)
      .send({
        eventType: 'TEMPERATURE_SPIKE',
        payload: { temperature: 34.2, humidity: 88 },
        expectedVersion: 2
      });
    expect(step3.status).toBe(202);
    expect(step3.body.version).toBe(3);

    // Step 4: Arrive at Port (v4)
    const step4 = await request(app)
      .post(`/api/commands/shipment/${aggregateId}/event`)
      .send({
        eventType: 'ARRIVED_AT_PORT',
        payload: { location: 'Port of Yokohama' },
        expectedVersion: 3
      });
    expect(step4.status).toBe(202);
    expect(step4.body.version).toBe(4);

    // Step 5: Stale version attempt (expectedVersion 2 when current is 4) -> Expect 409 Conflict
    const staleAttempt = await request(app)
      .post(`/api/commands/shipment/${aggregateId}/event`)
      .send({
        eventType: 'SENSOR_READING',
        payload: { temperature: 20 },
        expectedVersion: 2
      });
    expect(staleAttempt.status).toBe(409);
    expect(staleAttempt.body.error).toBe('ConcurrencyConflict');

    // Step 6: Query Projection (Current State)
    const projectionRes = await request(app).get(`/api/queries/shipment/${aggregateId}`);
    expect(projectionRes.status).toBe(200);
    expect(projectionRes.body.state.status).toBe('DELIVERED');
    expect(projectionRes.body.state.location).toBe('Port of Yokohama');
    expect(projectionRes.body.state.vessel).toBe('Pacific Voyager');
    expect(projectionRes.body.state.currentTemperature).toBe(34.2);
    expect(projectionRes.body.state.lastVersion).toBe(4);

    // Step 7: Query Timeline (Raw Event Store)
    const timelineRes = await request(app).get(`/api/queries/shipment/${aggregateId}/timeline`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.count).toBe(4);
    expect(timelineRes.body.events[0].eventType).toBe('CONTAINER_CREATED');
    expect(timelineRes.body.events[1].eventType).toBe('LOADED_ON_SHIP');
    expect(timelineRes.body.events[2].eventType).toBe('TEMPERATURE_SPIKE');
    expect(timelineRes.body.events[3].eventType).toBe('ARRIVED_AT_PORT');

    // Step 8: Query Historical State-At (Replayed up to step 3 timestamp)
    const stateAtRes = await request(app).get(
      `/api/queries/shipment/${aggregateId}/state-at?timestamp=${encodeURIComponent(step3.body.timestamp)}`
    );
    expect(stateAtRes.status).toBe(200);
    expect(stateAtRes.body.state.status).toBe('IN_TRANSIT'); // before arrival at port
    expect(stateAtRes.body.state.currentTemperature).toBe(34.2);
    expect(stateAtRes.body.state.lastVersion).toBe(3);
  });
});
