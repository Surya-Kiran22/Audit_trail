import { createShipmentSchema, appendEventSchema, moveShipmentSchema } from '../../src/validation/commandSchemas.js';

describe('Zod Command Schemas Unit Test', () => {
  test('createShipmentSchema validates aggregateId', () => {
    expect(() => createShipmentSchema.parse({})).toThrow();
    expect(createShipmentSchema.parse({ aggregateId: 'CONT-1' })).toEqual({ aggregateId: 'CONT-1' });
  });

  test('appendEventSchema validates eventType, payload, and expectedVersion', () => {
    expect(() => appendEventSchema.parse({ eventType: 'TEST' })).toThrow(); // missing expectedVersion
    expect(() => appendEventSchema.parse({ eventType: 'TEST', expectedVersion: -1 })).toThrow(); // negative version

    const valid = appendEventSchema.parse({
      eventType: 'TEMPERATURE_SPIKE',
      payload: { temp: 30 },
      expectedVersion: 2
    });
    expect(valid.eventType).toBe('TEMPERATURE_SPIKE');
    expect(valid.expectedVersion).toBe(2);
  });

  test('moveShipmentSchema validates expectedVersion', () => {
    expect(() => moveShipmentSchema.parse({ vessel: 'Ship' })).toThrow();
    expect(moveShipmentSchema.parse({ vessel: 'Ship', expectedVersion: 0 })).toEqual({
      vessel: 'Ship',
      expectedVersion: 0
    });
  });
});
