# Terms of Service

> **Source of truth for the published policy text.** The gateway serves this
> file verbatim at `GET /api/v1/legal/terms` (read live from `LEGAL_DOCS_DIR`,
> default `docs/legal/`). The version identifier is hardcoded separately as
> `TERMS_VERSION` in `services/gateway/src/routes/legal.ts`. Any change to the
> text below MUST bump that constant in the same PR — a new version triggers the
> re-acceptance flow (`LegalReacceptanceModal`, `packages/lib.legal`) on next
> sign-in.

**Version:** 2026-05-10-v1
**Last updated:** 10 May 2026

> **Placeholder copy — must be reviewed and approved by legal counsel before
> production launch.** The version string above is the identifier recorded
> against your acceptance (an append-only row in the `auth` service's consent
> store, `AuthService.RecordConsent`), separate from the current values also
> mirrored on `users.terms_accepted_at`.

## 1. Acceptance of terms

By creating an account on Adopt Don't Shop you agree to these Terms of
Service and to the [Privacy Policy](./privacy.md). If you do not agree, do
not create an account. When we publish a materially changed version, you'll
be prompted to review and accept it the next time you sign in before you
can continue using the platform.

## 2. Eligibility

You must be at least 18 years old to register an account. This is a
condition of use we ask you to confirm; see the Privacy Policy for our
position on data from children under 13.

## 3. Account security

You are responsible for maintaining the confidentiality of your
credentials and for all activity under your account. Tell us immediately
at privacy@adoptdontshop.app if you believe your account has been
compromised.

## 4. Acceptable use

You will not use the platform to harass, defraud, or impersonate other
users; to submit fraudulent adoption applications; or to scrape or
republish data outside of the user-facing product.

## 5. Termination

You may delete your account at any time — see the Privacy Policy for how.
We may suspend or terminate accounts that violate these terms.

## 6. Disclaimers

The service is provided "as is" without warranties of any kind. We do not
guarantee the accuracy of pet listings, adoption outcomes, or third-party
integrations. Rescue organisations, not Adopt Don't Shop, are responsible
for the pets they list and the adoption decisions they make.

## 7. Changes

We may update these terms from time to time. The version string above
identifies the version you accepted; material changes require
re-acceptance on next sign-in.

## 8. Contact

Questions about these terms: legal@adoptdontshop.app.
