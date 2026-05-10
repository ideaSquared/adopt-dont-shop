# Privacy Policy

**Version:** 2026-05-10-v1
**Last updated:** 10 May 2026

> Placeholder copy — must be reviewed and approved by legal counsel before
> production launch. The version string above is the canonical
> identifier persisted in `consent_events.privacy_version` when a user accepts.

## 1. Who we are

Adopt Don't Shop is the data controller for the personal data described
in this notice. Contact our Data Protection Officer at
privacy@adoptdontshop.app.

## 2. What we collect

- **Account data:** email, name, phone number, date of birth.
- **Application data:** household and lifestyle answers, references,
  uploaded documents.
- **Technical data:** IP address, browser, device, log data needed to
  operate the platform securely.

## 3. Lawful basis

- **Contract** for account and application processing.
- **Legitimate interest** for platform-security logging.
- **Consent** for marketing emails (separately captured at registration).

## 4. Your rights

You may at any time:

- **Access / export** your data via `GET /api/v1/privacy/me/export`.
- **Delete** your account and request erasure via
  `POST /api/v1/privacy/me/delete`. Hard deletion follows after a
  30-day grace window in line with our retention policy.
- **Object** to processing or **restrict** processing by emailing
  privacy@adoptdontshop.app.

## 5. Retention

- Soft-deleted accounts: 30 days then hard-deleted.
- Notifications: 90 days.
- Refresh tokens: 30 days from last use.
- Idempotency keys: 24 hours.
- Email queue records: 1 year.
- Swipe actions: 24-month rolling window.
- Home-visit records: 5 years (regulatory retention).

These periods are enforced by an automated retention job; see
`service.backend/src/jobs/retention.job.ts`.

## 6. Children's data

We do not knowingly collect data from children under 13. Adoption
applications must be submitted by an adult; if a household includes
minors, parental consent is required to record their ages.

## 7. Third-party reference contacts

When you submit references on an adoption application, you confirm you
have informed those contacts that their details will be shared with the
adopting rescue and may be contacted to verify your application.

## 8. Changes

The version string above identifies the version each user accepted.
Material changes require re-acceptance.
