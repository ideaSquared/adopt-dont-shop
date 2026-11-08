import { status as grpcStatus } from '@grpc/grpc-js';

import {
  ERROR_HTTP_STATUS,
  type ErrorResponse,
  type OpsErrorCode,
} from '@adopt-dont-shop/ops-contract';

// Every failure on the HTTP surface is an OpsError: a contract code, a message
// and a one-line actionable hint. The hint is mandatory so no error reaches the
// CLI without a next step.
export class OpsError extends Error {
  constructor(
    public readonly code: OpsErrorCode,
    message: string,
    public readonly hint: string
  ) {
    super(message);
    this.name = 'OpsError';
  }
}

export const httpStatusFor = (code: OpsErrorCode): number => ERROR_HTTP_STATUS[code];

export const toErrorResponse = (err: OpsError): ErrorResponse => ({
  error: { code: err.code, message: err.message, hint: err.hint },
});

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Downstream handler messages are written for engineers, but a few echo input
// ("email a@b.c already registered"). Strip anything email-shaped before the
// text can reach an operator who may not hold an unlock.
export const redactEmails = (text: string): string => text.replace(EMAIL_PATTERN, '[email]');

const grpcCodeOf = (err: unknown): number | undefined => {
  if (typeof err !== 'object' || err === null) {
    return undefined;
  }
  const code: unknown = Reflect.get(err, 'code');
  return typeof code === 'number' ? code : undefined;
};

const grpcDetailsOf = (err: unknown): string => {
  if (typeof err !== 'object' || err === null) {
    return 'downstream call failed';
  }
  const details: unknown = Reflect.get(err, 'details');
  return typeof details === 'string' && details !== '' ? redactEmails(details) : 'no details';
};

// Translate a gRPC failure from a domain service into a contract error.
export const fromGrpcError = (rpc: string, err: unknown): OpsError => {
  const code = grpcCodeOf(err);
  const detail = grpcDetailsOf(err);
  const service = rpc.split('.')[0];
  switch (code) {
    case grpcStatus.INVALID_ARGUMENT:
      return new OpsError(
        'INVALID_ARGUMENT',
        `${rpc} rejected the request: ${detail}`,
        'Check the request fields with `pnpm ops <service> <command> --help`.'
      );
    case grpcStatus.PERMISSION_DENIED:
      return new OpsError(
        'PERMISSION_DENIED',
        `${rpc} refused the ops principal: ${detail}`,
        'The registry entry may be missing a permission or a rescue scope for this request.'
      );
    case grpcStatus.NOT_FOUND:
      return new OpsError('NOT_FOUND', `${rpc}: ${detail}`, 'Check the id and the environment.');
    case grpcStatus.ALREADY_EXISTS:
      return new OpsError('ALREADY_EXISTS', `${rpc}: ${detail}`, 'The target already exists.');
    case grpcStatus.FAILED_PRECONDITION:
      return new OpsError(
        'FAILED_PRECONDITION',
        `${rpc}: ${detail}`,
        'The target is not in a state that allows this action; inspect it first.'
      );
    case grpcStatus.UNAVAILABLE:
    case grpcStatus.DEADLINE_EXCEEDED:
      return new OpsError(
        'UNAVAILABLE',
        `service.${service} did not answer`,
        `Check that service.${service} is running (docker compose ps), then retry.`
      );
    case grpcStatus.UNAUTHENTICATED:
      return new OpsError(
        'INTERNAL',
        `service.${service} rejected the principal token minted by service.ops`,
        'Check that PRINCIPAL_SIGNING_KEY is identical for service.ops and the target service.'
      );
    default:
      return new OpsError(
        'INTERNAL',
        `${rpc} failed unexpectedly`,
        'Check the service logs with the request id from the response headers.'
      );
  }
};
