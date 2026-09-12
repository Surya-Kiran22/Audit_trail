import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { eventRepository } from '../../src/repository/eventRepository.js';
import { getStateAt } from '../../src/engine/eventSourcingEngine.js';
import { EventModel } from '../../src/models/Event.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await EventModel.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await EventModel.deleteMany({});
});

describe('StateAt Historical Reconstruction Integration Test', () => {
  test('reconstructs state as of intermediate timestamp', async () => {
    const aggregateId = 'HIST-CONT-500';

    const t1 = new Date('2026-09-01T10:00:00Z');
    const t2 = new Date('2026-09-02T12:00:00Z');
    const t3 = new Date('2026-09-03T15:00:00Z');

    await eventRepository.append({
      aggregateId,
      eventType: 'CONTAINER_CREATED',
      payload: { location: 'Singapore Port' },
      version: 1,
      timestamp: t1
    });

    await eventRepository.append({
      aggregateId,
      eventType: 'LOADED_ON_SHIP',
      payload: { vessel: 'Ocean Express' },
      version: 2,
      timestamp: t2
    });

    await eventRepository.append({
      aggregateId,
      eventType: 'ARRIVED_AT_PORT',
      payload: { location: 'Port of Rotterdam' },
      version: 3,
      timestamp: t3
    });

    // Query state at t2 (before arrival at port)
    const stateAtT2 = await getStateAt(aggregateId, t2);
    expect(stateAtT2).toBeDefined();
    expect(stateAtT2.status).toBe('IN_TRANSIT');
    expect(stateAtT2.vessel).toBe('Ocean Express');
    expect(stateAtT2.lastVersion).toBe(2);

    // Query state before t1 -> expect null
    const beforeT1 = new Date('2026-08-31T00:00:00Z');
    const stateBeforeT1 = await getStateAt(aggregateId, beforeT1);
    expect(stateBeforeT1).toBeNull();
  });
});
