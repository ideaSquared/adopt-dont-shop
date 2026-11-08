import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';
import { UsageError } from './errors.js';

export type OutputMode = 'json' | 'table' | 'pretty';

export const GLOBAL_OPTIONS = {
  env: { type: 'string', short: 'e' },
  json: { type: 'string' },
  yes: { type: 'boolean', short: 'y' },
  output: { type: 'string', short: 'o' },
  refresh: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
  'no-color': { type: 'boolean' },
} as const satisfies ParseArgsOptionsConfig;

export const GLOBAL_FLAG_NAMES: readonly string[] = Object.keys(GLOBAL_OPTIONS);

export type RawValue = string | boolean | readonly (string | boolean)[] | undefined;
export type ParsedArgs = {
  readonly values: Readonly<Record<string, RawValue>>;
  readonly positionals: readonly string[];
};

// Non-strict on purpose: unknown flags are reported by our own validation so
// the error can carry a suggestion.
export const parseArgv = (
  argv: readonly string[],
  extra: ParseArgsOptionsConfig = {}
): ParsedArgs => {
  const { values, positionals } = parseArgs({
    args: [...argv],
    options: { ...extra, ...GLOBAL_OPTIONS },
    allowPositionals: true,
    strict: false,
  });
  return { values, positionals };
};

export type Globals = {
  readonly env?: string;
  readonly json?: string;
  readonly yes: boolean;
  readonly output?: OutputMode;
  readonly refresh: boolean;
  readonly help: boolean;
  readonly version: boolean;
};

const asString = (v: RawValue): string | undefined => (typeof v === 'string' ? v : undefined);

const VALUE_HINTS: Readonly<Record<string, string>> = {
  env: 'dev, staging or prod',
  output: 'json, table or pretty',
  json: 'a JSON object',
};

// Non-strict parsing turns a flag given without a value into `true` (or ''
// for `--env=`, or the next flag when `--env --yes`). Dropping it silently would run against the saved
// environment, so it is a usage error instead.
const requireValues = (values: ParsedArgs['values']): void =>
  Object.entries(VALUE_HINTS).forEach(([name, hint]) => {
    const v = values[name];
    if (v === undefined || (typeof v === 'string' && v !== '' && !v.startsWith('-'))) {
      return;
    }
    throw new UsageError(`\`--${name}\` needs a value: ${hint}.`);
  });

export const readGlobals = (values: ParsedArgs['values']): Globals => {
  requireValues(values);
  const output = asString(values.output);
  if (output !== undefined && !['json', 'table', 'pretty'].includes(output)) {
    throw new UsageError(`Unknown output mode "${output}".`, 'Use --output json, table or pretty.');
  }
  return {
    env: asString(values.env),
    json: asString(values.json),
    yes: values.yes === true,
    output: output as OutputMode | undefined, // validated against the allowed list just above
    refresh: values.refresh === true,
    help: values.help === true,
    version: values.version === true,
  };
};
