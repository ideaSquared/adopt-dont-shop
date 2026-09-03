# Cookies Policy

> **Source of truth for the published policy text.** The gateway serves this
> file verbatim at `GET /api/v1/legal/cookies` (read live from `LEGAL_DOCS_DIR`,
> default `docs/legal/`). The version identifier is hardcoded separately as
> `COOKIES_VERSION` in `services/gateway/src/routes/legal.ts`. Any change to the
> text below MUST bump that constant in the same PR — a new version triggers the
> re-acceptance flow (`LegalReacceptanceModal`, `packages/lib.legal`) on next
> sign-in. The cookie table in §4 is verified against
> `services/gateway/src/middleware/auth-cookies.ts` and
> `services/gateway/src/routes/csrf.ts` — re-check both before editing this
> file, since a name or attribute change there makes this table wrong again.

**Version:** 2026-05-10-v1
**Last updated:** 10 May 2026

> **Placeholder copy — must be reviewed and approved by legal counsel before
> production launch.**

This policy explains how Adopt Don't Shop uses cookies and similar
technologies on our websites and apps. It sits alongside the
[Privacy Policy](./privacy.md) and the [Terms of Service](./terms.md).

## 1. Who we are

Adopt Don't Shop is the data controller for the cookies described in this
notice. Contact our Data Protection Officer at privacy@adoptdontshop.app.

## 2. What cookies are

Cookies are small text files that a website places on your device when
you visit. We use them to keep you signed in, to protect your account
from cross-site request forgery, and — only with your consent — to
measure how the platform performs.

## 3. Lawful basis

We rely on two lawful bases under the UK GDPR and the Privacy and
Electronic Communications Regulations (PECR):

- **Strictly necessary cookies** — set without consent under PECR
  reg. 6(4), because they are required to deliver the service you have
  asked for (signing in, staying signed in, submitting forms safely).
  Lawful basis under UK GDPR is performance of a contract (Art. 6(1)(b))
  and our legitimate interest in securing the platform (Art. 6(1)(f)).
- **Analytics and performance cookies and similar technologies** — set
  only after you give explicit, prior consent (UK GDPR Art. 6(1)(a) and
  PECR reg. 6). You can withdraw consent at any time; withdrawing is as
  easy as granting it.

We do not use marketing or advertising cookies.

## 4. Cookies we set

The table below lists every cookie our platform sets today. If this
changes we will update this policy and bump the version.

| Name           | Category           | Purpose                                                                                                                                  | Retention  | JS-readable?                                             |
| -------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| `accessToken`  | Strictly necessary | Short-lived authentication token. Keeps you signed in between requests.                                                                  | 15 minutes | No                                                       |
| `refreshToken` | Strictly necessary | Long-lived authentication token, scoped to our sign-in endpoints only. Lets us issue a new `accessToken` without forcing you to sign in. | 30 days    | No                                                       |
| `hasSession`   | Strictly necessary | A presence flag with no secret in it. Lets the app show you as signed in without a network round trip.                                   | 30 days    | Yes                                                      |
| `csrfToken`    | Strictly necessary | CSRF (cross-site request forgery) defence: pairs with a request header so other sites cannot act as you.                                 | 4 hours    | Yes (by design — required for the double-submit pattern) |

All cookies are set with the `SameSite=Lax` attribute, and with the
`Secure` flag whenever you access the platform over HTTPS (which
production always does). `accessToken` and `refreshToken` are additionally
`HttpOnly`, meaning JavaScript running on the page can never read them —
only the two cookies above marked "JS-readable" can be, and neither of
those carries a secret that would let someone else act as you.

## 5. Analytics, performance, and error monitoring

We run **GlitchTip**, a self-hosted, Sentry-compatible error-tracking
tool, for error and performance monitoring, and use **Statsig** for
product analytics, feature experimentation, and optional session replay.

**Error monitoring is strictly necessary for service reliability.**
Wherever it is configured for your environment it captures unhandled
errors and performance traces so we can detect and fix outages,
regressions, and security issues that affect every user of the platform.
We rely on this under PECR reg. 6(4) (information society service
requested by the user) and on our legitimate interest in keeping the
platform secure and available under UK GDPR Art. 6(1)(f). Because it is
self-hosted on our own infrastructure rather than a third-party cloud
service, error data does not leave our systems. It transmits events over
HTTPS without setting cookies, and we do not send identifiable profile
data to it.

**Statsig is loaded only after you grant analytics consent** through the
on-site cookie banner. Until consent is granted, Statsig is not
initialised with auto-capture or session replay and no behavioural data
leaves your device. Statsig does not use the cookies in §4; it may store
its own identifiers in your browser's local storage rather than in a
cookie.

If you later withdraw analytics consent, Statsig auto-capture and session
replay stop on your next page load and its local identifiers can be
cleared from your browser's site-data settings. Error monitoring
continues to run because it is not part of the analytics consent scope.

## 6. Marketing and advertising

We do not set marketing or advertising cookies, and we do not share data
with ad networks. If this changes we will update this policy and ask for
fresh consent before any such cookie is set. (We do send marketing
emails to users who opt in — see your account notification preferences —
but that is not a cookie and is covered by the Privacy Policy instead.)

## 7. Managing your choices

You can manage cookies in two ways:

- **In our app.** The cookie banner on first visit lets you grant or deny
  analytics consent. You can change your choice at any time from the same
  control once you've made an initial decision.
- **In your browser.** Every modern browser lets you view, block, or
  delete cookies from settings. Blocking strictly necessary cookies will
  sign you out and prevent forms from submitting.

## 8. Your rights

You have the same rights over cookie-derived personal data as over any
other personal data we hold about you, including the right to access,
rectify, erase, restrict, object, and complain to the Information
Commissioner's Office (ico.org.uk). See the [Privacy Policy](./privacy.md)
for how to exercise these rights.

## 9. Changes

We may update this policy from time to time. The version string above
identifies the version you accepted; material changes will be notified
through the in-app re-acceptance flow on next sign-in.

## 10. Contact

Questions about cookies or this policy: privacy@adoptdontshop.app.
