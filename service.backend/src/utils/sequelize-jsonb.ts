import type { Model } from 'sequelize';

/**
 * Typed helper for writing a string-array attribute that is backed by a
 * PostgreSQL ARRAY column in production and a JSON-encoded TEXT column in the
 * test SQLite environment (see `getArrayType` in `../sequelize`).
 *
 * The dual storage means a setter on the model needs to call
 * `setDataValue(key, stringifiedJson | rawArray)` depending on the dialect.
 * Sequelize's `setDataValue` is strictly typed to the attribute's declared
 * shape (`string[]`), which forces an `as any` at every call site for the
 * test-mode string branch.
 *
 * This helper isolates the single justified cast — every model setter then
 * stays cast-free.
 */
export const setStringArrayAttr = <M extends Model>(
  instance: M,
  key: keyof M & string,
  value: readonly string[] | null | undefined
): void => {
  const arr = value ? [...value] : [];
  const stored: string | string[] = process.env.NODE_ENV === 'test' ? JSON.stringify(arr) : arr;
  // Sequelize types `setDataValue` against the model's attribute shape
  // (`string[]`), but in test mode the column is TEXT and accepts a JSON
  // string. The structural cast is necessary and isolated here.
  (instance.setDataValue as (k: string, v: unknown) => void)(key, stored);
};
