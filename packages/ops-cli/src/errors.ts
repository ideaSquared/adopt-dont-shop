import type { OpsEnv, OpsErrorCode } from '@adopt-dont-shop/ops-contract';

// Exit codes: 0 ok, 1 error, 2 usage error.
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: 1 | 2 = 1,
    readonly hint?: string
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export class UsageError extends CliError {
  constructor(message: string, hint?: string) {
    super(message, 2, hint);
    this.name = 'UsageError';
  }
}

export class NetworkError extends CliError {
  constructor(readonly env: OpsEnv) {
    super(`Can't reach ${env}.`, 1, 'Run `pnpm ops doctor` to see what is wrong.');
    this.name = 'NetworkError';
  }
}

export class ApiError extends CliError {
  constructor(
    readonly code: OpsErrorCode,
    message: string,
    readonly status: number,
    hint?: string
  ) {
    super(message, 1, hint);
    this.name = 'ApiError';
  }
}

// Thrown when the person presses Ctrl+C / Esc in a prompt.
export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

export class ConfigCorruptError extends CliError {
  constructor(path: string, reason: string) {
    super(
      `Your ads-ops config file is unreadable (${reason}).`,
      1,
      `Reset it with \`rm "${path}"\` and run \`pnpm ops setup\` again.`
    );
    this.name = 'ConfigCorruptError';
  }
}
