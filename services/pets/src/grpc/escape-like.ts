// Escapes Postgres LIKE / ILIKE wildcard characters in user-supplied
// search input so it is matched as a literal substring, not a pattern.
//
// Without this, a caller-supplied '%' or '_' becomes a wildcard instead
// of a literal character — params are still $n-parameterised (no SQL
// injection), but an unescaped '%' turns a breed/name filter into
// "match everything", enabling catalogue enumeration and forcing an
// expensive full scan. Backslash is escaped first so the subsequent
// replacements don't double-escape the backslashes they emit. Same
// pattern as services/rescue/src/grpc/handlers.ts's name search.
//
// Pair with the standard `%foo%` (or prefix `foo%`) wrap:
//   params.push(`%${escapeLikePattern(userInput)}%`);
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, c => `\\${c}`);
}
