/**
 * ADS-497 (slice 4): one-off CLI for the legal reminder cron.
 *
 *   npm run legal-reminder:run               # respects LEGAL_REMINDER_CRON_DRY_RUN
 *   npm run legal-reminder:run -- --dry-run  # forces dry-run regardless of env
 *   npm run legal-reminder:run -- --live     # forces live (sends emails)
 *
 * Useful for SRE: invoke once after deploy to observe the eligible
 * count before flipping the cron's DRY_RUN env var. Closes the DB
 * connection and exits non-zero on error so it's safe to chain in CI.
 */

import sequelize from '../sequelize';
import { logger } from '../utils/logger';
import { runLegalReminderCron } from './legal-reminder.worker';

const parseDryRun = (argv: ReadonlyArray<string>): boolean => {
  if (argv.includes('--live')) {
    return false;
  }
  if (argv.includes('--dry-run')) {
    return true;
  }
  return process.env.LEGAL_REMINDER_CRON_DRY_RUN !== 'false';
};

const main = async (): Promise<void> => {
  const dryRun = parseDryRun(process.argv.slice(2));
  logger.info('Running legal reminder cron via CLI', { dryRun });
  const summary = await runLegalReminderCron({ dryRun });
  // Mirror to stdout so SRE running this manually sees the result
  // without grepping logs.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
};

main()
  .then(async () => {
    await sequelize.close();
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  })
  .catch(async err => {
    logger.error('Legal reminder cron CLI failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    await sequelize.close().catch(() => undefined);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
