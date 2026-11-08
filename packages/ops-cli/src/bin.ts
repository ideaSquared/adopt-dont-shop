#!/usr/bin/env tsx
// Entry point for `pnpm ops`. --no-color must reach the environment before any
// colour library is imported, so the rest of the CLI is loaded afterwards.
const argv = process.argv.slice(2);
if (argv.includes('--no-color')) {
  process.env.NO_COLOR = '1';
}

// `pnpm ops ... | head` closes the pipe early; that is not an error.
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code !== 'EPIPE') {
    throw error;
  }
});

const { run } = await import('./cli.js');
process.exitCode = await run(argv);

export {};
