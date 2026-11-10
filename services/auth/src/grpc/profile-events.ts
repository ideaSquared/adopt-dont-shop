// auth.userProfileChanged — published (inside the write's transaction, so it
// fires only on commit) whenever a user's name or email changes: their own
// account edit, an admin edit, or a confirmed email change.
//
// Event-carried state transfer: it carries the user's current name and email
// plus updated_at, so services that keep a copy (service.applications' staff
// list search) stay current without calling back, and apply only the latest
// change when events arrive out of order.

import type { TransactionalScope } from '@adopt-dont-shop/events';

export type ProfileRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  updated_at: Date;
};

export function publishProfileChanged(
  publish: TransactionalScope['publish'],
  row: ProfileRow
): void {
  const updatedAt = row.updated_at.toISOString();
  publish({
    type: 'auth.userProfileChanged',
    id: `auth.userProfileChanged.${row.user_id}.${updatedAt}`,
    payload: {
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      updatedAt,
    },
  });
}
