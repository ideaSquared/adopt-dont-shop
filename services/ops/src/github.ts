import { z } from 'zod';

import { OpsError } from './errors.js';

// GitHub OAuth device flow plus the team-membership check. `fetch` is injected
// so tests never touch the network. The GitHub access token only ever lives in
// local variables inside `completeDeviceLogin`: it is used for the two lookups
// and then dropped — never stored, never logged, never returned.

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
// read:org lets the member's own token read their team membership.
const SCOPE = 'read:org';

const DeviceCodeSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.url(),
  expires_in: z.number().int().positive(),
  interval: z.number().int().positive(),
});

const TokenResponseSchema = z.union([
  z.object({ access_token: z.string().min(1) }),
  z.object({ error: z.string(), interval: z.number().int().positive().optional() }),
]);

const UserSchema = z.object({
  login: z.string().min(1),
  id: z.number().int(),
  name: z.string().nullable().optional(),
});

const MembershipSchema = z.object({ state: z.string() });

export type DeviceCode = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
};

export type GithubIdentity = { login: string; githubId: number; name: string | null };

export type DevicePollResult =
  | { status: 'pending' }
  | { status: 'slow_down'; interval: number }
  | { status: 'expired' }
  | { status: 'denied'; reason: string }
  | { status: 'ok'; identity: GithubIdentity };

export type GithubClientOptions = {
  fetchFn: typeof fetch;
  clientId: string;
  org: string;
  team: string;
};

const SLOW_DOWN_FALLBACK_SECONDS = 10;

const unreachable = (what: string): OpsError =>
  new OpsError(
    'UNAVAILABLE',
    `Could not reach GitHub (${what})`,
    'Check that service.ops can reach github.com and api.github.com, then retry.'
  );

const misconfigured = (message: string): OpsError =>
  new OpsError(
    'INTERNAL',
    message,
    'Check the GitHub OAuth app: device flow must be enabled and OPS_GITHUB_CLIENT_ID must match it.'
  );

export const createGithubClient = ({ fetchFn, clientId, org, team }: GithubClientOptions) => {
  const postForm = async (url: string, body: Record<string, string>): Promise<unknown> => {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      throw unreachable(new URL(url).host);
    });
    return response.json().catch(() => {
      throw misconfigured(`GitHub returned a non-JSON response (HTTP ${response.status})`);
    });
  };

  const getApi = (url: string, token: string): Promise<Response> =>
    fetchFn(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'adopt-dont-shop-ops',
      },
    }).catch(() => {
      throw unreachable('api.github.com');
    });

  const start = async (): Promise<DeviceCode> => {
    const parsed = DeviceCodeSchema.safeParse(
      await postForm(DEVICE_CODE_URL, { client_id: clientId, scope: SCOPE })
    );
    if (!parsed.success) {
      throw misconfigured('GitHub refused to start a device login');
    }
    return {
      deviceCode: parsed.data.device_code,
      userCode: parsed.data.user_code,
      verificationUri: parsed.data.verification_uri,
      interval: parsed.data.interval,
      expiresIn: parsed.data.expires_in,
    };
  };

  const fetchIdentity = async (token: string): Promise<GithubIdentity> => {
    const response = await getApi(USER_URL, token);
    const parsed = UserSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !parsed.success) {
      throw new OpsError(
        'UNAUTHENTICATED',
        'GitHub did not accept the login',
        'Run `pnpm ops login` again.'
      );
    }
    return { login: parsed.data.login, githubId: parsed.data.id, name: parsed.data.name ?? null };
  };

  const isActiveTeamMember = async (token: string, login: string): Promise<boolean> => {
    const url = `https://api.github.com/orgs/${encodeURIComponent(org)}/teams/${encodeURIComponent(team)}/memberships/${encodeURIComponent(login)}`;
    const response = await getApi(url, token);
    if (response.status === 404) {
      return false;
    }
    const parsed = MembershipSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !parsed.success) {
      throw unreachable('team membership lookup');
    }
    return parsed.data.state === 'active';
  };

  const poll = async (deviceCode: string): Promise<DevicePollResult> => {
    const parsed = TokenResponseSchema.safeParse(
      await postForm(ACCESS_TOKEN_URL, {
        client_id: clientId,
        device_code: deviceCode,
        grant_type: DEVICE_GRANT,
      })
    );
    if (!parsed.success) {
      throw misconfigured('GitHub returned an unexpected token response');
    }
    if ('access_token' in parsed.data) {
      const token = parsed.data.access_token;
      const identity = await fetchIdentity(token);
      const member = await isActiveTeamMember(token, identity.login);
      return member
        ? { status: 'ok', identity }
        : {
            status: 'denied',
            reason: `${identity.login} is not an active member of ${org}/${team}`,
          };
    }
    switch (parsed.data.error) {
      case 'authorization_pending':
        return { status: 'pending' };
      case 'slow_down':
        return {
          status: 'slow_down',
          interval: parsed.data.interval ?? SLOW_DOWN_FALLBACK_SECONDS,
        };
      case 'expired_token':
        return { status: 'expired' };
      case 'access_denied':
        return { status: 'denied', reason: 'Authorization was denied on GitHub' };
      default:
        throw misconfigured(`GitHub device flow error: ${parsed.data.error}`);
    }
  };

  return { start, poll };
};

export type GithubClient = ReturnType<typeof createGithubClient>;
