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
import { Counter } from 'prom-client';

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
