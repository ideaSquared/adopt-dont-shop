/**
 * Seed CLI — single entry point, target chosen explicitly via flags.
 *
 *   --reference        Reference data (idempotent, safe everywhere)
 *   --demo             Demo data (Faker, dev/staging only — needs ALLOW_DEMO_SEED)
 *   --fixtures         Test fixtures (Emily, e2e — dev/test/staging)
 *   --reset            Truncate demo+fixture tables (dev/test only — needs ALLOW_DEMO_SEED)
 *
 * No "do everything" alias — explicit composition only. Compose via npm
 * scripts (see package.json db:reset:dev / db:reset:test).
 */

import sequelize from '../sequelize';
import { clearAllData } from './index';
import { runReferenceSeeders } from './reference';
import { runDemoSeeders } from './demo';
import { runFixtureSeeders } from './fixtures';

type Action = 'reference' | 'demo' | 'fixtures' | 'reset';

const ACTION_FLAGS: Record<string, Action> = {
  '--reference': 'reference',
  '--demo': 'demo',
  '--fixtures': 'fixtures',
  '--reset': 'reset',
};

const usage = (): string =>
  [
    'Usage: node dist/seeders/cli.js <flag>',
    '',
    '  --reference   Idempotent reference data (safe in any environment)',
    '  --demo        Faker-generated demo data (requires ALLOW_DEMO_SEED=true)',
    '  --fixtures    Deterministic test fixtures',
    '  --reset       Truncate demo + fixture tables (requires ALLOW_DEMO_SEED=true)',
    '',
    'Examples:',
    '  npm run db:seed:reference',
    '  npm run db:seed:demo',
    '  npm run db:seed:fixtures',
    '',
  ].join('\n');

const parseAction = (argv: string[]): Action | null => {
  for (const arg of argv) {
    const flag = arg.split('=')[0];
    const action = ACTION_FLAGS[flag];
    if (action) {
      return action;
    }
  }
  return null;
};

const dispatch = async (action: Action): Promise<void> => {
  switch (action) {
    case 'reference':
      await runReferenceSeeders();
      return;
    case 'demo':
      await runDemoSeeders();
      return;
    case 'fixtures':
      await runFixtureSeeders();
      return;
    case 'reset':
      await clearAllData();
      return;
  }
};

async function main(): Promise<void> {
  const action = parseAction(process.argv.slice(2));
  if (!action) {
    process.stderr.write(usage());
    // eslint-disable-next-line no-process-exit
    process.exit(2);
  }

  await sequelize.authenticate();
  await dispatch(action);
  await sequelize.close();
}

main()
  // eslint-disable-next-line no-process-exit
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Seed CLI failed:', error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
