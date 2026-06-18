// @adopt-dont-shop/test-utils
//
// Shared test utilities for gRPC microservices. Dev-only — add as a
// devDependency, never as a runtime dependency.
//
// Exports:
//   startStubGrpcServer   — start an in-process gRPC server on an ephemeral
//                           port for contract / integration tests.
//   StubGrpcServer        — the return type of startStubGrpcServer.
//   testPrincipal         — build a Principal with sensible defaults.
//   TestPrincipalOverrides — partial override type for testPrincipal.
//   metadataFor           — serialise a Principal into x-user-* gRPC Metadata.
//   makeNatsDouble        — NATS / JetStream publish-recording double.
//   NatsDouble            — the return type of makeNatsDouble.
//   NatsPublishCall       — a single recorded publish call.

export { startStubGrpcServer } from './grpc-server.js';
export type { StubGrpcServer } from './grpc-server.js';

export { testPrincipal, metadataFor } from './principal-builders.js';
export type { TestPrincipalOverrides } from './principal-builders.js';

export { makeNatsDouble } from './nats-doubles.js';
export type { NatsDouble, NatsPublishCall } from './nats-doubles.js';
