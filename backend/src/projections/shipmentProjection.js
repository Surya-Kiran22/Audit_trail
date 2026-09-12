import { ShipmentReadModel } from '../models/ShipmentRead.js';
import { eventRepository } from '../repository/eventRepository.js';
import { fold } from '../engine/eventSourcingEngine.js';

/**
 * ARCHITECTURAL TRADE-OFF NOTE:
 * In this project, `updateProjection` is invoked synchronously right after `appendEvent` completes.
 * In a production distributed system, read-model projections are typically rebuilt asynchronously
 * via MongoDB Change Streams, event buses, or message queues (such as Kafka or RabbitMQ) to decouple
 * command execution latency from read-model updates.
 *
 * Synchronous execution is used here for simplicity and immediate read-after-write consistency in single-node environments.
 */

export async function updateProjection(aggregateId) {
  const events = await eventRepository.findByAggregateId(aggregateId);
  if (!events || events.length === 0) {
    return null;
  }

  const derivedState = fold(events);

  const updatedDoc = await ShipmentReadModel.findOneAndUpdate(
    { aggregateId },
    {
      aggregateId,
      state: derivedState,
      lastVersion: derivedState.lastVersion,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return updatedDoc;
}

export async function getShipmentRead(aggregateId) {
  const projectionDoc = await ShipmentReadModel.findOne({ aggregateId }).exec();
  return projectionDoc ? projectionDoc.state : null;
}
