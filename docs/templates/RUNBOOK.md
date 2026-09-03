<!--
Template for a production incident runbook under docs/runbooks/.

A runbook is for an on-call engineer with shell access on the prod host and no
context. Numbered steps, one command per step, the expected output, and what a
bad output means. Mark irreversible steps **DESTRUCTIVE** in bold. Keep it to
one page.

This template is for INCIDENT runbooks (symptom → fix). State/setup GUIDES
(how a subsystem is configured, capacity planning, one-time provisioning) live
in docs/operations/, not here. Copy the skeleton below, delete this comment,
and fill every section. Delete a section only if it genuinely does not apply
(say why in one line rather than leaving it blank).
-->

# &lt;Symptom as an on-call engineer would name it&gt;

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** YYYY-MM-DD
> **Related alerts:** `AlertName` (`infra/prometheus/rules/<file>.yml`, severity `critical`/`warning`), or _none — manual trigger_

## Symptoms

What you observe. Dashboards, log lines, user reports. Include the literal
error strings someone would paste into a search box.

## Preconditions

Access, credentials, and env vars needed before step 1 (see the shared list in
[`runbooks/README.md`](../runbooks/README.md#preconditions)). Anything that would make you stop and
hand off instead — e.g. "you need prod SSH; if you don't have it, escalate now".

## Triage in 60 seconds

Two or three commands that decide "is this actually the thing this runbook
covers?" Say what a NO answer means and which runbook to open instead.

## Diagnosis

Numbered. Each step = one command + the expected output + what a bad output
means.

1. `docker compose -f docker-compose.prod.yml ps service-<name>`
   Expected: `Up (healthy)`.
   If `restarting` → jump to step 4.

## Mitigation

Numbered, ordered least-destructive first. Each step = command + expected
output + how to tell it worked. Mark irreversible steps **DESTRUCTIVE** in bold.

## Verify

Explicit pass criteria: the metric, the query, the threshold, the time window.
"Error rate back under 1% for 5 consecutive minutes on <dashboard>."

## Rollback

How to undo everything above if the mitigation made it worse. If a step is
irreversible, say so here rather than leaving it implied.

## Escalate

Who/what, with the trigger condition ("no recovery after 15 minutes" / "data
loss suspected") and the exact context to hand over.

## Capture

Logs, metrics screenshots, and the timeline to attach to the incident ticket —
collected before you leave, because the data ages out fast.

## Related

Adjacent runbooks, the SLO this protects, the state guide in
`docs/operations/`, the ADR behind the design.
