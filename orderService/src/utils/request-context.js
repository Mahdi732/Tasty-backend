import { v4 as uuidv4 } from 'uuid';

export const buildEventHeaders = (req = {}) => ({
  eventId: uuidv4(),
  correlationId: req.requestId || uuidv4(),
  causationId: req.requestId || null,
  occurredAt: new Date().toISOString(),
});

