#!/usr/bin/env bash
# ci-required aggregator gate (ADS-1327).
#
# `ci.yml`'s `ci-required` job fans in every regression-blocking job and is
# the single required status check branch protection points at. This script
# is its body: read a JSON object of job name -> { result: ... } (the shape
# GitHub Actions' `toJSON(needs)` produces) from the NEEDS_JSON env var, and
# fail if any job's `result` is `failure` or `cancelled`.
#
# `skipped` (a job a path filter didn't run, e.g. test-frontend on a
# backend-only PR) and `success` both pass — the standard "merge gate"
# pattern: a required check must not block a PR that never needed to run a
# given job.
#
# Extracted from ci.yml's inline `run:` block so the aggregator semantics are
# unit-testable (see ci-required-gate.test.mjs) independent of a live
# workflow run. Usage (mirrors the ci.yml step):
#   NEEDS_JSON='{"job-a":{"result":"success"}}' scripts/ci-required-gate.sh
set -euo pipefail

if [ -z "${NEEDS_JSON:-}" ]; then
  echo "NEEDS_JSON is not set" >&2
  exit 1
fi

echo "$NEEDS_JSON" | jq .

failed=$(echo "$NEEDS_JSON" | jq -r 'to_entries[] | select(.value.result == "failure" or .value.result == "cancelled") | .key')

if [ -n "$failed" ]; then
  echo "::error::Required jobs failed or were cancelled:"
  echo "$failed"
  exit 1
fi

echo "All required jobs passed or were skipped (path filter)."
