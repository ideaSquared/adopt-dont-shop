import type { CatalogMethod, CatalogService, OpsEnv } from '@adopt-dont-shop/ops-contract';
import type { CatalogIndex } from './catalog.js';
import type { Client } from './client.js';
import type { Ctx } from './ctx.js';
import { UsageError } from './errors.js';
import {
  commandArgv,
  convertScalar,
  fieldSpecs,
  formatCommandLine,
  isRequired,
  orderForPrompting,
  type FieldSpec,
} from './flags.js';
import { runInvocation } from './invoke.js';
import type { Out } from './out.js';

// Turns what the person typed into a request value; undefined means "skip".
export const parsePromptAnswer = (spec: FieldSpec, answer: string): unknown => {
  const text = answer.trim();
  if (text === '') {
    return undefined;
  }
  if (spec.type === 'json') {
    try {
      return JSON.parse(text) as unknown; // the server validates the shape against the proto
    } catch {
      throw new UsageError(`${spec.field.jsonName} must be valid JSON.`);
    }
  }
  if (spec.field.repeated) {
    return text
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(s => convertScalar(spec, s));
  }
  return convertScalar(spec, text);
};

const problemWith = (spec: FieldSpec, answer: string): string | undefined => {
  if (answer.trim() === '' && isRequired(spec)) {
    return 'This one is required.';
  }
  try {
    parsePromptAnswer(spec, answer);
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid value.';
  }
};

const SKIP = '__skip__';

const promptField = async (ctx: Ctx, spec: FieldSpec): Promise<unknown> => {
  const label = `${spec.field.jsonName}${isRequired(spec) ? '' : ' (optional)'}`;
  if (spec.type === 'boolean' && !spec.field.repeated) {
    const answer = await ctx.prompts.select({
      message: label,
      options: [
        { value: SKIP, label: 'Leave unset' },
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      initialValue: SKIP,
    });
    return answer === SKIP ? undefined : answer === 'yes';
  }
  if (spec.type === 'enum' && !spec.field.repeated) {
    const answer = await ctx.prompts.select({
      message: label,
      options: [
        ...(isRequired(spec) ? [] : [{ value: SKIP, label: 'Leave unset' }]),
        ...spec.enumValues.map((v, i) => ({ value: v, label: spec.shortEnumValues[i] ?? v })),
      ],
      initialValue: isRequired(spec) ? undefined : SKIP,
    });
    return answer === SKIP ? undefined : answer;
  }
  const hint =
    spec.type === 'json'
      ? 'JSON, empty to skip'
      : spec.field.repeated
        ? 'comma separated, empty to skip'
        : isRequired(spec)
          ? undefined
          : 'empty to skip';
  const answer = await ctx.prompts.text({
    message: label,
    placeholder: hint,
    validate: v => problemWith(spec, v),
  });
  return parsePromptAnswer(spec, answer);
};

const promptFields = async (
  ctx: Ctx,
  specs: readonly FieldSpec[]
): Promise<Record<string, unknown>> =>
  orderForPrompting(specs).reduce<Promise<Record<string, unknown>>>(async (prev, spec) => {
    const acc = await prev;
    const value = await promptField(ctx, spec);
    return value === undefined ? acc : { ...acc, [spec.key]: value };
  }, Promise.resolve({}));

const methodOption = (ctx: Ctx, m: CatalogMethod) => ({
  value: m.command,
  label: `${m.command}  ${ctx.theme.tag(m.kind)}`,
  hint: m.summary,
});

export const runInteractive = async (
  ctx: Ctx,
  env: OpsEnv,
  client: Client,
  index: CatalogIndex,
  out: Out
): Promise<number> => {
  const services = index.catalog.services;
  if (services.length === 0) {
    throw new UsageError('No services are enabled for you in this environment.');
  }
  const serviceName = await ctx.prompts.select({
    message: 'Which service?',
    options: services.map(s => ({
      value: s.name,
      label: s.name,
      hint: `${s.methods.length} commands`,
    })),
  });
  const service: CatalogService | undefined = index.service(serviceName);
  if (!service) {
    return 1;
  }
  const command = await ctx.prompts.select({
    message: `Which ${service.name} command?`,
    options: service.methods.map(m => methodOption(ctx, m)),
  });
  const method = service.methods.find(m => m.command === command);
  if (!method) {
    return 1;
  }
  const specs = fieldSpecs(index, method);
  const request = await promptFields(ctx, specs);
  ctx.prompts.log.info(
    `Same thing next time: ${formatCommandLine(service.name, method, specs, request)}`
  );
  return runInvocation(
    ctx,
    client,
    {
      env,
      index,
      service,
      method,
      specs,
      request,
      globals: { yes: false },
      historyArgv: commandArgv(service.name, method, specs, request),
    },
    out
  );
};
