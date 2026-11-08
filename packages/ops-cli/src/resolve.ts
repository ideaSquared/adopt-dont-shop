import type { CatalogMethod, CatalogService } from '@adopt-dont-shop/ops-contract';
import { didYouMean, type CatalogIndex } from './catalog.js';
import { UsageError } from './errors.js';

export const resolveService = (index: CatalogIndex, name: string): CatalogService => {
  const service = index.service(name);
  if (service) {
    return service;
  }
  const names = index.catalog.services.map(s => s.name);
  const hint = [
    didYouMean(name, names, 'pnpm ops '),
    `Services: ${names.join(', ') || '(none enabled)'}.`,
  ]
    .filter(Boolean)
    .join(' ');
  throw new UsageError(`Unknown command or service "${name}".`, hint);
};

export const resolveMethod = (service: CatalogService, command: string): CatalogMethod => {
  const method = service.methods.find(m => m.command === command);
  if (method) {
    return method;
  }
  const commands = service.methods.map(m => m.command);
  const hint = [didYouMean(command, commands), `Commands: ${commands.join(', ')}.`]
    .filter(Boolean)
    .join(' ');
  throw new UsageError(`"${service.name}" has no command "${command}".`, hint);
};

const VALUE_FLAGS = new Set(['-e', '--env']);
const BOOLEAN_FLAGS = new Set(['-y', '--yes', '--refresh']);

// What we remember for `ops again`: the command without env, --yes or --refresh,
// so a replay always previews writes and honours the current env choice.
export const argvForHistory = (argv: readonly string[]): readonly string[] =>
  argv.reduce<{ readonly out: readonly string[]; readonly skip: boolean }>(
    (acc, arg) => {
      if (acc.skip) {
        return { out: acc.out, skip: false };
      }
      if (VALUE_FLAGS.has(arg)) {
        return { out: acc.out, skip: true };
      }
      if (arg.startsWith('--env=') || BOOLEAN_FLAGS.has(arg)) {
        return acc;
      }
      return { out: [...acc.out, arg], skip: false };
    },
    { out: [], skip: false }
  ).out;
