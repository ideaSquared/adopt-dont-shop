import type { Ctx } from './ctx.js';
import type { OutputMode } from './args.js';
import type { Lines } from './ui/render.js';

// Where output goes. In JSON mode stdout carries only the JSON document; the
// human chrome (badge, banners, notices) moves to stderr.
export type Out = {
  readonly json: boolean;
  readonly mode: OutputMode;
  readonly body: (lines: Lines) => void;
  readonly chrome: (lines: Lines) => void;
  // Prints the JSON document and returns the exit code (0).
  readonly raw: (value: unknown) => 0;
};

export const resolveMode = (requested: OutputMode | undefined, stdoutTTY: boolean): OutputMode =>
  requested ?? (stdoutTTY ? 'pretty' : 'json');

export const createOut = (ctx: Ctx, requested: OutputMode | undefined): Out => {
  const mode = resolveMode(requested, ctx.stdoutTTY);
  const json = mode === 'json';
  const write = (write: (t: string) => void) => (lines: Lines) =>
    lines.length > 0 && write(`${lines.join('\n')}\n`);
  return {
    json,
    mode,
    body: write(ctx.out),
    chrome: write(json ? ctx.err : ctx.out),
    raw: value => {
      ctx.out(`${JSON.stringify(value, null, 2)}\n`);
      return 0;
    },
  };
};
