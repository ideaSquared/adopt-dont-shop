import { createLogger, memorySink } from '@adopt-dont-shop/observability';

import { LOG_FIELDS } from '../../src/logger.js';

// A real gateway logger writing to memory. `events` is the live list of everything logged.
export const makeTestLogger = () => {
  const sink = memorySink();
  return {
    logger: createLogger({ serviceName: 'service.gateway.test', fields: LOG_FIELDS, sink }),
    events: sink.events,
  };
};

export const quietLogger = makeTestLogger().logger;
