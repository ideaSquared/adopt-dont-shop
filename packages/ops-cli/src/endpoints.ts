import type { OpsEnv } from '@adopt-dont-shop/ops-contract';

// Where service.ops is reachable from the laptop, per environment.
export type Endpoint = {
  readonly localPort: number;
  readonly remotePort: number;
  readonly tunnel: boolean;
};

export const ENDPOINTS: Readonly<Record<OpsEnv, Endpoint>> = {
  dev: { localPort: 4100, remotePort: 4100, tunnel: false },
  staging: { localPort: 14101, remotePort: 4101, tunnel: true },
  prod: { localPort: 14102, remotePort: 4102, tunnel: true },
};

export const baseUrlFor = (env: OpsEnv): string => `http://127.0.0.1:${ENDPOINTS[env].localPort}`;
