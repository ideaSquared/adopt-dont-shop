#!/bin/sh
# Non-root step-down for Dockerfile.dev (ADS-881).
#
# Why this exists: the dev image bakes node_modules as root (pnpm install
# runs at build time before any USER switch); those trees are re-exposed at
# runtime through ANONYMOUS volumes (see docker-compose.dev.yml's
# x-dev-volumes) layered under the host bind mount `.:/app`. A plain
# `USER node` in the Dockerfile would leave every node_modules anon volume
# root-owned, breaking anything the dev user needs to touch under it (bins,
# caches). Worse, the bind-mounted host source itself is owned by whatever
# uid the HOST developer has — which varies per machine — so a fixed baked
# uid can't reliably read/write it either (e.g. lib.types' `tsc --watch`
# writes real dist/ output onto the bind mount).
#
# This script runs as root (it's invoked by dumb-init, the image's
# ENTRYPOINT, before any privilege drop), then:
#   1. Renumbers the base image's `node` user/group to HOST_UID/HOST_GID —
#      set by scripts/docker-dev.mjs from the actual developer's uid/gid on
#      POSIX hosts, defaulting to 1000/1000 (also the `node` user's baked
#      uid/gid, and the common first-user uid on Linux) when unset, e.g. on
#      Windows where the launcher can't compute a POSIX uid. Matching the uid
#      means the container's writes into the bind-mounted host source behave
#      exactly like the host user's own — no chown of host-owned files
#      required, ever.
#   2. chowns ONLY the anonymous-volume node_modules paths (+ the user's own
#      home dir) to the (possibly renumbered) `node` user. These are
#      Docker-managed volumes, not the bind mount — chowning them never
#      touches a file that lives on the host disk.
#   3. Drops root via `setpriv` (part of util-linux, already present in the
#      base image — no extra third-party binary to fetch/trust) and execs
#      the real command (the compose `command:` for this service).
#
# Residual risk: if HOST_UID/HOST_GID aren't wired correctly for a given
# host (e.g. Windows, or a host where scripts/docker-dev.mjs wasn't used to
# launch the stack), writes into the bind-mounted source can still fail with
# EACCES once root is dropped. Verify by actually running `pnpm docker:dev`
# and confirming HMR + lib-types-watcher + migrations all still work.
set -eu

TARGET_UID="${HOST_UID:-1000}"
TARGET_GID="${HOST_GID:-1000}"

CURRENT_UID="$(id -u node)"
CURRENT_GID="$(id -g node)"

if [ "$TARGET_GID" != "$CURRENT_GID" ]; then
  groupmod -g "$TARGET_GID" node
fi
if [ "$TARGET_UID" != "$CURRENT_UID" ]; then
  usermod -u "$TARGET_UID" node
fi

# Anonymous-volume node_modules paths only (matches docker-compose.dev.yml's
# x-dev-volumes) plus the user's home dir — never the bind-mounted /app
# source itself. Globs that don't match anything are skipped by the -d test.
for dir in /app/node_modules /app/apps/*/node_modules /app/e2e/node_modules \
           /app/packages/*/node_modules /app/services/*/node_modules \
           /home/node; do
  [ -d "$dir" ] && chown -R "$TARGET_UID:$TARGET_GID" "$dir"
done

export HOME=/home/node

exec setpriv --reuid="$TARGET_UID" --regid="$TARGET_GID" --clear-groups --no-new-privs -- "$@"
