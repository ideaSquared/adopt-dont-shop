import { createLogger, memorySink } from '@adopt-dont-shop/observability';
import { describe, expect, it } from 'vitest';

import { LOG_FIELDS } from './logger.js';

describe('LOG_FIELDS', () => {
  it('declares no field that holds personal data or a secret', () => {
    expect(() =>
      createLogger({ serviceName: 'test', fields: LOG_FIELDS, sink: memorySink() })
    ).not.toThrow();
  });
});
