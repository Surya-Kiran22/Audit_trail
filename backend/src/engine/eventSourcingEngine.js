import { eventRepository } from '../repository/eventRepository.js';
import { updateProjection } from '../projections/shipmentProjection.js';

/**
 * ConcurrencyError custom class for OCC violations
 */
export class ConcurrencyError extends Error {
  constructor(message, currentVersion, expectedVersion) {
    super(message);
    this.name = 'ConcurrencyError';
    this.code = 'ConcurrencyConflict';
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
  }
}

/**
 * pure function fold(events)
 * Takes an ordered array of events (sorted by version ascending) and reduces them into a derived state object.
 * Pure function with zero side-effects or I/O.
 *
 * @param {Array} events
 * @returns {Object} Derived current state
 */
export function fold(events = []) {
  const initialState = {
    aggregateId: null,
    status: 'NON_EXISTENT',
    location: null,
    vessel: null,
    currentTemperature: null,
    sensorReadings: [],
    itemCount: 0,
    lastVersion: 0,
    lastUpdated: null,
    eventsCount: 0
  };

  if (!Array.isArray(events) || events.length === 0) {
    return initialState;
  }

  return events.reduce((state, evt) => {
    if (!evt || !evt.eventType) return state;

    const payload = evt.payload || {};
    const newState = { ...state };

    newState.aggregateId = evt.aggregateId || newState.aggregateId;
    newState.lastVersion = evt.version;
    newState.lastUpdated = evt.timestamp;
    newState.eventsCount = (newState.eventsCount || 0) + 1;

    switch (evt.eventType) {
      case 'CONTAINER_CREATED':
        newState.status = 'CREATED';
        newState.location = payload.location || 'Origin Warehouse';
        newState.itemCount = payload.itemCount !== undefined ? payload.itemCount : 100;
        break;

      case 'LOADED_ON_SHIP':
        newState.status = 'IN_TRANSIT';
        newState.vessel = payload.vessel || payload.location || 'Cargo Vessel';
        newState.location = payload.location || `Onboard ${newState.vessel}`;
        break;

      case 'TEMPERATURE_SPIKE':
      case 'SENSOR_READING':
        if (payload.temperature !== undefined) {
          newState.currentTemperature = payload.temperature;
          newState.sensorReadings = [
            ...newState.sensorReadings,
            {
              timestamp: evt.timestamp,
              temperature: payload.temperature,
              humidity: payload.humidity,
              version: evt.version
            }
          ];
        }
        if (evt.eventType === 'TEMPERATURE_SPIKE') {
          newState.hasTemperatureAlert = true;
        }
        break;

      case 'ARRIVED_AT_PORT':
        newState.status = 'DELIVERED';
        newState.location = payload.location || payload.port || 'Destination Port';
        break;

      case 'INSPECTED':
        newState.lastInspectionResult = payload.result || 'PASSED';
        newState.inspectorId = payload.inspectorId || 'OFFICER-1';
        break;

      default:
        // Unknown or custom event types preserve state and update metadata safely
        console.warn(`[fold] Unknown event type encountered: ${evt.eventType}`);
        break;
    }

    return newState;
  }, initialState);
}

/**
 * Validates domain business invariants before appending an event.
 * @param {string} eventType
 * @param {Object} payload
 * @param {Object} currentState
 */
export function validateCommand(eventType, payload, currentState) {
  if (eventType === 'ARRIVED_AT_PORT') {
    if (currentState.status !== 'IN_TRANSIT') {
      const err = new Error(`Cannot record ARRIVED_AT_PORT when shipment status is '${currentState.status}'. Shipment must be IN_TRANSIT.`);
      err.status = 400;
      err.name = 'BadRequestError';
      throw err;
    }
  }

  if (eventType === 'LOADED_ON_SHIP') {
    if (currentState.status === 'DELIVERED') {
      const err = new Error(`Cannot load shipment on ship once it has been DELIVERED.`);
      err.status = 400;
      err.name = 'BadRequestError';
      throw err;
    }
  }
}

/**
 * Appends a new event enforcing Optimistic Concurrency Control (OCC).
 * Reads latest version, checks against expectedVersion, appends at expectedVersion + 1,
 * then triggers synchronous read-model projection update.
 *
 * @param {string} aggregateId
 * @param {string} eventType
 * @param {Object} payload
 * @param {number} expectedVersion
 * @returns {Promise<Object>} Created Event document
 */
export async function appendEvent(aggregateId, eventType, payload, expectedVersion) {
  // Fast-fail pre-check: read latest version from event store
  const latestVersion = await eventRepository.getLatestVersion(aggregateId);

  if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== latestVersion) {
    throw new ConcurrencyError(
      `Concurrency Conflict: aggregate '${aggregateId}' is at version ${latestVersion}, but expected version was ${expectedVersion}.`,
      latestVersion,
      expectedVersion
    );
  }

  const nextVersion = latestVersion + 1;

  // Validate business rules against current derived state
  const existingEvents = await eventRepository.findByAggregateId(aggregateId);
  const currentState = fold(existingEvents);
  validateCommand(eventType, payload, currentState);

  let newEvent;
  try {
    newEvent = await eventRepository.append({
      aggregateId,
      eventType,
      payload,
      version: nextVersion,
      timestamp: new Date()
    });
  } catch (error) {
    // Catch compound unique index collision in case of concurrent execution race condition
    if (error.code === 11000) {
      throw new ConcurrencyError(
        `Concurrency Conflict: unique index collision on aggregate '${aggregateId}' version ${nextVersion}.`,
        latestVersion,
        expectedVersion
      );
    }
    throw error;
  }

  // Update read-model projection synchronously right after successful event append
  try {
    await updateProjection(aggregateId);
  } catch (projErr) {
    console.error(`Projection update warning for aggregate ${aggregateId}:`, projErr);
  }

  return newEvent;
}

/**
 * Reconstructs historical aggregate state as of a specified timestamp by replaying raw events.
 *
 * @param {string} aggregateId
 * @param {Date|string} targetTimestamp
 * @returns {Promise<Object|null>} Historical derived state or null if aggregate has no events before timestamp
 */
export async function getStateAt(aggregateId, targetTimestamp) {
  const events = await eventRepository.findByAggregateIdUntilTimestamp(aggregateId, targetTimestamp);
  if (!events || events.length === 0) {
    return null;
  }
  return fold(events);
}
