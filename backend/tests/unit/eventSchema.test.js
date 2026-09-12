import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EventModel } from '../../src/models/Event.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await EventModel.init(); // ensure indexes are created
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await EventModel.deleteMany({});
});

describe('Event Schema & Compound Unique Index Unit Test', () => {
  test('rejects event creation missing required fields', async () => {
    const invalidEvent = new EventModel({
      aggregateId: 'CONT-101'
      // missing eventType, payload, version
    });

    let err;
    try {
      await invalidEvent.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.name).toBe('ValidationError');
    expect(err.errors.eventType).toBeDefined();
    expect(err.errors.payload).toBeDefined();
    expect(err.errors.version).toBeDefined();
  });

  test('successfully saves valid event with auto-generated timestamp', async () => {
    const validEvent = new EventModel({
      aggregateId: 'CONT-101',
      eventType: 'CONTAINER_CREATED',
      payload: { location: 'Port of Los Angeles' },
      version: 1
    });

    const saved = await validEvent.save();
    expect(saved._id).toBeDefined();
    expect(saved.aggregateId).toBe('CONT-101');
    expect(saved.version).toBe(1);
    expect(saved.timestamp).toBeInstanceOf(Date);
  });

  test('enforces compound unique index on { aggregateId, version }', async () => {
    await EventModel.create({
      aggregateId: 'CONT-102',
      eventType: 'CONTAINER_CREATED',
      payload: { location: 'Shanghai' },
      version: 1
    });

    let duplicateErr;
    try {
      await EventModel.create({
        aggregateId: 'CONT-102',
        eventType: 'LOADED_ON_SHIP',
        payload: { vessel: 'Evergiven' },
        version: 1 // duplicate version for same aggregateId!
      });
    } catch (error) {
      duplicateErr = error;
    }

    expect(duplicateErr).toBeDefined();
    expect(duplicateErr.code).toBe(11000); // MongoDB duplicate key error code
  });

  test('allows same version for DIFFERENT aggregateIds', async () => {
    const event1 = await EventModel.create({
      aggregateId: 'CONT-201',
      eventType: 'CONTAINER_CREATED',
      payload: { location: 'Hamburg' },
      version: 1
    });

    const event2 = await EventModel.create({
      aggregateId: 'CONT-202',
      eventType: 'CONTAINER_CREATED',
      payload: { location: 'Rotterdam' },
      version: 1
    });

    expect(event1.version).toBe(1);
    expect(event2.version).toBe(1);
  });
});
