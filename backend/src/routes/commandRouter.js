import { Router } from 'express';
import { createShipmentSchema, appendEventSchema, moveShipmentSchema } from '../validation/commandSchemas.js';
import { appendEvent } from '../engine/eventSourcingEngine.js';

const commandRouter = Router();

/**
 * POST /api/commands/shipment
 * Creates a new shipment / container aggregate (`CONTAINER_CREATED` event at version 1).
 */
commandRouter.post('/shipment', async (req, res, next) => {
  try {
    const validatedData = createShipmentSchema.parse(req.body);
    const { aggregateId, location, itemCount } = validatedData;

    const event = await appendEvent(
      aggregateId,
      'CONTAINER_CREATED',
      {
        location: location || 'Origin Port',
        itemCount: itemCount || 100
      },
      0 // expected version for a new aggregate is 0
    );

    return res.status(202).json({
      status: 'Accepted',
      message: `Container '${aggregateId}' created successfully.`,
      eventId: event._id,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      version: event.version,
      timestamp: event.timestamp
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/commands/shipment/:id/event
 * Generic append endpoint for any event type (e.g. LOADED_ON_SHIP, TEMPERATURE_SPIKE, ARRIVED_AT_PORT).
 */
commandRouter.post('/shipment/:id/event', async (req, res, next) => {
  try {
    const aggregateId = req.params.id;
    const validatedData = appendEventSchema.parse(req.body);
    const { eventType, payload, expectedVersion } = validatedData;

    const event = await appendEvent(aggregateId, eventType, payload, expectedVersion);

    return res.status(202).json({
      status: 'Accepted',
      message: `Event '${eventType}' appended to aggregate '${aggregateId}'.`,
      eventId: event._id,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      version: event.version,
      timestamp: event.timestamp
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/commands/shipment/:id/move
 * Typed command route appending `LOADED_ON_SHIP` event.
 */
commandRouter.post('/shipment/:id/move', async (req, res, next) => {
  try {
    const aggregateId = req.params.id;
    const validatedData = moveShipmentSchema.parse(req.body);
    const { vessel, location, expectedVersion } = validatedData;

    const event = await appendEvent(
      aggregateId,
      'LOADED_ON_SHIP',
      {
        vessel: vessel || 'Cargo Ship Transporter',
        location: location || 'At Sea'
      },
      expectedVersion
    );

    return res.status(202).json({
      status: 'Accepted',
      message: `Shipment '${aggregateId}' moved/loaded on ship successfully.`,
      eventId: event._id,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      version: event.version,
      timestamp: event.timestamp
    });
  } catch (error) {
    next(error);
  }
});

export default commandRouter;
