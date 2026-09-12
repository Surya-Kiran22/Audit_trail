import { EventModel } from '../models/Event.js';

/**
 * EventRepository — Thin, append-only repository wrapper over EventModel.
 *
 * Immutability Guarantee:
 * This repository intentionally exposes ONLY `append()` and `findByAggregateId()`.
 * It DOES NOT provide update, updateOne, updateMany, delete, deleteOne, or deleteMany methods.
 * This guarantees at the code level that stored events cannot be updated or deleted.
 */

export const eventRepository = Object.freeze({
  /**
   * Appends a new immutable event to the Event Store.
   * @param {Object} eventData - { aggregateId, eventType, payload, version, timestamp }
   * @returns {Promise<Object>} Created Event document
   */
  async append(eventData) {
    const event = new EventModel(eventData);
    return await event.save();
  },

  /**
   * Fetches all events for a given aggregateId ordered monotonically by version ascending.
   * @param {string} aggregateId
   * @returns {Promise<Array>} List of event documents
   */
  async findByAggregateId(aggregateId) {
    return await EventModel.find({ aggregateId }).sort({ version: 1 }).exec();
  },

  /**
   * Fetches events for an aggregate up to a given timestamp.
   * @param {string} aggregateId
   * @param {Date|string} targetTimestamp
   * @returns {Promise<Array>} List of event documents
   */
  async findByAggregateIdUntilTimestamp(aggregateId, targetTimestamp) {
    const cutoff = new Date(targetTimestamp);
    return await EventModel.find({
      aggregateId,
      timestamp: { $lte: cutoff }
    })
      .sort({ version: 1 })
      .exec();
  },

  /**
   * Returns the highest version number recorded for an aggregateId, or 0 if none exist.
   * @param {string} aggregateId
   * @returns {Promise<number>} Max version
   */
  async getLatestVersion(aggregateId) {
    const latestEvent = await EventModel.findOne({ aggregateId })
      .sort({ version: -1 })
      .exec();
    return latestEvent ? latestEvent.version : 0;
  }
});
