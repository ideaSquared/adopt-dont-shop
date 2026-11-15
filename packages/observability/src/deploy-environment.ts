// The environment label stamped on Loki streams and Sentry/GlitchTip events. NODE_ENV is
// `production` on both staging and prod, so DEPLOY_ENV (set in each compose file) tells them
// apart. Anything else, or unset, falls back to NODE_ENV so dev and tests are unchanged.

const DEPLOY_ENVIRONMENTS = ['staging', 'production'] as const;

type DeployEnvironment = (typeof DEPLOY_ENVIRONMENTS)[number];

const isDeployEnvironment = (value: string | undefined): value is DeployEnvironment =>
  DEPLOY_ENVIRONMENTS.some(known => known === value);

export const deployEnvironment = (
  env: Readonly<Record<string, string | undefined>> = process.env
): string => {
  const declared = env.DEPLOY_ENV?.trim();
  if (isDeployEnvironment(declared)) return declared;
  return env.NODE_ENV || 'development';
};
