import { fold, validateCommand } from '../../src/engine/eventSourcingEngine.js';

describe('Event Sourcing Engine (`fold` & `validateCommand`) Unit Tests', () => {
  describe('fold() Pure Function Replay Tests', () => {
    test('returns default initial state when events array is empty', () => {
      const state = fold([]);
      expect(state.status).toBe('NON_EXISTENT');
      expect(state.lastVersion).toBe(0);
      expect(state.eventsCount).toBe(0);
      expect(state.sensorReadings).toEqual([]);
    });

    test('replays single CONTAINER_CREATED event correctly', () => {
      const events = [
        {
          aggregateId: 'CONT-101',
          eventType: 'CONTAINER_CREATED',
          payload: { location: 'Port of Los Angeles', itemCount: 250 },
          version: 1,
          timestamp: '2026-09-12T10:00:00.000Z'
        }
      ];

      const state = fold(events);
      expect(state.aggregateId).toBe('CONT-101');
      expect(state.status).toBe('CREATED');
      expect(state.location).toBe('Port of Los Angeles');
      expect(state.itemCount).toBe(250);
      expect(state.lastVersion).toBe(1);
      expect(state.eventsCount).toBe(1);
    });

    test('replays full lifecycle sequence CONTAINER_CREATED -> LOADED_ON_SHIP -> TEMPERATURE_SPIKE -> ARRIVED_AT_PORT', () => {
      const events = [
        {
          aggregateId: 'CONT-101',
          eventType: 'CONTAINER_CREATED',
          payload: { location: 'Shanghai Port', itemCount: 500 },
          version: 1,
          timestamp: '2026-09-10T08:00:00.000Z'
        },
        {
          aggregateId: 'CONT-101',
          eventType: 'LOADED_ON_SHIP',
          payload: { vessel: 'Evergiven', location: 'At Sea' },
          version: 2,
          timestamp: '2026-09-11T12:00:00.000Z'
        },
        {
          aggregateId: 'CONT-101',
          eventType: 'TEMPERATURE_SPIKE',
          payload: { temperature: 32.5, humidity: 85 },
          version: 3,
          timestamp: '2026-09-11T18:00:00.000Z'
        },
        {
          aggregateId: 'CONT-101',
          eventType: 'ARRIVED_AT_PORT',
          payload: { location: 'Port of Long Beach' },
          version: 4,
          timestamp: '2026-09-12T06:00:00.000Z'
        }
      ];

      const state = fold(events);
      expect(state.aggregateId).toBe('CONT-101');
      expect(state.status).toBe('DELIVERED');
      expect(state.location).toBe('Port of Long Beach');
      expect(state.vessel).toBe('Evergiven');
      expect(state.currentTemperature).toBe(32.5);
      expect(state.hasTemperatureAlert).toBe(true);
      expect(state.sensorReadings.length).toBe(1);
      expect(state.lastVersion).toBe(4);
      expect(state.eventsCount).toBe(4);
    });

    test('handles unknown event types gracefully without crashing or corrupting state', () => {
      const events = [
        {
          aggregateId: 'CONT-202',
          eventType: 'CONTAINER_CREATED',
          payload: { location: 'Hamburg' },
          version: 1,
          timestamp: '2026-09-12T10:00:00.000Z'
        },
        {
          aggregateId: 'CONT-202',
          eventType: 'CUSTOM_LOGISTICS_EVENT_V2',
          payload: { customField: 'test' },
          version: 2,
          timestamp: '2026-09-12T10:30:00.000Z'
        }
      ];

      const state = fold(events);
      expect(state.status).toBe('CREATED');
      expect(state.lastVersion).toBe(2);
      expect(state.eventsCount).toBe(2);
    });
  });

  describe('validateCommand() Business Invariants Tests', () => {
    test('rejects ARRIVED_AT_PORT when current status is not IN_TRANSIT', () => {
      const createdState = { status: 'CREATED' };
      expect(() => {
        validateCommand('ARRIVED_AT_PORT', {}, createdState);
      }).toThrow(/Cannot record ARRIVED_AT_PORT when shipment status is 'CREATED'/);
    });

    test('allows ARRIVED_AT_PORT when status is IN_TRANSIT', () => {
      const inTransitState = { status: 'IN_TRANSIT' };
      expect(() => {
        validateCommand('ARRIVED_AT_PORT', {}, inTransitState);
      }).not.toThrow();
    });

    test('rejects LOADED_ON_SHIP when status is DELIVERED', () => {
      const deliveredState = { status: 'DELIVERED' };
      expect(() => {
        validateCommand('LOADED_ON_SHIP', {}, deliveredState);
      }).toThrow(/Cannot load shipment on ship once it has been DELIVERED/);
    });
  });
});
