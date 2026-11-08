import * as clack from '@clack/prompts';
import { CancelledError } from './errors.js';
import type { Prompts } from './ctx.js';

const unwrap = <T>(value: T | symbol): T => {
  if (clack.isCancel(value)) {
    clack.cancel('Cancelled.');
    throw new CancelledError();
  }
  return value;
};

export const createClackPrompts = (): Prompts => ({
  intro: title => clack.intro(title),
  outro: message => clack.outro(message),
  note: (message, title) => clack.note(message, title),
  select: async ({ message, options, initialValue }) =>
    unwrap(
      await clack.select<string>({
        message,
        options: options.map(o => ({ value: o.value, label: o.label, hint: o.hint })),
        initialValue,
      })
    ),
  text: async ({ message, placeholder, initialValue, validate }) =>
    unwrap(
      await clack.text({
        message,
        placeholder,
        initialValue,
        validate: validate ? v => validate(v ?? '') : undefined,
      })
    ),
  confirm: async ({ message, initialValue }) =>
    unwrap(await clack.confirm({ message, initialValue: initialValue ?? false })),
  spinner: () => {
    const s = clack.spinner();
    return { start: s.start, message: s.message, stop: s.stop };
  },
  log: {
    info: m => clack.log.info(m),
    success: m => clack.log.success(m),
    warn: m => clack.log.warn(m),
    error: m => clack.log.error(m),
  },
});
