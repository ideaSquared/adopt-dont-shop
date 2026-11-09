/**
 * Full reload to the app root after the account is gone, so no in-memory
 * state (auth context, query cache) from the deleted account survives.
 */
export const leaveApp = (): void => {
  window.location.assign('/');
};
