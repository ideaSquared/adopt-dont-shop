#!/usr/bin/env bash
# deploy.yml's "this commit passed its checks" gate. Run once per check the
# deploy requires:
#   - the `CI` workflow (ci.yml) push run — whose `ci-required` job is the
#     branch-protection check — given as a workflow-runs response;
#   - the production smoke test (docker.yml's `Production Image Smoke (boot)`
#     job), given as a check-runs response.
#
# Judging one named check replaced looking at every GitHub Actions
# check-suite on the SHA, which:
#   - let a deploy through while CI was still running (it only counted
#     completed suites), and
#   - blocked deploys on unrelated red runs on the same SHA: an earlier failed
#     Deploy attempt, or a scheduled workflow such as the nightly backup
#     (schedules run against the default branch's head commit).
#
# Input (env):
#   RUNS_JSON      body of GET /repos/{repo}/actions/workflows/ci.yml/runs
#                  ?head_sha=<sha>&event=push, or of GET /repos/{repo}/commits/
#                  <sha>/check-runs?check_name=<name> (newest first either way)
#   CHECK_NAME     name used in messages (default: CI)
#   SKIP_CI_CHECK  "true" tolerates a check that has not finished or never ran
#                  (emergency deploys). A check that FAILED always blocks.
set -euo pipefail

if [ -z "${RUNS_JSON:-}" ]; then
  echo "RUNS_JSON is not set" >&2
  exit 1
fi

name="${CHECK_NAME:-CI}"

if ! echo "$RUNS_JSON" | jq -e '(.workflow_runs // .check_runs) | type == "array"' > /dev/null; then
  echo "::error::Could not read $name runs for this commit:"
  echo "$RUNS_JSON"
  exit 1
fi

status=$(echo "$RUNS_JSON" | jq -r '(.workflow_runs // .check_runs)[0].status // "none"')
conclusion=$(echo "$RUNS_JSON" | jq -r '(.workflow_runs // .check_runs)[0].conclusion // ""')

if [ "$status" = "completed" ]; then
  if [ "$conclusion" = "success" ]; then
    echo "$name passed on this commit."
    exit 0
  fi
  echo "::error::$name concluded '$conclusion' on this commit. Aborting deploy (skip_ci_check does not override a failed check)."
  exit 1
fi

if [ "$status" = "none" ]; then
  reason="$name has not run on this commit"
else
  reason="$name is still $status on this commit"
fi

if [ "${SKIP_CI_CHECK:-}" = "true" ]; then
  echo "WARNING: $reason — skip_ci_check=true, proceeding."
  exit 0
fi

echo "::error::$reason. Wait for it to pass, or re-dispatch with skip_ci_check=true for an emergency deploy."
exit 1
