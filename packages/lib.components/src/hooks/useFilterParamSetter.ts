import { useCallback } from 'react';
import type { SetURLSearchParams } from 'react-router';

export type FilterParamSetterOptions = {
  /** Also drop the `page` param so a filter change returns to the first page. */
  resetPage?: boolean;
};

/**
 * Returns a setter that writes one filter into the URL query string. An empty
 * value or `'all'` removes the param. History is replaced, not pushed, so
 * filter tweaks do not clutter the back stack.
 */
export const useFilterParamSetter = (
  setSearchParams: SetURLSearchParams,
  { resetPage = false }: FilterParamSetterOptions = {}
) =>
  useCallback(
    (key: string, value: string) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (value && value !== 'all') {
            next.set(key, value);
          } else {
            next.delete(key);
          }
          if (resetPage) {
            next.delete('page');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, resetPage]
  );
