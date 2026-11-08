import { OpsEnvSchema } from '@adopt-dont-shop/ops-contract';
import type { CatalogIndex } from '../catalog.js';
import { UsageError } from '../errors.js';
import { fieldSpecs, optionsFor } from '../flags.js';
import { GLOBAL_FLAG_NAMES } from '../args.js';

export const BUILTINS: readonly string[] = [
  'help',
  'setup',
  'login',
  'logout',
  'use',
  'whoami',
  'history',
  'again',
  'doctor',
  'unlock',
  'lock',
  'tunnel',
  'completion',
];
const SHELLS = ['zsh', 'bash', 'fish'] as const;
const SUBJECTS = ['user', 'rescue', 'application', 'any'];
const VALUE_FLAGS = new Set(['-e', '--env', '-o', '--output', '--json']);

const globalFlags = GLOBAL_FLAG_NAMES.map(f => `--${f}`);

// Candidates for the last word in `words` (words typed after `pnpm ops`).
export const complete = (
  words: readonly string[],
  index: CatalogIndex | undefined
): readonly string[] => {
  const current = words[words.length - 1] ?? '';
  const previous = words[words.length - 2];
  const before = words.slice(0, -1);
  const positionals = before.filter(
    (w, i) => !w.startsWith('-') && !VALUE_FLAGS.has(before[i - 1] ?? '')
  );
  const candidates = candidatesFor(current, previous, positionals, index);
  return candidates.filter(c => c.startsWith(current)).sort();
};

const candidatesFor = (
  current: string,
  previous: string | undefined,
  positionals: readonly string[],
  index: CatalogIndex | undefined
): readonly string[] => {
  if (previous === '-e' || previous === '--env') {
    return OpsEnvSchema.options;
  }
  if (previous === '-o' || previous === '--output') {
    return ['json', 'table', 'pretty'];
  }
  const [first, second] = positionals;
  const services = index?.catalog.services.map(s => s.name) ?? [];
  if (first === undefined) {
    return current.startsWith('-') ? globalFlags : [...BUILTINS, ...services];
  }
  if (first === 'use') {
    return positionals.length === 1 ? OpsEnvSchema.options : [];
  }
  if (first === 'unlock') {
    return positionals.length === 1 ? SUBJECTS : [];
  }
  if (first === 'tunnel') {
    return positionals.length === 1 ? ['status', 'stop'] : [];
  }
  if (first === 'completion') {
    return positionals.length === 1 ? SHELLS : [];
  }
  const service = index?.service(first);
  if (!service) {
    return [];
  }
  if (second === undefined) {
    return service.methods.map(m => m.command);
  }
  const method = service.methods.find(m => m.command === second);
  if (!method || !index) {
    return [];
  }
  const specs = fieldSpecs(index, method);
  const spec = specs.find(s => `--${s.flag}` === previous);
  if (spec && spec.type === 'enum') {
    return spec.shortEnumValues;
  }
  if (spec && spec.type !== 'boolean') {
    return [];
  }
  return current.startsWith('-')
    ? [...Object.keys(optionsFor(specs)).map(f => `--${f}`), ...globalFlags]
    : [];
};

const shq = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

export const completionScript = (shell: string, root: string): string => {
  const tsx = shq(`${root}/node_modules/.bin/tsx`);
  const bin = shq(`${root}/packages/ops-cli/src/bin.ts`);
  if (shell === 'zsh') {
    return [
      `ads-ops() { ${tsx} ${bin} "$@"; }`,
      '_ads_ops() {',
      '  local -a candidates',
      `  candidates=("\${(@f)$(${tsx} ${bin} __complete "\${(@)words[2,CURRENT]}" 2>/dev/null)}")`,
      '  compadd -a candidates',
      '}',
      'compdef _ads_ops ads-ops',
      '',
    ].join('\n');
  }
  if (shell === 'bash') {
    return [
      `ads-ops() { ${tsx} ${bin} "$@"; }`,
      '_ads_ops() {',
      "  local IFS=$'\\n'",
      `  COMPREPLY=( $(${tsx} ${bin} __complete "\${COMP_WORDS[@]:1:$COMP_CWORD}" 2>/dev/null) )`,
      '}',
      'complete -F _ads_ops ads-ops',
      '',
    ].join('\n');
  }
  if (shell === 'fish') {
    return [
      `function ads-ops; ${tsx} ${bin} $argv; end`,
      'function __ads_ops_complete',
      '  set -l words (commandline -opc)',
      '  set -e words[1]',
      `  ${tsx} ${bin} __complete $words (commandline -ct) 2>/dev/null`,
      'end',
      "complete -c ads-ops -f -a '(__ads_ops_complete)'",
      '',
    ].join('\n');
  }
  throw new UsageError(
    `Unknown shell "${shell}".`,
    'Use one of: zsh, bash, fish. Example: eval "$(pnpm --silent ops completion zsh)"'
  );
};
