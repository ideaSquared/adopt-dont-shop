// Shared Prometheus counter for WebSocket eviction (ADS-1036): every forced
// eviction — a session/token revocation event (auth-subscriber.ts) or a
// failed periodic revalidation call (defence-in-depth, socket-server.ts) —
// increments this, labeled by `reason`, so the eviction path is observable
// in ops rather than a silent no-op.
//
// NOTE — the two callers increment at different granularity, so this counts
// EVICTION ACTIONS, not sockets disconnected:
//   - auth-subscriber.ts increments ONCE per revocation event, after
//     `io.in(userId).disconnectSockets(true)` — that one room-broadcast call
//     may close anywhere from zero (user has no live sockets) to several
//     sockets (multiple tabs/devices) across every replica, but the actual
//     count isn't cleanly available from the room-based API, so it isn't
//     counted per-socket here.
//   - socket-server.ts's periodic revalidation increments ONCE PER SOCKET,
//     since each socket runs its own revalidation loop and disconnects
//     itself individually.
// Read the `reason` label to distinguish which path fired; don't read the
// raw total as "N sockets disconnected".
//
// Lazily created and registry-change-aware — mirrors the handshake-reject
// counter pattern in socket-server.ts — so repeated attachSocketServer /
// registerAuthSubscribers calls in Vitest suites don't throw "metric already
// registered".

import { getMetricsRegistry } from '@adopt-dont-shop/observability';
import { Counter, Gauge } from 'prom-client';

let _entry: { registryRef: object; counter: Counter } | null = null;

export const getRevocationDisconnectsCounter = (): Counter => {
  const reg = getMetricsRegistry();
  if (_entry && _entry.registryRef === reg) {
    return _entry.counter;
  }
  const counter = new Counter({
    name: 'gateway_ws_revocation_disconnects_total',
    help: 'Total WebSocket eviction actions triggered by session/token revocation (one per event, which may cover multiple sockets) or by a failed periodic revalidation call (one per socket) (ADS-1036).',
    labelNames: ['reason'],
    registers: [reg],
  });
  _entry = { registryRef: reg, counter };
  return counter;
};

// Connection-state SIGNAL for the Socket.IO Redis adapter's pub/sub pair
// (ADS-1251). The adapter (ADS-818) fans WebSocket delivery out across
// replicas via Redis pub/sub; if that Redis is unreachable, cross-replica
// delivery silently degrades while HTTP and single-replica WS keep working.
// The gateway readiness probe (server.ts) deliberately excludes Redis so a
// degraded-tolerant blip does NOT pull the gateway out of rotation — so this
// health surfaces on /metrics for alerting instead of 503-ing the pod. 1 =
// connected/ready, 0 = down; labelled by `client` (pub | sub) since they are
// separate ioredis connections. Lazily created + registry-change-aware, the
// same pattern as the counter above, so repeated wiring in Vitest suites
// doesn't throw "metric already registered".
let _adapterGaugeEntry: { registryRef: object; gauge: Gauge } | null = null;

export const getSocketAdapterRedisUpGauge = (): Gauge => {
  const reg = getMetricsRegistry();
  if (_adapterGaugeEntry && _adapterGaugeEntry.registryRef === reg) {
    return _adapterGaugeEntry.gauge;
  }
  const gauge = new Gauge({
    name: 'gateway_ws_redis_adapter_up',
    help: 'Socket.IO Redis adapter pub/sub connection state (1 = connected, 0 = down). A cross-replica WebSocket fan-out health signal, not a readiness gate (ADS-1251).',
    labelNames: ['client'],
    registers: [reg],
  });
  _adapterGaugeEntry = { registryRef: reg, gauge };
  return gauge;
};

// The slim ioredis surface trackSocketAdapterRedis observes: the connection is
// an EventEmitter and exposes a `status` string. Structural so this module
// needs no ioredis type dependency and a tiny EventEmitter stub satisfies it
// in tests.
export type RedisConnectionEvents = {
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
  status?: string;
};

// Wire one adapter Redis connection's lifecycle to the up/down gauge for its
// `client` label. Seeds from the current `status` (a client constructed with
// lazyConnect:false may already be 'ready' by the time we wire it), then
// follows the connection: 'ready' → 1; 'close'/'end' → 0. ioredis
// auto-reconnects, so a blip emits 'close' (→0) followed by 'ready' (→1),
// which is exactly the recover-signal an alert wants to see clear. 'error' is
// intentionally not wired — ioredis keeps retrying through errors, so it does
// not by itself mean the connection is down.
export const trackSocketAdapterRedis = (
  client: RedisConnectionEvents,
  label: 'pub' | 'sub'
): void => {
  const gauge = getSocketAdapterRedisUpGauge();
  gauge.set({ client: label }, client.status === 'ready' ? 1 : 0);
  client.on('ready', () => gauge.set({ client: label }, 1));
  client.on('close', () => gauge.set({ client: label }, 0));
  client.on('end', () => gauge.set({ client: label }, 0));
};
