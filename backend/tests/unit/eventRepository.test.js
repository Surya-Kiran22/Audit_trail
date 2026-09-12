import { eventRepository } from '../../src/repository/eventRepository.js';

describe('EventRepository Immutability & API Surface Unit Test', () => {
  test('eventRepository MUST be frozen', () => {
    expect(Object.isFrozen(eventRepository)).toBe(true);
  });

  test('eventRepository MUST expose append and read methods', () => {
    expect(typeof eventRepository.append).toBe('function');
    expect(typeof eventRepository.findByAggregateId).toBe('function');
    expect(typeof eventRepository.findByAggregateIdUntilTimestamp).toBe('function');
    expect(typeof eventRepository.getLatestVersion).toBe('function');
  });

  test('eventRepository MUST NOT expose any mutating methods (update, delete)', () => {
    expect(eventRepository.update).toBeUndefined();
    expect(eventRepository.updateOne).toBeUndefined();
    expect(eventRepository.updateMany).toBeUndefined();
    expect(eventRepository.delete).toBeUndefined();
    expect(eventRepository.deleteOne).toBeUndefined();
    expect(eventRepository.deleteMany).toBeUndefined();
    expect(eventRepository.findByIdAndUpdate).toBeUndefined();
    expect(eventRepository.findByIdAndDelete).toBeUndefined();
  });
});
