// Escapes Postgres LIKE / ILIKE wildcard characters in user-supplied search
// input so it is matched as a literal substring, not a pattern. Backslash is
// escaped first so the later replacements don't double-escape. Same helper
// as services/applications, services/pets and services/rescue keep locally.
//
// Pair with the `%foo%` wrap: params.push(`%${escapeLikePattern(input)}%`).
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, c => `\\${c}`);
}
