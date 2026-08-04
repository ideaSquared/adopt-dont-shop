// Shared Prometheus counter for WebSocket eviction (ADS-1036): every socket
// force-disconnected because its session/token was revoked (event-driven,
// auth-subscriber.ts) or its periodic revalidation call failed
// (defence-in-depth, socket-server.ts) increments this, labeled by `reason`,
// so the eviction path is observable in ops rather than a silent no-op.
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
    help: 'Total Socket.IO connections force-disconnected due to session/token revocation or failed periodic revalidation (ADS-1036).',
    labelNames: ['reason'],
    registers: [reg],
  });
  _entry = { registryRef: reg, counter };
  return counter;
};
