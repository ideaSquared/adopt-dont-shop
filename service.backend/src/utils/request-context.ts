import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request-scoped context. Lets Sequelize hooks (and any deeply-nested code
 * path) read the authenticated user without threading the value through
 * every function signature.
 *
 * The pattern:
 *   - Auth middleware calls setUserId(req.user.userId) once auth resolves.
 *   - Model beforeCreate / beforeUpdate hooks read getUserId() and stamp
 *     created_by / updated_by.
 *   - Outside a request (cron jobs, seeders, tests) the store is empty and
 *     hooks fall through to null. The columns are nullable on purpose.
 */
type RequestContextStore = {
  userId?: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Establish a fresh context and run the callback inside it. Express
 * middleware uses this for every request; tests/jobs can use it to simulate
 * an actor.
 */
export const runWithContext = <T>(store: RequestContextStore, fn: () => T): T =>
  storage.run(store, fn);

export const getUserId = (): string | undefined => storage.getStore()?.userId;

/**
 * Mutate the current context. Used by the auth middleware to set userId
 * once auth has resolved (the request-context middleware runs first to
 * establish the empty store; auth fills it in).
 */
export const setUserId = (userId: string): void => {
  const store = storage.getStore();
  if (store) {
    store.userId = userId;
  }
};
