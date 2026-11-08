#!/usr/bin/env bash
# Turns the deploy outcome the host recorded into a GitHub deployment status.
#
# deploy.yml's "Deploy to server" step writes /opt/ads/<env>/.deploy_outcome
# as "<run id> <outcome> [<sha>]" as it goes: `started`, then `success`,
# `rolled_back <sha>`, `rollback_failed <sha>` or `no_rollback_target`. The
# workflow's final step reads that file back and runs this script, which
# prints `state=` and `description=` lines for $GITHUB_OUTPUT. A marker from
# another run, or none at all, means this run never reached the server.
#
# The description is what ideasquared-bot shows in Discord, so it says in
# plain words whether the stack was rolled back and whether a person is
# needed. GitHub caps it at 140 characters.
#
# Usage: MARKER="<file contents>" RUN_ID=<run id> SHA=<git sha> scripts/deploy-status-description.sh
set -euo pipefail

marker="${MARKER:-}"
read -r marker_run outcome target <<< "$marker" || true

short() { printf '%s' "${1:0:7}"; }

emit() {
  printf 'state=%s\n' "$1"
  printf 'description=%s\n' "$2"
}

if [ "${marker_run:-}" != "$RUN_ID" ]; then
  emit failure "Deploy failed before reaching the server. See the logs."
  exit 0
fi

case "${outcome:-}" in
  success)
    emit success "Deployed $(short "$SHA"); health checks passed." ;;
  rolled_back)
    emit failure "Health check failed; rolled back to $(short "${target:-}"), which is healthy." ;;
  rollback_failed)
    emit failure "Health check failed; rollback to $(short "${target:-}") also failed. Manual action needed." ;;
  no_rollback_target)
    emit failure "Health check failed; no earlier version to roll back to. Manual action needed." ;;
  *)
    emit failure "Deploy failed before the health check. See the logs." ;;
esac
