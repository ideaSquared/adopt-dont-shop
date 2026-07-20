# Container Image Signing (Cosign + Sigstore)

Container images published to GHCR by `.github/workflows/deploy.yml` are
signed with [cosign](https://github.com/sigstore/cosign) using
[Sigstore](https://www.sigstore.dev/) **keyless** OIDC signing. The deploy
workflow refuses to roll out an image whose signature cannot be verified
against this repository's identity.

This document is the operator-facing reference for the system.

## Why we sign

Anyone with `packages: write` on the GHCR registry — humans, leaked tokens,
a future compromised CI step — could push a malicious image to
`ghcr.io/ideasquared/adopt-dont-shop/*`. Without verification, the deploy
host would happily pull and run it. Cosign keyless signing closes that gap:

- Each signature is bound to the **workflow identity** that produced it
  (the workflow file path and the branch it ran on) via a Fulcio-issued
  short-lived X.509 cert.
- The signature is recorded in the **Rekor public transparency log**, so
  retroactive tampering with signatures is detectable.
- No long-lived private key exists for an attacker to steal.

## How signing works

`.github/workflows/deploy.yml` runs on `workflow_dispatch` against `main`.
The `build-and-push` job:

1. Has `permissions: id-token: write` so the runner can mint an OIDC token.
2. After `docker push <image>:<sha>`, captures the registry digest from
   `docker inspect ... .RepoDigests`.
3. Runs `cosign sign --yes <image>@<digest>` — this:
   - Mints an OIDC token from GitHub Actions.
   - Exchanges it at Fulcio for a short-lived signing cert whose SAN
     identifies the workflow + branch.
   - Signs the image digest with the cert's ephemeral private key.
   - Uploads the signature + cert + Rekor inclusion proof to GHCR (next
     to the image, as a `sha256-<digest>.sig` tag).

Each of the fourteen images built by `deploy.yml` is signed individually:
the eleven `service-*` images (`service-gateway`, `service-auth`,
`service-notifications`, `service-pets`, `service-rescue`,
`service-applications`, `service-chat`, `service-moderation`,
`service-matching`, `service-audit`, `service-cms`) and the three `app-*`
images (`app-client`, `app-admin`, `app-rescue`).

## How verification works

The `verify-images` job runs **after** `build-and-push` and **before**
`deploy`. It:

1. Resolves each `:<sha>` tag back to its registry digest via
   `docker buildx imagetools inspect` (so we verify the immutable artifact,
   not whatever the tag happens to point at).
2. Runs `cosign verify` with:
   - `--certificate-oidc-issuer https://token.actions.githubusercontent.com`
   - `--certificate-identity-regexp '^https://github.com/ideaSquared/adopt-dont-shop/\.github/workflows/.+@refs/heads/main$'`
3. Fails the job — and the deploy — if any image lacks a valid signature
   produced by a workflow in this repo on `main`.

## Manual verification

To verify an image yourself (e.g. before bringing it up on a non-CI host):

```bash
# Install cosign — see https://docs.sigstore.dev/cosign/installation
SHA=<git-sha-you-want-to-verify>
IMAGES=(
  service-gateway service-auth service-notifications service-pets
  service-rescue service-applications service-chat service-moderation
  service-matching service-audit service-cms
  app-client app-admin app-rescue
)
for image in "${IMAGES[@]}"; do
  cosign verify \
    --certificate-identity-regexp '^https://github.com/ideaSquared/adopt-dont-shop/\.github/workflows/.+@refs/heads/main$' \
    --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
    "ghcr.io/ideasquared/adopt-dont-shop/${image}:${SHA}"
done
```

A successful verification prints the signed payload and Rekor entry. A
mismatch — wrong identity, wrong issuer, missing signature, Rekor entry
absent — exits non-zero.

## Emergency override

If the signing infrastructure is broken (Fulcio down, Rekor down, OIDC
broken on GitHub side) and you need to roll out **anyway**, the deploy
workflow accepts a `skip_cosign_verify` input on `workflow_dispatch`.

When to use it:

- A production-critical fix must ship and Sigstore public-good
  infrastructure is having a verified outage
  ([sigstore status](https://status.sigstore.dev/)).
- A rollback is required and Sigstore is unavailable.

When **not** to use it:

- "Verification failed and I don't know why." That is the signal working
  as designed. Investigate the identity mismatch before bypassing it —
  it usually means the image was built somewhere unexpected (a feature
  branch, a re-tagged image, a manual push).
- Routine deploys. There is no scenario where a normal deploy should
  need this flag.

Every use of `skip_cosign_verify=true` emits a `::warning::` annotation
in the workflow run and prints a `WARNING: cosign verification SKIPPED`
line in the job log, so the bypass is searchable in deploy history.

Since ADS-826 the flag also requires the `bypass_reason` dispatch input
(the run fails fast without it), records the bypass in the run summary
and in a `deploy-bypass-audit` issue, and — for production targets —
routes the deploy job to the `production-bypass` environment for
reviewer approval. See
[`docs/operations/deploy.md`](../operations/deploy.md#production-approval-gate).

## Known gaps

- `.github/workflows/rollback.yml` pulls and runs previously-built images
  without re-verifying their signatures. The images it pulls were signed
  by `deploy.yml` at the time they were built, so the trust chain is
  intact, but the rollback workflow does not enforce that on its own.
  Adding a parallel verify step there is tracked separately.

## References

- [Sigstore keyless signing overview](https://docs.sigstore.dev/cosign/signing/overview/)
- [`sigstore/cosign-installer` action](https://github.com/sigstore/cosign-installer)
- [Fulcio certificate transparency](https://github.com/sigstore/fulcio)
- [Rekor transparency log](https://github.com/sigstore/rekor)
