const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'resetToken',
  'resetTokenExpiry',
  'twoFactorSecret',
  'backupCodes',
  'refreshToken',
  'verificationToken',
  'verificationTokenExpiry',
]);

export const redactSensitiveFields = (obj: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, SENSITIVE_FIELDS.has(k) ? '[REDACTED]' : v])
  );
