---
name: logging
description: >
  How every ideaSquared product logs: through @ideasquared/log, with fixed messages, declared fields and no
  personal data or secrets. Apply whenever you add, change or review a log line, an error report, a console
  call or a test that checks log output, in any server-side code (Workers, services, bots, cron jobs).
---

# Logging

Every ideaSquared product logs through [`@ideasquared/log`](https://github.com/ideaSquared/agent-idea/tree/main/packages/log),
modelled on Monzo's slog. Logs are read by people and by LLMs through Agent Idea, so the hard rule is:

> **No personal data and no secrets in logs. Ever.**

Agent Idea also sanitises what it serves, but that is the safety net. The logger is the first defence.

## Rules

1. **Never call `console.*` in server-side code.** Use the project's logger. CI fails on a direct `console` call
   (ESLint `no-console` where the repo has ESLint, otherwise a `console` check in CI). Browser code, CLI scripts
   that print to a person's terminal, and tests are exempt. A justified exception (rare, and reviewed) carries
   `// eslint-disable-next-line no-console -- <reason>` in an ESLint repo, or `// logging-exempt: <reason>` on the
   same line elsewhere.
2. **The message is a fixed string literal**, describing what happened: `'sync failed'`, `'pick served'`.
   Never build it from data. The type rejects `` `sent to ${email}` `` and string variables.
3. **Data goes in declared fields**, listed once where the logger is created. Values are string, number,
   boolean or null; never objects.
4. **Log ids, not people.** `userId`, `accountId`, `householdId`, `matchId`. Never emails, names, usernames,
   display names, player names, Steam IDs, Discord user IDs, IPs, phone numbers, addresses, postcodes, slugs
   that name a person, chat or message text, tokens, passwords, cookies, webhook URLs, request or response
   bodies, or headers. The logger refuses to declare fields with PII-shaped names (`email`, `name`, `ip`,
   `token`, `session…`, `steamId`, …). Do not rename a field to get round that. The one exception is an audit
   event recording which staff member did something: it may carry their GitHub login as `actor`. Never an end
   user's identity.
5. **Errors go in the third argument**: `log.error('sync failed', { accountId }, error)`, so the type, message
   and stack are kept. Don't interpolate `error.message` into the message.
6. **Routes are templates**, never raw paths: `/api/v1/creators/:slug`, not `/api/v1/creators/alex`. Use the
   framework's route pattern (Hono `routePath`, Fastify route URL).
7. **Third-party response bodies** (Discord, Resend, Stripe, …) can echo personal data: log the status, not the
   body.

## Setup

Install the released tarball (see the agent-idea releases for the latest `log-v*` version):

```bash
pnpm add https://github.com/ideaSquared/agent-idea/releases/download/log-v0.1.1/ideasquared-log-0.1.1.tgz
```

The lockfile pins it with an integrity hash. Don't install from a git URL or `github:` spec: those can record an SSH
clone CI cannot fetch, and `turbo prune` drops the subfolder path.

Create one logger per service, in one file (for example `src/lib/log.ts`), and import it everywhere:

```ts
import { createLogger } from '@ideasquared/log';

export const log = createLogger({
  service: 'creatorgrid-api', // the Worker script or service name
  fields: ['accountId', 'platform', 'count', 'requestId'],
});
```

## Use

```ts
log.info('sync processed', { platform: 'youtube', count: 3 });
log.warn('thumbnail fetch failed', { platform }, error);
log.error('sync failed', { accountId }, error);

const request = log.with({ requestId }); // context carried on every event
request.info('pick served', { count: 1 });
```

Need a new field? Add it to the logger's `fields` list. If the logger refuses the name, the data is probably
personal: log an id or a count instead. `hostname`, `filename` and `pathname` are allowed despite ending in
`name`. For anything else that is genuinely not personal, pick a clear name the rule allows and mention it in the
PR; widening the allowlist is a change to `@ideasquared/log` itself.

## Testing

Assert behaviour through log events, and assert that nothing personal is logged.

```ts
import { createLogger, memorySink } from '@ideasquared/log';

const sink = memorySink();
const log = createLogger({ service: 'test', fields: ['accountId'], sink });
// ... run the code under test with `log` ...
expect(sink.events.map((event) => event.message)).toContain('sync failed');
for (const event of sink.events) expect(JSON.stringify(event)).not.toContain('alex@example.com');
```

When the logger is a module singleton, spy on `console` and parse the JSON line instead. When checking for a
leaked name, check the bare value (`Bo`), not a quoted one (`"Bo"`): quotes are escaped inside JSON.

## Reading logs

`idea logs <project>` (see the Agent Idea README) returns sanitised events, gated by write access to the repo.
