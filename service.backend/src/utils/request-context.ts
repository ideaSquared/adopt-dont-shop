import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request-scoped context. Lets Sequelize hooks (and any deeply-nested code
 * path) read the authenticated user without threading the value through
 * every function signature.
 *
 * The pattern:
 *   - Auth middleware calls setUserId(req.user.userId) once auth resolves.
 *   - Model beforeCreate / beforeUpdate hooks read getUserId() and stamp
 *     created_by / updated_by.
 *   - Outside a request (cron jobs, seeders, tests) the store is empty and
 *     hooks fall through to null. The columns are nullable on purpose.
 *
 * ADS-405: also carries the correlation ID that the request-context
 * middleware generates (or reads from `X-Correlation-ID` / `X-Request-ID`)
 * so every downstream `logger.*` call can stamp the same ID without
 * threading it through every function signature.
 */
type RequestContextStore = {
  userId?: string;
  correlationId?: string;
  /**
   * W3C `traceparent` header value carried through the request lifetime.
   * ADS-660: makes the existing correlation-id stack interoperable with
   * OpenTelemetry collectors without yet pulling in the full sdk-node.
   */
  traceparent?: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Establish a fresh context and run the callback inside it. Express
 * middleware uses this for every request; tests/jobs can use it to simulate
 * an actor.
 */
export const runWithContext = <T>(store: RequestContextStore, fn: () => T): T =>
  storage.run(store, fn);

export const getUserId = (): string | undefined => storage.getStore()?.userId;

/**
 * Mutate the current context. Used by the auth middleware to set userId
 * once auth has resolved (the request-context middleware runs first to
 * establish the empty store; auth fills it in).
 */
export const setUserId = (userId: string): void => {
  const store = storage.getStore();
  if (store) {
    store.userId = userId;
  }
};

/** ADS-405: read the correlation ID for the current request, if any. */
export const getCorrelationId = (): string | undefined => storage.getStore()?.correlationId;

/** ADS-405: set the correlation ID for the current request. */
export const setCorrelationId = (correlationId: string): void => {
  const store = storage.getStore();
  if (store) {
    store.correlationId = correlationId;
  }
};

/**
 * ADS-660: W3C traceparent helpers. Parse / mint / read the traceparent
 * header so the existing correlation-id middleware can propagate trace
 * context across services in a format OpenTelemetry collectors recognise.
 * The full SDK (sdk-node + auto-instrumentation) is still pending; this
 * is the wire-format scaffold so callers don't need to change later.
 */
const TRACEPARENT_VERSION = '00';

/** Read the traceparent for the current request, if any. */
export const getTraceparent = (): string | undefined => storage.getStore()?.traceparent;

/** Set the traceparent for the current request. */
export const setTraceparent = (traceparent: string): void => {
  const store = storage.getStore();
  if (store) {
    store.traceparent = traceparent;
  }
};

/**
 * Validate a candidate traceparent against the W3C trace context spec:
 * `<version>-<32-hex trace-id>-<16-hex span-id>-<2-hex flags>` with all
 * fields hex and the trace/span ids non-zero.
 */
export const isValidTraceparent = (value: string): boolean => {
  const match = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const [, , traceId, spanId] = match;
  if (traceId === '0'.repeat(32)) {
    return false;
  }
  if (spanId === '0'.repeat(16)) {
    return false;
  }
  return true;
};

/**
 * Mint a fresh traceparent using a 32-char trace-id and 16-char span-id.
 * `randomHex` is injected so callers can use either node:crypto or a test
 * shim without this module depending on either.
 */
export const mintTraceparent = (randomHex: (bytes: number) => string): string => {
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  // Sampled flag (01) — sampling decisions are made by the exporter.
  return `${TRACEPARENT_VERSION}-${traceId}-${spanId}-01`;
};
