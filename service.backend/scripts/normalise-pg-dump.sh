#!/usr/bin/env bash
#
# normalise-pg-dump.sh — strip non-semantic noise from a pg_dump --schema-only
# stream so two dumps can be byte-compared with `diff`.
#
# Reads SQL on stdin, writes the normalised stream on stdout.
#
# What is considered noise (and stripped):
#   - Header lines (-- PostgreSQL database dump …, -- Dumped from / by …,
#     SET … directives at the top of the dump).
#   - SQL line comments (`-- …` lines).
#   - `COMMENT ON …` statements (these can include the dump-time pg version).
#   - `SET` statements (search_path, statement_timeout, …) — these vary by
#     pg_dump version, not by schema.
#   - Blank lines and trailing whitespace.
#
# What is considered a known asymmetry between migrate-bootstrapped and
# sync-bootstrapped DBs (whole statements stripped):
#   - The `SequelizeMeta` table — only DB-A has it. Excluded at pg_dump time
#     by --exclude-table, but we also strip any residual reference here.
#   - The `audit_logs_immutable` trigger and `audit_logs_reject_mutation`
#     function from migration 11 (ADS-508). These are installed only by the
#     forward migration, not by sync(); they remain a known asymmetry until
#     the migration moves into a per-domain baseline.
#
# After stripping, statements are sorted to neutralise any ordering
# differences pg_dump introduces between two databases that have the same
# objects but were built in different orders.
#
# Statement boundary detection:
#   pg_dump uses dollar-quoted strings (`$$ … $$`) for CREATE FUNCTION /
#   trigger bodies. Splitting naïvely on `;` would chop those bodies in
#   half. The awk pass below tracks dollar-quote depth and only treats a
#   trailing `;` as a statement terminator when depth == 0.
#
# Idempotent: normalising an already-normalised dump is a no-op.

set -euo pipefail

# Pin sort order so behaviour is identical across locales / CI runners.
export LC_ALL=C

# Single awk program that:
#   1. Drops noise lines (comments, SET, blank).
#   2. Concatenates remaining lines into statements, tracking $$ depth.
#   3. Drops statements containing an asymmetry marker.
#   4. Emits surviving statements separated by NUL for sort -z.
filter_and_split() {
  awk '
    BEGIN {
      asym_count = 4
      asym[1] = "audit_logs_immutable"        # trigger from migration 11
      asym[2] = "audit_logs_reject_mutation"  # function from migration 11
      asym[3] = "\"SequelizeMeta\""           # sequelize-cli internal
      asym[4] = "SequelizeMeta"               # unquoted form, belt-and-braces
      depth = 0
      buf = ""
    }

    # Line-level noise filter — only outside a dollar-quoted body. Inside
    # a body these patterns can appear legitimately (e.g. `-- comment`
    # inside a plpgsql function), so we keep them.
    {
      line = $0
      if (depth == 0) {
        if (line ~ /^[[:space:]]*--/) next
        if (line ~ /^SET[[:space:]]/) next
        if (line ~ /^SELECT[[:space:]]+pg_catalog\.set_config/) next
        if (line ~ /^COMMENT[[:space:]]+ON[[:space:]]/) next
        if (line ~ /^[[:space:]]*$/ && buf == "") next
      }

      # Update dollar-quote depth by counting `$$` occurrences on this line.
      # pg_dump only uses bare `$$` as a delimiter; tagged forms ($foo$) are
      # not emitted by the schema-only dump format we target.
      n = gsub(/\$\$/, "&", line)  # count without modifying
      depth = depth + n
      depth = depth % 2  # toggle: even = outside, odd = inside

      buf = (buf == "" ? line : buf "\n" line)

      # A statement ends when we see a `;` at end-of-line AND we are no
      # longer inside a dollar-quoted body.
      if (depth == 0 && line ~ /;[[:space:]]*$/) {
        emit(buf)
        buf = ""
      }
    }

    END {
      if (buf != "") emit(buf)
    }

    function emit(stmt,    i, trimmed) {
      # Strip leading/trailing whitespace.
      sub(/^[[:space:]]+/, "", stmt)
      sub(/[[:space:]]+$/, "", stmt)
      if (stmt == "") return
      # Drop if any asymmetry marker appears anywhere in the statement.
      for (i = 1; i <= asym_count; i++) {
        if (index(stmt, asym[i]) > 0) return
      }
      printf "%s\0", stmt
    }
  '
}

# Sort the NUL-delimited stream, then emit one statement per output block
# separated by a blank line for readability.
filter_and_split \
  | sort -z \
  | awk -v RS='\0' -v ORS='\n\n' '
      $0 != "" { print }
    '
