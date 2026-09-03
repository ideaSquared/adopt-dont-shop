# Privacy Policy

> **Source of truth for the published policy text.** The gateway serves this
> file verbatim at `GET /api/v1/legal/privacy` (read live from `LEGAL_DOCS_DIR`,
> default `docs/legal/`). The version identifier is hardcoded separately as
> `PRIVACY_VERSION` in `services/gateway/src/routes/legal.ts`. Any change to the
> text below MUST bump that constant in the same PR — a new version triggers the
> re-acceptance flow (`LegalReacceptanceModal`, `packages/lib.legal`) on next
> sign-in. This revision corrects several technical inaccuracies in the prior
> draft (wrong self-service endpoints, an overstated retention-automation claim,
> an incomplete data inventory) — see the PR description for the list. Bumping
> `PRIVACY_VERSION` is a product decision (it force-reprompts every user) and is
> left to whoever merges the legal-counsel-reviewed version.

**Version:** 2026-05-10-v1
**Last updated:** 10 May 2026

> **Placeholder copy — must be reviewed and approved by legal counsel before
> production launch.** Bracketed items (company legal name, registered address,
> company number, DPO identity) are business facts this document cannot supply
> and must be filled in before publishing. Everything else describes what the
> platform's code actually does as of this revision — verify it hasn't drifted
> before relying on it; `docs/PRIVACY.md` (the engineering-facing field and
> retention inventory) is the deeper reference and should be re-checked in the
> same pass.

## 1. Who we are

**[Company legal name]**, a company registered in [jurisdiction] under
company number [company number], registered office [registered address]
("**we**", "**us**", "**Adopt Don't Shop**") is the data controller for the
personal data described in this notice. Contact our Data Protection Officer
at privacy@adoptdontshop.app.

## 2. What we collect

- **Account & profile:** name, email address, password (stored hashed —
  never in plain text), phone number, date of birth, profile photo, a short
  bio, timezone, and language preference.
- **Location:** country, city, address lines, and postcode you enter, plus,
  where you enable it, a precise geographic point used to show you nearby
  pets and rescues. You can leave location fields blank; some
  distance-based search features won't work without them.
- **Adoption applications:** household and lifestyle answers, references
  and their contact details (see §7), uploaded supporting documents, and
  home-visit records where a rescue schedules one.
- **Communications:** messages you send through the in-app chat with
  rescues, and support requests you raise with us.
- **Account security:** sign-in history, failed sign-in attempts, and — if
  you turn it on — two-factor authentication data.
- **Cookies and similar technologies:** see our [Cookies Policy](./cookies.md)
  for the full list and how to manage them.
- **Technical data:** IP address, browser and device information, and log
  data needed to operate the platform securely and diagnose faults.

We do not collect or process payment card details — the platform does not
currently process payments.

A field-by-field inventory, cross-referenced against the database schema
that actually defines it, is maintained in `docs/PRIVACY.md` for engineering
and compliance use.

## 3. Lawful basis

- **Contract** (UK GDPR Art. 6(1)(b)) for creating and running your account,
  processing adoption applications, and enabling chat with rescues.
- **Legitimate interest** (Art. 6(1)(f)) for platform-security logging,
  fraud prevention, and error monitoring.
- **Consent** (Art. 6(1)(a)) for analytics cookies (see the
  [Cookies Policy](./cookies.md)) and for marketing emails, which you can
  opt in or out of separately in your account notification preferences.
- **Legal obligation** (Art. 6(1)(c)) where we must retain or disclose
  records to comply with the law.

## 4. Your rights

You may at any time:

- **Request a copy of your data.** Email privacy@adoptdontshop.app. We do
  not yet have a self-service export button in the product; a member of our
  team will verify your identity and provide your data.
- **Request erasure of your account**, in-app: `Account Settings → Delete
account`, or directly via `POST /api/v1/users/me/erasure-request`
  (re-enter your password, and your two-factor code if enabled). This
  starts an automated process that anonymises or removes your personal
  data across every service that holds it — see §5. Track the status with
  `GET /api/v1/users/me/erasure-request/{correlationId}` (the ID is
  returned when you submit the request). Requests are limited to 5 per
  hour per account to prevent abuse.
- **Object** to processing or **restrict** processing, and raise any other
  UK GDPR right, by emailing privacy@adoptdontshop.app.
- **Complain** to the Information Commissioner's Office (ico.org.uk) if you
  are unhappy with how we've handled your data.

## 5. Retention

When you submit an erasure request (§4), we run an automated, cross-service
process: your account is anonymised (name, contact details, and other
identifying fields are cleared; your account row is kept only so far as
needed for referential integrity and any legal retention obligation below)
and every other service that holds data about you — pets, applications,
chat, notifications, and more — erases or anonymises its own records in
response.

Outside of an erasure request, these are our target retention periods for
routine housekeeping. Some of this is enforced by scheduled jobs today;
some is still manual and being automated — treat the periods below as our
policy commitment, not a guarantee every category is purged in real time
before that commitment is fully automated:

| Data                                      | Target retention                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| Soft-deleted / inactive accounts          | Anonymised on erasure request; otherwise retained while the account is open |
| Expired or revoked refresh tokens         | 30 days                                                                     |
| Read notifications                        | 90 days from being read                                                     |
| Sent transactional emails (queue records) | 1 year                                                                      |
| Swipe/discovery interactions              | 24-month rolling window                                                     |
| Home-visit records                        | 5 years (regulatory record-keeping)                                         |
| Audit and moderation records              | 7 years                                                                     |

## 6. Children's data

We do not knowingly collect data from children under 13. Creating an
account requires you to confirm you are 18 or older; this is a condition
of use we ask you to accept, not something the sign-up form independently
verifies today. If a household you describe in an application includes
minors, you may record their ages, but you must have the authority to
share that information.

## 7. Third-party reference contacts

When you submit references on an adoption application, you confirm you
have informed those contacts that their details will be shared with the
adopting rescue and that the rescue may contact them to verify your
application.

## 8. Changes

The version string at the top of this page identifies the version you
accepted. Material changes bump that version and trigger a re-acceptance
prompt the next time you sign in.
