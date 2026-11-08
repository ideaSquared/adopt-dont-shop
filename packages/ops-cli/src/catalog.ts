import type {
  CatalogEnum,
  CatalogMessage,
  CatalogMethod,
  CatalogResponse,
  CatalogService,
} from '@adopt-dont-shop/ops-contract';
import { buildEnumShortNames, type EnumShortNames } from './ui/format.js';

export type CatalogIndex = {
  readonly catalog: CatalogResponse;
  readonly enums: EnumShortNames;
  readonly service: (name: string) => CatalogService | undefined;
  readonly method: (service: string, command: string) => CatalogMethod | undefined;
  readonly message: (fullName: string) => CatalogMessage | undefined;
  readonly enumDef: (fullName: string) => CatalogEnum | undefined;
};

export const buildIndex = (catalog: CatalogResponse): CatalogIndex => {
  const enums = buildEnumShortNames(catalog);
  const service = (name: string) => catalog.services.find(s => s.name === name);
  return {
    catalog,
    enums,
    service,
    method: (serviceName, command) =>
      service(serviceName)?.methods.find(m => m.command === command),
    message: fullName => catalog.messages[fullName],
    enumDef: fullName => catalog.enums[fullName],
  };
};

export const levenshtein = (a: string, b: string): number => {
  const row0 = Array.from({ length: b.length + 1 }, (_, i) => i);
  const last = [...a].reduce<readonly number[]>(
    (prev, ca, i) =>
      [...b].reduce<number[]>(
        (cur, cb, j) => [
          ...cur,
          Math.min((prev[j + 1] ?? 0) + 1, (cur[j] ?? 0) + 1, (prev[j] ?? 0) + (ca === cb ? 0 : 1)),
        ],
        [i + 1]
      ),
    row0
  );
  return last[b.length] ?? 0;
};

// Closest candidate, if it is close enough to be a plausible typo.
export const suggest = (input: string, candidates: readonly string[]): string | undefined => {
  const wanted = input.toLowerCase();
  const limit = Math.max(2, Math.floor(wanted.length / 3));
  const [best] = candidates
    .map(c => ({ c, d: levenshtein(wanted, c.toLowerCase()) }))
    .filter(({ c, d }) => d <= limit || c.toLowerCase().startsWith(wanted))
    .sort((x, y) => x.d - y.d);
  return best?.c;
};

export const didYouMean = (input: string, candidates: readonly string[], prefix = ''): string => {
  const match = suggest(input, candidates);
  return match ? `Did you mean \`${prefix}${match}\`?` : '';
};
