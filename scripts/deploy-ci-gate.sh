#!/usr/bin/env bash
# deploy.yml's "CI passed on this commit" gate.
#
# Judges only the `CI` workflow (ci.yml) push run for the commit — the run
# whose `ci-required` job is the branch-protection check. The previous gate
# looked at every GitHub Actions check-suite on the SHA, which:
#   - let a deploy through while CI was still running (it only counted
#     completed suites), and
#   - blocked deploys on unrelated red runs on the same SHA: an earlier failed
#     Deploy attempt, or a scheduled workflow such as the nightly backup
#     (schedules run against the default branch's head commit).
#
# Input (env):
#   RUNS_JSON      body of GET /repos/{repo}/actions/workflows/ci.yml/runs
#                  ?head_sha=<sha>&event=push (newest run first)
#   SKIP_CI_CHECK  "true" tolerates CI that has not finished or never ran
#                  (emergency deploys). A CI run that FAILED always blocks.
set -euo pipefail

if [ -z "${RUNS_JSON:-}" ]; then
  echo "RUNS_JSON is not set" >&2
  exit 1
fi

if ! echo "$RUNS_JSON" | jq -e '.workflow_runs | type == "array"' > /dev/null; then
  echo "::error::Could not read CI workflow runs for this commit:"
  echo "$RUNS_JSON"
  exit 1
fi

status=$(echo "$RUNS_JSON" | jq -r '.workflow_runs[0].status // "none"')
conclusion=$(echo "$RUNS_JSON" | jq -r '.workflow_runs[0].conclusion // ""')

if [ "$status" = "completed" ]; then
  if [ "$conclusion" = "success" ]; then
    echo "CI passed on this commit. Proceeding with deploy."
    exit 0
  fi
  echo "::error::CI concluded '$conclusion' on this commit. Aborting deploy (skip_ci_check does not override a failed CI run)."
  exit 1
fi

if [ "$status" = "none" ]; then
  reason="CI has not run on this commit"
else
  reason="CI is still $status on this commit"
fi

if [ "${SKIP_CI_CHECK:-}" = "true" ]; then
  echo "WARNING: $reason — skip_ci_check=true, proceeding."
  exit 0
fi

echo "::error::$reason. Wait for it to pass, or re-dispatch with skip_ci_check=true for an emergency deploy."
exit 1
