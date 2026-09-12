import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { appendEvent } from '../../src/engine/eventSourcingEngine.js';
import { getShipmentRead } from '../../src/projections/shipmentProjection.js';
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

describe('Projection Read-Model Integration Test', () => {
  test('updates shipment_reads projection synchronously on appendEvent', async () => {
    const aggregateId = 'PROJ-TEST-100';

    await appendEvent(aggregateId, 'CONTAINER_CREATED', { location: 'Tokyo Port' }, 0);
    let state = await getShipmentRead(aggregateId);
    expect(state).toBeDefined();
    expect(state.status).toBe('CREATED');
    expect(state.lastVersion).toBe(1);

    await appendEvent(aggregateId, 'LOADED_ON_SHIP', { vessel: 'Nippon Maru' }, 1);
    state = await getShipmentRead(aggregateId);
    expect(state.status).toBe('IN_TRANSIT');
    expect(state.vessel).toBe('Nippon Maru');
    expect(state.lastVersion).toBe(2);
  });
});
