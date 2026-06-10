import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-777 — add failed_at to audit.gdpr_erasure_requests.
//
// completed_at used to flip as soon as every expected service had a
// completion entry, even when those entries carried an `error` — so a
// fully-errored saga looked completed. Now completed_at means "every
// service acked successfully"; failed_at is stamped the first time any
// service's ack carries an error and flags the saga for operator
// attention. NULL in both = saga still in flight (or stuck — the
// timeout sweep catches those).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('gdpr_erasure_requests', {
    failed_at: { type: 'timestamptz' },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('gdpr_erasure_requests', 'failed_at');
};
