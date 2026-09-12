import { Router } from 'express';
import { getShipmentRead } from '../projections/shipmentProjection.js';
import { eventRepository } from '../repository/eventRepository.js';
import { getStateAt } from '../engine/eventSourcingEngine.js';

const queryRouter = Router();

/**
 * GET /api/queries/shipment/:id
 * Fast path: returns current projected state from shipment_reads collection.
 */
queryRouter.get('/shipment/:id', async (req, res, next) => {
  try {
    const aggregateId = req.params.id;
    const currentState = await getShipmentRead(aggregateId);

    if (!currentState) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Shipment projection for ID '${aggregateId}' not found.`
      });
    }

    return res.json({
      aggregateId,
      state: currentState,
      lastVersion: currentState.lastVersion
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/queries/shipment/:id/timeline
 * Replays raw event stream directly from the Event Store for timeline presentation.
 */
queryRouter.get('/shipment/:id/timeline', async (req, res, next) => {
  try {
    const aggregateId = req.params.id;
    const events = await eventRepository.findByAggregateId(aggregateId);

    if (!events || events.length === 0) {
      return res.status(404).json({
        error: 'NotFound',
        message: `No event history found for shipment ID '${aggregateId}'.`
      });
    }

    return res.json({
      aggregateId,
      events,
      count: events.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/queries/shipment/:id/state-at?timestamp=ISO_STRING
 * Reconstructs historical state as of a given timestamp by replaying event store raw events.
 */
queryRouter.get('/shipment/:id/state-at', async (req, res, next) => {
  try {
    const aggregateId = req.params.id;
    const timestampQuery = req.query.timestamp;

    if (!timestampQuery) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Query parameter "timestamp" is required (e.g. ?timestamp=2026-09-12T10:00:00Z).'
      });
    }

    const historicalState = await getStateAt(aggregateId, timestampQuery);

    if (!historicalState || historicalState.status === 'NON_EXISTENT') {
      return res.status(404).json({
        error: 'NotFound',
        message: `No events recorded for aggregate '${aggregateId}' on or before timestamp '${timestampQuery}'.`
      });
    }

    return res.json({
      aggregateId,
      timestamp: timestampQuery,
      state: historicalState
    });
  } catch (error) {
    next(error);
  }
});

export default queryRouter;
