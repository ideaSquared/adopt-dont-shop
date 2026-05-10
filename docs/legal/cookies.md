# Cookies Policy

**Version:** 2026-05-09-v1
**Last updated:** 9 May 2026

This policy explains how Adopt Don't Shop uses cookies and similar
technologies on our websites and apps. It sits alongside the
[Privacy Policy](./privacy.md) and the [Terms of Service](./terms.md).

## 1. Who we are

Adopt Don't Shop is the data controller for the cookies described in
this notice. Contact our Data Protection Officer at
privacy@adoptdontshop.example.

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

The table below lists every cookie set by Adopt Don't Shop today. If
this changes we will update this policy and bump the version.

| Name                                            | Category            | Purpose                                                                                                | Retention                  | Set by                       |
|-------------------------------------------------|---------------------|--------------------------------------------------------------------------------------------------------|----------------------------|------------------------------|
| `accessToken`                                   | Strictly necessary  | Short-lived authentication token. Keeps you signed in between requests.                                | 15 minutes                 | First-party (this service)   |
| `refreshToken`                                  | Strictly necessary  | Long-lived authentication token. Lets us issue a new `accessToken` without forcing you to sign in.     | 3 days                     | First-party (this service)   |
| `__Host-psifi.x-csrf-token` (production) / `psifi.x-csrf-token` (development) | Strictly necessary | CSRF (cross-site request forgery) defence. Pairs with a request header so other sites cannot act as you. | Session (cleared on browser close) | First-party (this service)   |

All three cookies are set with the `HttpOnly`, `SameSite=Strict`, and
(in production) `Secure` flags so that they cannot be read by
JavaScript and are never sent on cross-site requests.

## 5. Analytics, performance, and error monitoring

We use **Statsig** for product analytics, feature experimentation, and
optional session replay, and **Sentry** for error and performance
monitoring. Both are loaded only after you grant analytics consent
through the on-site banner.

Statsig stores its identifiers in your browser's `localStorage` rather
than in a cookie; Sentry transmits events over HTTPS without setting
cookies. Neither tool runs before consent is granted, and no
identifiable data is sent to either tool while consent is denied or
unknown.

If consent is later withdrawn, the third-party SDKs stop on your next
page load and the local identifiers can be cleared from your browser's
site-data settings.

## 6. Marketing and advertising

We do not set marketing or advertising cookies, and we do not share
data with ad networks. If this changes we will update this policy and
ask for fresh consent before any such cookie is set.

## 7. Managing your choices

You can manage cookies in two ways:

- **In our app.** Use the cookie banner shown on first visit to grant
  or deny analytics consent. The banner returns when consent has not
  been recorded; you can also withdraw consent at any time from the
  same control once it has been granted.
- **In your browser.** Every modern browser lets you view, block, or
  delete cookies from settings. Blocking strictly necessary cookies
  will sign you out and prevent forms from submitting.

The on-site cookie banner is being rolled out; until it is live in
your app, withdraw analytics consent by clearing site data for
`adoptdontshop.example` in your browser's settings. The strictly
necessary cookies are unaffected by analytics consent.

## 8. Your rights

You have the same rights over cookie-derived personal data as over
any other personal data we hold about you, including the right to
access, rectify, erase, restrict, object, and complain to the
Information Commissioner's Office (ico.org.uk). See the
[Privacy Policy](./privacy.md) for how to exercise these rights.

## 9. Changes

We may update this policy from time to time. The version string above
identifies the version each user accepted; material changes will be
notified through the in-app re-acceptance flow on next sign-in.

## 10. Contact

Questions about cookies or this policy: privacy@adoptdontshop.example.
