import { describe, expect, it } from 'vitest';
import { parseArgv } from './args.js';
import { UsageError } from './errors.js';
import {
  buildRequest,
  commandArgv,
  fieldSpecs,
  formatCommandLine,
  isRequired,
  kebab,
  optionsFor,
  orderForPrompting,
  positionalField,
  resolveEnumValue,
} from './flags.js';
import { PET_ID, sampleIndex } from './test-support.js';

const method = (command: string) => {
  const m = sampleIndex.method('pets', command);
  if (!m) {
    throw new Error(`no ${command}`);
  }
  return m;
};

const request = (command: string, argv: string[], json?: string) => {
  const specs = fieldSpecs(sampleIndex, method(command));
  const parsed = parseArgv(argv, optionsFor(specs));
  return buildRequest({ specs, parsed, positionals: parsed.positionals, json });
};

describe('flag generation', () => {
  it('kebab-cases json names', () => {
    expect(kebab('includeArchived')).toBe('include-archived');
  });

  it('declares booleans with a --no- twin and the rest as repeatable strings', () => {
    const options = optionsFor(fieldSpecs(sampleIndex, method('list')));
    expect(options['include-archived']).toEqual({ type: 'boolean' });
    expect(options['no-include-archived']).toEqual({ type: 'boolean' });
    expect(options.limit).toEqual({ type: 'string', multiple: true });
  });
});

describe('request building', () => {
  it('parses numbers, enums by short case-insensitive name, and bools', () => {
    expect(request('list', ['--status', 'Adopted', '--limit', '5', '--include-archived'])).toEqual({
      status: 'PET_STATUS_ADOPTED',
      limit: 5,
      includeArchived: true,
    });
  });

  it('accepts the full enum name and dashes', () => {
    expect(request('list', ['--status', 'PET_STATUS_AVAILABLE'])).toEqual({
      status: 'PET_STATUS_AVAILABLE',
    });
  });

  it('supports --no-flag and --flag=false', () => {
    expect(request('list', ['--no-include-archived'])).toEqual({ includeArchived: false });
    expect(request('list', ['--include-archived=false'])).toEqual({ includeArchived: false });
  });

  it('rejects --flag together with --no-flag', () => {
    expect(() => request('list', ['--include-archived', '--no-include-archived'])).toThrow(
      /not both/
    );
  });

  it('collects repeated flags and comma lists', () => {
    expect(request('list', ['--tags', 'a,b', '--tags', 'c'])).toEqual({ tags: ['a', 'b', 'c'] });
  });

  it('rejects non-numbers and fractions for integers', () => {
    expect(() => request('list', ['--limit', 'many'])).toThrow(/whole number/);
    expect(() => request('list', ['--limit', '1.5'])).toThrow(/whole number/);
  });

  it('rejects a value-less string flag', () => {
    expect(() => request('list', ['--limit'])).toThrow(/needs a value/);
  });

  it('merges --json underneath flags', () => {
    expect(
      request('list', ['--limit', '3'], '{"limit": 99, "filter": {"q": "x"}, "extra": 1}')
    ).toEqual({ limit: 3, filter: { q: 'x' }, extra: 1 });
  });

  it('rejects --json that is not an object', () => {
    expect(() => request('list', [], '[1]')).toThrow(/JSON object/);
    expect(() => request('list', [], '{nope')).toThrow(/JSON object/);
  });

  it('sends nested fields only via --json', () => {
    expect(() => request('list', ['--filter', 'x'])).toThrow(/only be set with --json/);
  });
});

describe('positional argument', () => {
  it('fills the first required id field', () => {
    expect(request('update-status', [PET_ID, '--status', 'adopted'])).toEqual({
      petId: PET_ID,
      status: 'PET_STATUS_ADOPTED',
    });
  });

  it('falls back to the first non-nested field when there is no id', () => {
    const specs = fieldSpecs(sampleIndex, method('list'));
    expect(positionalField(specs)?.key).toBe('status');
  });

  it('prefers an explicit flag over the positional', () => {
    const out = request('update-status', ['ignored', '--pet-id', PET_ID, '--status', 'adopted']);
    expect(out).toMatchObject({ petId: PET_ID });
  });

  it('rejects more than one positional', () => {
    expect(() => request('update-status', [PET_ID, 'second'])).toThrow(/Unexpected extra argument/);
  });

  it('treats ids as the required fields', () => {
    const specs = fieldSpecs(sampleIndex, method('update-status'));
    expect(specs.filter(isRequired).map(s => s.key)).toEqual(['petId']);
    expect(orderForPrompting(specs)[0]?.key).toBe('petId');
  });
});

describe('unknown flags', () => {
  it('suggests the closest flag', () => {
    try {
      request('list', ['--stauts', 'x']);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(UsageError);
      expect((e as UsageError).hint).toBe('Did you mean `--status`?');
      expect((e as UsageError).exitCode).toBe(2);
    }
  });

  it('points at --help when nothing is close', () => {
    expect(() => request('list', ['--zzzzzzzzzz'])).toThrow(/Unknown flag/);
  });
});

describe('enum resolution', () => {
  const spec = fieldSpecs(sampleIndex, method('list')).find(s => s.key === 'status');
  if (!spec) {
    throw new Error('status spec missing');
  }

  it('matches by suffix, ignoring case', () => {
    expect(resolveEnumValue(spec, 'available')).toBe('PET_STATUS_AVAILABLE');
  });

  it('suggests a close value and lists the valid ones', () => {
    try {
      resolveEnumValue(spec, 'adoptd');
      expect.unreachable();
    } catch (e) {
      expect((e as UsageError).hint).toContain('Did you mean `adopted`?');
      expect((e as UsageError).hint).toContain('unspecified, available, adopted');
    }
  });

  it('prefers an exact short name over a longer value sharing its suffix', () => {
    const withNotAvailable = {
      ...spec,
      enumValues: ['PET_STATUS_AVAILABLE', 'PET_STATUS_NOT_AVAILABLE'],
      shortEnumValues: ['available', 'not_available'],
    };
    expect(resolveEnumValue(withNotAvailable, 'available')).toBe('PET_STATUS_AVAILABLE');
    expect(resolveEnumValue(withNotAvailable, 'not-available')).toBe('PET_STATUS_NOT_AVAILABLE');
  });

  it('rejects ambiguous suffixes', () => {
    const ambiguous = {
      ...spec,
      enumValues: ['A_X_ONE', 'B_X_ONE'],
      shortEnumValues: ['one', 'one'],
    };
    expect(() => resolveEnumValue(ambiguous, 'one')).toThrow(/ambiguous/);
  });
});

describe('equivalent command line', () => {
  it('reproduces a request as a runnable command', () => {
    const specs = fieldSpecs(sampleIndex, method('update-status'));
    const line = formatCommandLine('pets', method('update-status'), specs, {
      petId: PET_ID,
      status: 'PET_STATUS_ADOPTED',
      notifyAdopter: false,
    });
    expect(line).toBe(`pnpm ops pets update-status ${PET_ID} --status adopted --no-notify-adopter`);
  });

  it('quotes values and puts nested fields in --json', () => {
    const specs = fieldSpecs(sampleIndex, method('list'));
    expect(
      commandArgv('pets', method('list'), specs, { tags: ['a', 'b'], filter: { q: 'x y' } })
    ).toEqual(['pets', 'list', '--tags', 'a,b', '--json', '{"filter":{"q":"x y"}}']);
    expect(
      formatCommandLine('pets', method('list'), specs, {
        status: 'PET_STATUS_ADOPTED',
        tags: ['it is'],
      })
    ).toBe("pnpm ops pets list adopted --tags 'it is'");
  });
});
