import type { Metadata } from '@grpc/grpc-js';

import {
  AuditV1,
  ApplicationsV1,
  AuthV1,
  ChatV1,
  CmsV1,
  MatchingV1,
  ModerationV1,
  NotificationsV1,
  PetsV1,
  RescueV1,
  type ProtoSchema,
} from '@adopt-dont-shop/proto';

import { splitRpc } from './registry.js';

// Binds an ops rpc name ('pets.UpdateStatus') to everything needed to call it
// generically: the ts-proto message codecs (fromJSON/toJSON) and the gRPC
// method definition (path + serialisers) from the generated service object.

export type MessageCodec = {
  fromJSON(object: unknown): unknown;
  toJSON(message: unknown): unknown;
};

export type ResolvedMethod = {
  rpc: string;
  service: string; // CLI name, the proto package segment
  grpcPath: string;
  inputType: string; // fully-qualified message names
  outputType: string;
  input: MessageCodec;
  output: MessageCodec;
  serializeRequest: (message: unknown) => Buffer;
  deserializeResponse: (bytes: Buffer) => unknown;
};

export type MethodResolver = (rpc: string) => ResolvedMethod | undefined;

export type GrpcCall = {
  method: ResolvedMethod;
  request: unknown; // a message produced by method.input.fromJSON
  metadata: Metadata;
  timeoutMs: number;
};
export type GrpcResult = { response: unknown; responseMetadata: Metadata };
export type GrpcCaller = (call: GrpcCall) => Promise<GrpcResult>;

type Namespace = Readonly<Record<string, unknown>>;

const NAMESPACES: Readonly<Record<string, Namespace>> = {
  auth: AuthV1,
  pets: PetsV1,
  rescue: RescueV1,
  applications: ApplicationsV1,
  notifications: NotificationsV1,
  moderation: ModerationV1,
  cms: CmsV1,
  chat: ChatV1,
  audit: AuditV1,
  matching: MatchingV1,
};

const isCodec = (value: unknown): value is MessageCodec =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'fromJSON') === 'function' &&
  typeof Reflect.get(value, 'toJSON') === 'function';

type MethodDefinition = {
  path: string;
  requestSerialize: (message: unknown) => Buffer;
  responseDeserialize: (bytes: Buffer) => unknown;
};

const isMethodDefinition = (value: unknown): value is MethodDefinition =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'path') === 'string' &&
  typeof Reflect.get(value, 'requestSerialize') === 'function' &&
  typeof Reflect.get(value, 'responseDeserialize') === 'function';

// ts-proto flattens nested message names: 'pkg.Outer.Inner' -> 'Outer_Inner'.
const exportName = (fullName: string, protoPackage: string): string =>
  fullName.slice(protoPackage.length + 1).replaceAll('.', '_');

export const createMethodResolver =
  (
    schema: ProtoSchema,
    namespaces: Readonly<Record<string, Namespace>> = NAMESPACES
  ): MethodResolver =>
  rpc => {
    const { service, method } = splitRpc(rpc);
    const namespace = Object.hasOwn(namespaces, service) ? namespaces[service] : undefined;
    const serviceSchema = Object.values(schema.services).find(
      s => s.package.split('.')[1] === service
    );
    const methodSchema = serviceSchema?.methods.find(m => m.name === method);
    if (namespace === undefined || serviceSchema === undefined || methodSchema === undefined) {
      return undefined;
    }

    const definition: unknown = namespace[`${serviceSchema.name}Service`];
    const grpcPath = `/${serviceSchema.fullName}/${method}`;
    const methodDefinition =
      typeof definition === 'object' && definition !== null
        ? Object.values(definition).find(d => isMethodDefinition(d) && d.path === grpcPath)
        : undefined;
    const input = namespace[exportName(methodSchema.inputType, serviceSchema.package)];
    const output = namespace[exportName(methodSchema.outputType, serviceSchema.package)];
    if (!isMethodDefinition(methodDefinition) || !isCodec(input) || !isCodec(output)) {
      return undefined;
    }

    return {
      rpc,
      service,
      grpcPath,
      inputType: methodSchema.inputType,
      outputType: methodSchema.outputType,
      input,
      output,
      serializeRequest: methodDefinition.requestSerialize,
      deserializeResponse: methodDefinition.responseDeserialize,
    };
  };
