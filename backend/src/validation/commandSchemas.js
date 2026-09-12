import { z } from 'zod';

export const createShipmentSchema = z.object({
  aggregateId: z.string().min(1, 'aggregateId is required'),
  location: z.string().optional(),
  itemCount: z.number().int().positive().optional()
});

export const appendEventSchema = z.object({
  eventType: z.string().min(1, 'eventType is required'),
  payload: z.record(z.any()).default({}),
  expectedVersion: z.number().int().nonnegative('expectedVersion must be a non-negative integer')
});

export const moveShipmentSchema = z.object({
  vessel: z.string().optional(),
  location: z.string().optional(),
  expectedVersion: z.number().int().nonnegative('expectedVersion must be a non-negative integer')
});
