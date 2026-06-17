import { describe, expect, it } from 'vitest';
import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NetworkError,
  NotFoundError,
  TimeoutError,
  ValidationError,
  createHttpError,
} from './index';

describe('HTTP error classes', () => {
  it('ApiError carries status, code and details', () => {
    const error = new ApiError('boom', 500, 'INTERNAL', { trace: 'x' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('boom');
    expect(error.status).toBe(500);
    expect(error.code).toBe('INTERNAL');
    expect(error.details).toEqual({ trace: 'x' });
  });

  it('NetworkError keeps the original error', () => {
    const original = new Error('socket hang up');
    const error = new NetworkError('Network request failed', original);
    expect(error.name).toBe('NetworkError');
    expect(error.originalError).toBe(original);
  });

  it('TimeoutError reports the timeout duration', () => {
    const error = new TimeoutError(2500);
    expect(error.name).toBe('TimeoutError');
    expect(error.message).toBe('Request timeout after 2500ms');
  });

  it('ValidationError carries field errors', () => {
    const error = new ValidationError('Invalid', { email: ['required'] });
    expect(error.name).toBe('ValidationError');
    expect(error.errors).toEqual({ email: ['required'] });
  });

  it('AuthenticationError defaults its message', () => {
    expect(new AuthenticationError().message).toBe('Authentication required');
    expect(new AuthenticationError('custom').message).toBe('custom');
  });

  it('AuthorizationError defaults its message', () => {
    expect(new AuthorizationError().message).toBe('Access denied');
    expect(new AuthorizationError('nope').message).toBe('nope');
  });

  it('ConflictError carries conflicts metadata', () => {
    const error = new ConflictError('Duplicate', { email: 'taken' });
    expect(error.name).toBe('ConflictError');
    expect(error.conflicts).toEqual({ email: 'taken' });
  });

  it('NotFoundError describes the missing resource', () => {
    const error = new NotFoundError('User');
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('User not found');
  });
});

describe('createHttpError', () => {
  it('maps 400 to a ValidationError with details', () => {
    const error = createHttpError(400, 'Bad input', undefined, { name: ['required'] });
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).errors).toEqual({ name: ['required'] });
  });

  it('maps 401 to an AuthenticationError', () => {
    const error = createHttpError(401, 'Token expired');
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('Token expired');
  });

  it('maps 403 to an AuthorizationError', () => {
    const error = createHttpError(403, 'Forbidden');
    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.message).toBe('Forbidden');
  });

  it('maps 404 to a NotFoundError', () => {
    const error = createHttpError(404, 'Pet');
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Pet not found');
  });

  it('maps 409 to a ConflictError with conflicts', () => {
    const error = createHttpError(409, 'Conflict', undefined, { slug: 'taken' });
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).conflicts).toEqual({ slug: 'taken' });
  });

  it('maps 422 to a ValidationError', () => {
    const error = createHttpError(422, 'Unprocessable', undefined, { age: ['min'] });
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).errors).toEqual({ age: ['min'] });
  });

  it('falls back to a generic ApiError for unmapped statuses', () => {
    const error = createHttpError(500, 'Server error', 'INTERNAL', { id: 1 });
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).code).toBe('INTERNAL');
    expect((error as ApiError).details).toEqual({ id: 1 });
  });
});
