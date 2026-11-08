import type {
  CatalogEnum,
  CatalogMessage,
  CatalogMethod,
  CatalogResponse,
  CatalogService,
  OpsEnv,
} from '@adopt-dont-shop/ops-contract';
import type { ProtoSchema } from '@adopt-dont-shop/proto';

import { commandName, REGISTRY, splitRpc } from './registry.js';

// Registry entries joined with the proto schema, plus every message/enum
// reachable from the listed methods' input and output types.

const reachable = (
  schema: ProtoSchema,
  roots: readonly string[]
): { messages: Record<string, CatalogMessage>; enums: Record<string, CatalogEnum> } => {
  const messages: Record<string, CatalogMessage> = {};
  const enums: Record<string, CatalogEnum> = {};
  const queue = [...roots];
  while (queue.length > 0) {
    const name = queue.pop();
    if (name === undefined || name in messages || name in enums) {
      continue;
    }
    const message = schema.messages[name];
    const enumeration = schema.enums[name];
    if (message !== undefined) {
      messages[name] = { fullName: name, fields: message.fields.map(f => ({ ...f })) };
      queue.push(...message.fields.flatMap(f => (f.typeName === undefined ? [] : [f.typeName])));
    } else if (enumeration !== undefined) {
      enums[name] = { fullName: name, values: enumeration.values.map(v => ({ ...v })) };
    }
  }
  return { messages, enums };
};

export const buildCatalog = (env: OpsEnv, schema: ProtoSchema): CatalogResponse => {
  const byService = new Map<string, CatalogService>();
  const roots: string[] = [];

  Object.entries(REGISTRY).forEach(([rpc, entry]) => {
    const { service, method } = splitRpc(rpc);
    const serviceSchema = Object.values(schema.services).find(
      s => s.package.split('.')[1] === service
    );
    const methodSchema = serviceSchema?.methods.find(m => m.name === method);
    if (serviceSchema === undefined || methodSchema === undefined) {
      return;
    }

    const catalogMethod: CatalogMethod = {
      command: commandName(method),
      rpc,
      kind: entry.kind,
      dryRun: entry.kind === 'write' ? entry.dryRun : null,
      summary: entry.summary,
      inputType: methodSchema.inputType,
      outputType: methodSchema.outputType,
      piiRequestFields: [...(entry.piiRequestFields ?? [])],
    };
    roots.push(methodSchema.inputType, methodSchema.outputType);
    const existing = byService.get(service);
    byService.set(service, {
      name: service,
      fullName: serviceSchema.fullName,
      methods: [...(existing?.methods ?? []), catalogMethod],
    });
  });

  return { env, services: [...byService.values()], ...reachable(schema, roots) };
};
