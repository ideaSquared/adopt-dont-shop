# ads-ops

## Purpose

`pnpm ops` is the developer CLI for running allow-listed gRPC RPCs against **dev**, **staging** and
**prod** through `service.ops`. Reads are masked, writes are previewed first, and anything risky
asks you to think before it runs.

## Location in the architecture

```
pnpm ops (this package) --HTTP/JSON, SSH tunnel for staging/prod--> services/ops --gRPC--> services/<name>
```

It never holds a signing key. It talks HTTP to `service.ops` (contract:
`packages/ops-contract/src/index.ts`), and `service.ops` decides what you may call. Design and
trade-offs: [ADR 0016](../../docs/adr/0016-developer-ops-cli.md); operator procedures:
[`docs/runbooks/ops-cli.md`](../../docs/runbooks/ops-cli.md).

## 60-second quick start

```bash
pnpm ops setup            # 1. only needed for staging / prod (dev needs nothing)
pnpm ops login            # 2. sign in (dev: one question, once. staging/prod: GitHub code)
pnpm ops use staging      # 3. optional: pick the environment you work in (default: dev)
pnpm ops                  # 4. browse: pick a service, a command, fill in the fields
```

Or skip the browser and type it:

```bash
pnpm ops pets                              # what can I do with pets?
pnpm ops pets list --status available      # run a read
pnpm ops pets update-status <id> --status adopted   # preview a write, then confirm
```

For **dev**, start the stack first (`pnpm docker:dev`) and you are done: `pnpm ops login` asks what
name to use (it suggests your git `user.name`) and remembers it.

Everything is lazy. The first command in an environment opens the SSH tunnel if it is not up, signs
you in if your session is missing or expired, and fetches the command list (cached for an hour,
`--refresh` to bypass). Then your original command carries on.

## Commands

| Command                                                           | What it does                                        |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| `pnpm ops`                                                        | Interactive browser (needs a terminal)              |
| `pnpm ops help` / `--help`                                        | Short overall help                                  |
| `pnpm ops setup`                                                  | Wizard for SSH host / user / key per environment    |
| `pnpm ops login` / `logout`                                       | Sign in / forget this environment's session         |
| `pnpm ops use <dev\|staging\|prod>`                               | Remember the environment you work in                |
| `pnpm ops <service>`                                              | List a service's commands                           |
| `pnpm ops <service> <command> --help`                             | Fields, enum values, safety notes, dry-run mode     |
| `pnpm ops <service> <command> [id] ...`                           | Run a command                                       |
| `pnpm ops whoami`                                                 | Who you are, session expiry, active unlocks         |
| `pnpm ops unlock <user\|rescue\|application> <id>` / `unlock any` | Reveal hidden personal data (break-glass)           |
| `pnpm ops lock`                                                   | Revoke your unlocks                                 |
| `pnpm ops history [n]`                                            | Your recent commands, from the server's audit trail |
| `pnpm ops again`                                                  | Re-run your last command (writes preview again)     |
| `pnpm ops tunnel status` / `stop [all]`                           | Inspect or close the SSH tunnel                     |
| `pnpm ops doctor`                                                 | Checklist of what is working and what is not        |
| `pnpm ops completion <zsh\|bash\|fish>`                           | Shell completion                                    |
| `pnpm ops --version`                                              | Version                                             |

Global options (put them after the command): `-e/--env <env>`, `-o/--output pretty|table|json`,
`--json '{...}'`, `-y/--yes`, `--refresh`, `--no-color`.

The environment is chosen by, in order: `-e/--env`, the `ADS_OPS_ENV` variable, `pnpm ops use`, then
`dev`.

### Examples

```bash
pnpm ops setup
pnpm ops login -e staging
pnpm ops use prod
pnpm ops pets list --status available --limit 5
pnpm ops pets list --tags friendly,senior --tags quiet      # repeat the flag or use commas
pnpm ops pets get 0b1c2d3e-0000-4000-8000-000000000001      # the id is a positional argument
pnpm ops pets update-status <id> --status adopted --no-notify-adopter
pnpm ops <service> <command> --json '{"filter":{"rescueId":"..."}}'   # nested fields: --json
pnpm ops pets list -o json | jq '.pets[].name'              # raw, still-masked JSON for scripts
pnpm ops pets list -o table                                 # force a table
pnpm ops pets update-status <id> --status adopted --yes     # dev / staging only, never prod
pnpm ops unlock user 3f2a... --reason "Chasing a failed adoption email" --ticket ADS-123 --ttl 30
pnpm ops lock
pnpm ops again
pnpm ops history 50
pnpm ops tunnel stop all
pnpm ops doctor
eval "$(pnpm --silent ops completion zsh)"                  # then: ads-ops pets <TAB>
```

How flags are built from the proto request message:

- Field names become kebab-case flags: `includeArchived` is `--include-archived`.
- Booleans are `--flag` and `--no-flag`. Numbers are parsed and checked.
- Enums accept short, case-insensitive names: `--status adopted` means `PET_STATUS_ADOPTED`. A
  typo suggests the closest value.
- Repeated fields: repeat the flag or use a comma list.
- Nested messages and maps can only be set with `--json '{...}'`. Flags override `--json`.
- The positional argument fills the first required field named `id` or ending in `Id` (or the first
  field when there is none). proto3 has no "required", so identifiers are treated as required.
- Unknown flags are an error with a suggestion (`Did you mean --status?`), and so are unknown
  commands (`Did you mean update-status?`).

## What it looks like

These are real captures with the colours removed. In your terminal: dev is a green `●`, staging is
amber, prod is a white-on-red `PRODUCTION` badge; READ is cyan, WRITE and hidden values are
magenta, ids are dim cyan, errors are red.

A service:

```
  ● dev

  pets  4 commands

    list           READ   List pets, optionally filtered by status
    get            READ   Fetch one pet by id
    update-status  WRITE  Change a pet's adoption status
    announce       WRITE  Email subscribers about a pet

  Details: pnpm ops pets <command> --help
```

A read (personal data is masked by the server):

```
  ● dev

  pets (4)
    PET ID                                NAME       STATUS     CONTACT EMAIL  CREATED AT
    0b1c2d3e-0000-4000-8000-000000000001  Biscuit    available  ‹hidden›       12 Oct 2026, 14:03
    0b1c2d3e-0000-4000-8000-000000000002  Marmalade  pending    ‹hidden›       11 Oct 2026, 14:03
    +2 more columns (use --output json)

  total  4

  ▲ 4 fields hidden  pets[].contactEmail (x4)

  15ms
```

In a terminal that last line is followed by:
`4 fields hidden. Unlock everything? Needs a reason + ticket and alerts #ops.`

A write preview:

```
  ● dev

  ● DRY RUN - rolled back, nothing changed
  pets.UpdateStatus

  Request
    petId   0b1c2d3e-0000-4000-8000-000000000002
    status  adopted

  Would respond
    pet
      petId         0b1c2d3e-0000-4000-8000-000000000002
      name          Marmalade
      status        adopted
      contactEmail  ‹hidden›

  Plan valid until 8 Nov 2026, 19:28

◆  Run this for real?
│  ○ Yes / ● No
```

In prod you also get a full-width red `PRODUCTION - changes here are real` banner, and instead of
the yes/no question: `Type prod to run this for real`.

An error:

```
  ┌─ ✖ NOT_FOUND
  │  pet not found
  │
  │  › Check the id
  └
```

`pnpm ops whoami`:

```
  ● dev

  Operator  alice
  Env       dev
  Session   expires 9 Nov 2026, 03:18 (in 7h 59m)

  Unlocks
    ● user 3f2a...  ADS-123  14 min left, until 12 Oct 2026, 14:30
```

On a terminal without unicode the symbols fall back to ASCII (`*`, `v`, `x`, `!`, `>`). Colour
follows `NO_COLOR`, `FORCE_COLOR` and `--no-color`.

## Safety model, in plain words

**Reads run immediately, but personal data is masked.** `service.ops` hides every field it is not
sure is safe (anything marked `PII` / `SPECIAL` in the proto, and unmarked text fields). You see
`‹hidden›` in its place and a count of how many fields were hidden.

**Writes preview first.** A write never changes anything on the first call. You get a dry run: the
request as the server understood it, what it would have returned, and any warnings. For most writes
the dry run really runs the handler inside a transaction that is always rolled back (`DRY RUN -
rolled back, nothing changed`). A few things cannot be simulated, such as sending email, and those
say `PREVIEW ONLY - not simulated` and list what would happen.

**Running for real needs a plan.** After a preview you answer `Run this for real?` (default No).
The CLI then sends the plan id from that preview. The server only accepts it for the same
environment, command and request, from the same person, within 10 minutes, once.

**Prod adds friction on purpose.** A red banner, and you must type `prod`. `--yes` is refused in
prod. Without a terminal (scripts, CI) the CLI never prompts: it prints the plan and exits 0
without changing anything, unless you pass `--yes` (dev and staging only).

**Unlocks are break-glass.** To see hidden data you give a reason (10+ characters), a ticket
(`ADS-123`) and a time limit (default 30, max 60 minutes), scoped to one user / rescue /
application or `any`. It alerts `#ops`, is audited, and expires by itself. When a result has hidden
fields the CLI offers the unlock and re-runs your command. When your request looks up by something
personal (an email, say) it offers the unlock before calling. In staging and prod, an unlock is
refused unless the `#ops` alert is actually delivered.

**You always reach the environment you picked.** Every request says which environment the CLI
expects, and `service.ops` refuses anything else before you even log in, so a tunnel pointed at the
wrong stack fails loudly instead of quietly working against prod. A bare `--env` (no value) is an
error rather than falling back to your saved environment.

**`tunnel stop` only stops your tunnel.** It checks the recorded process really is this
environment's `ssh -L` forward before signalling it, so a stale pid file can never kill something
else. On Windows it asks you to close the ssh process yourself.

**Your session is yours.** Sessions live in `sessions.json` (mode 0600), expire after a few hours,
and `pnpm ops logout` revokes them. Staging and prod sign in with a GitHub device code and require
membership of the environment's ops team. History keeps only the command line you typed, never
responses.

## Troubleshooting

Run `pnpm ops doctor`. It checks, in order, and stops short with a next step:

```
  ✔ Config    /home/you/.config/ads-ops/config.json
  ✔ ssh       OpenSSH_9.6p1
  ✔ SSH settings  ads-ops@ops.example.com
  ✔ Tunnel    up on port 14101
  ✔ Server    http://127.0.0.1:14101/health/ready
  ✔ Session   signed in as alice
  ✔ Catalog   10 services, 64 commands
  ✔ Clock     within 1s of the server

  Everything looks good.
```

| You see                               | Try                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `Can't reach dev.`                    | Start the stack: `pnpm docker:dev`. Then `pnpm ops doctor`.                      |
| `Can't reach staging.`                | `pnpm ops doctor`; then `ssh <user>@<host>` once by hand to accept the host key. |
| `No SSH settings for staging yet.`    | `pnpm ops setup`.                                                                |
| `You are not signed in` (no terminal) | Run `pnpm ops login` in a terminal once.                                         |
| `UNAUTHENTICATED`                     | Your session expired or was revoked: `pnpm ops login`.                           |
| `NOT_ENABLED`                         | That RPC is not on the allow-list. Ask for it to be added.                       |
| `PLAN_EXPIRED` / `PLAN_MISMATCH`      | Run the command again; plans last 10 minutes and are single use.                 |
| `UNLOCKS_DISABLED`                    | The alert channel is not configured in that environment, so unlocks are refused. |
| Clock warning in `doctor`             | Sync your clock; large skew makes sessions look expired.                         |
| "config file is unreadable"           | Delete the file it names and run `pnpm ops setup` again.                         |
| Stale command list                    | Add `--refresh` to any command.                                                  |

The tunnel is a background `ssh -N` process. `pnpm ops tunnel status` shows it, `pnpm ops tunnel
stop` closes it.

## Files

Config lives in `$XDG_CONFIG_HOME/ads-ops`, or `~/.config/ads-ops`, or `%APPDATA%\ads-ops` on
Windows.

| Path            | Contents                                                                          |
| --------------- | --------------------------------------------------------------------------------- |
| `config.json`   | `currentEnv`, SSH host / user / identity file for staging and prod, the dev login |
| `sessions.json` | Session tokens per environment (mode 0600)                                        |
| `cache/`        | The command catalog per environment (1 hour)                                      |
| `tunnels/`      | pid file per open SSH tunnel                                                      |
| `history.jsonl` | Your last 200 commands, argv only (used by `pnpm ops again`)                      |

Every file is validated. A corrupt `config.json` stops with a message on how to reset it; the
others are disposable and simply recreated.

## Trying it without a server

```bash
node packages/ops-cli/scripts/fake-ops-server.mjs     # canned responses on 127.0.0.1:4100
pnpm ops login && pnpm ops pets
```

`fake-ops-server.mjs` is a dev aid, not a test double for `service.ops`.

## Scripts

```bash
pnpm --filter @adopt-dont-shop/ops-cli test
pnpm --filter @adopt-dont-shop/ops-cli type-check
pnpm --filter @adopt-dont-shop/ops-cli lint
pnpm --filter @adopt-dont-shop/ops-cli format:check
```

Layout: IO sits at the edges (`bin.ts`, `cli.ts`, `system.ts`, `prompts.ts`); everything else takes
a `Ctx` (fetch, clock, spawn, prompts, stdout) so tests run without a network, a terminal or a
tunnel. `ui/theme.ts` is the only place that decides colour and symbols.

## Public API / exports

None for other packages: this is an executable (`bin: ads-ops`, run as `pnpm ops` from the repo
root). `src/index.ts` exports `main(argv, ctx)` for tests only.

## Environment variables consumed

| Variable                      | Effect                                                |
| ----------------------------- | ----------------------------------------------------- |
| `ADS_OPS_ENV`                 | Environment for this shell (overridden by `-e/--env`) |
| `XDG_CONFIG_HOME` / `APPDATA` | Where the config directory lives                      |
| `NO_COLOR` / `FORCE_COLOR`    | Turn colour off / force it on (also `--no-color`)     |

## Testing notes

Vitest with an injected `Ctx` (fake fetch, clock, spawn, prompts, stdout); no network, terminal or
tunnel. Assertions strip ANSI. `bin.ts`, `cli.ts`, `system.ts` and `prompts.ts` are the real process
edges and are excluded from coverage.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
