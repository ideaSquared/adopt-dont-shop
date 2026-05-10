# Screen-reader smoke runbook — cookie banner & re-acceptance modal

Audience: reviewer / QA. One page. Tick boxes as you go. This is a smoke test, not a WCAG conformance audit.

Automated coverage already lives in `lib.legal/src/components/CookieBanner.test.tsx` (and the modal's sibling test). It covers ARIA roles, Tab order, label associations, and Escape-handling _at the DOM level_. This runbook covers what jsdom can't: live screen-reader announcements, focus visibility, and contrast in motion.

## 1. Tools

Pick the OS you have. Don't try to test all three.

- **macOS — VoiceOver** (built in). Toggle: `Cmd+F5`. Quick start: `VO` = `Ctrl+Option`. Move next item: `VO+Right`. Read focused: `VO+F3`.
- **Windows — NVDA** (free). Install from <https://www.nvaccess.org/download/>. Start: `Ctrl+Alt+N`. Read focused: `NVDA+Tab` (`NVDA` defaults to `Insert`). Stop speech: `Ctrl`.
- **Linux fallback — Chrome ChromeVox extension** (<https://chrome.google.com/webstore/detail/screen-reader/kgejglhpjiefppelpmljglcjbhoiplfn>). Toggle: `Ctrl+Alt+Z`. Lower fidelity than VoiceOver / NVDA; only use if you have no Mac/Windows host.

Open `app.client` in a Chromium-based browser. Other browsers work but the test matrix below was sanity-checked on Chrome.

## 2. Cookie banner — first-visit smoke (anonymous, fresh localStorage)

Setup:

- Open DevTools → Application → Local Storage → delete the `legal-consent-v1` key (or use a fresh Incognito window).
- Sign out if signed in.
- Reload the homepage.

Checklist:

- [ ] Screen reader announces a region landmark named "Cookie consent" (note: shipped `aria-label` is `Cookie consent`, not "Cookie preferences").
- [ ] `Tab` into the banner. Each button announces with its visible label, in this order: "Essentials only, button", "Manage preferences, button, collapsed", "Accept all, button".
- [ ] Press `Enter` on "Manage preferences". Screen reader announces the expanded state ("expanded"). The analytics checkbox becomes reachable on next `Tab`.
- [ ] `Tab` to the analytics checkbox. Press `Space`. Reader announces the checked-state change.
- [ ] Re-press `Enter` on the trigger button. The disclosure collapses; reader announces "collapsed".
- [ ] Press `Esc` while focus is inside the disclosure. **Expected:** disclosure closes and focus returns to the "Manage preferences" trigger. **See Known Limitations §5 — this is currently NOT implemented in the live component, so this step is expected to FAIL today. File the failure rather than skip it.**

## 3. Re-acceptance modal — pending docs smoke (signed-in, stale ToS)

Setup:

- Get a user whose `details.tosVersion` (or `privacyVersion`) is older than the currently published `TERMS_VERSION` / `PRIVACY_VERSION`. Easiest path: in `service.backend`, run a quick SQL update on a seeded user, e.g. `UPDATE users SET details = jsonb_set(details, '{tosVersion}', '"2020-01-01"') WHERE email='adopter@example.test';`.
- Sign in as that user in `app.client`.

Checklist:

- [ ] On sign-in landing, screen reader announces the modal as "dialog, Updated legal documents".
- [ ] Initial focus lands inside the dialog (first focusable element). Reader reads it.
- [ ] `Tab` repeatedly. Focus cycles within the modal — never escapes to the page underneath. (Focus trap is intentional here, distinct from the banner.)
- [ ] Each pending item announces as "I accept the updated Terms of Service, checkbox, not checked" (or "Privacy Policy", etc.). The visible "New version: …" / "Read full …" text is reachable.
- [ ] Tick all pending checkboxes. The "Accept and continue" button announces as enabled. With one or more unticked, it announces as disabled.
- [ ] Press `Esc`. **Expected:** nothing happens (hard block — `closeOnEscape={false}`). Reader stays on the dialog.
- [ ] Click outside the dialog. Same — no dismissal.

## 4. Manage cookies link (footer)

Setup: complete §2 first so a stored consent record exists and the banner is hidden.

Checklist:

- [ ] `Tab` through the footer until you reach "Manage cookies". Reader announces it as a link/button.
- [ ] Press `Enter`. The cookie banner re-mounts.
- [ ] Reader announces the banner region. (It should fire the same announcement as §2 first-visit because the trigger clears `legal-consent-v1` and dispatches `legal-consent-v1:cleared`.)
- [ ] Focus does not get lost. If the banner appears off-screen of current focus, file it.

## 5. Known limitations (things automation cannot see)

- High-contrast mode (Windows "Contrast Themes", macOS "Increase contrast") may strip background colours from the banner — verify the banner is still distinguishable from page content.
- Custom focus-ring visibility under the dark theme: `:focus-visible` outlines should be at least 2 px and have ≥3:1 contrast with the adjacent surface.
- `prefers-reduced-motion`: the modal's open animation (from `lib.components/Modal`) should be reduced or skipped.
- ChromeVox on Linux is a known weaker reader. Discrepancies between ChromeVox and VoiceOver/NVDA should be reported against the reader, not the app, unless reproducible on at least two readers.
- Live announcements depend on the OS reader's verbosity setting. If a step "doesn't announce" on default verbosity, retry on "high" / "verbose" before filing.
- **Banner Escape-to-close (§2 last step):** not implemented. The `Manage preferences` disclosure is a plain expanded `div`; pressing Escape does nothing. Tracked as a follow-up — file as a known issue on first run, don't re-file each pass.
- **Banner accessible-name override (§2):** the analytics checkbox has both an `aria-label="Allow analytics cookies"` and a wrapping `<label>` whose visible text is "Analytics — Optional". The `aria-label` wins, so the announced name does not match the visible label. Track as a follow-up.
- **Banner disclosure has no `aria-controls`:** the "Manage preferences" trigger sets `aria-expanded` but does not point at the disclosure region. Some readers will not associate the two. Track as a follow-up.

## 6. Reporting issues

File findings in the project issue tracker with the `a11y` label. Include:

- OS + reader + version (e.g. "macOS 14.5, VoiceOver").
- Browser + version.
- The numbered checklist step that failed.
- The exact phrase the reader announced (or "no announcement").
- A short screen recording is welcome but not required — text reproduction steps are mandatory.

If the finding overlaps an item in §5 ("Known limitations"), comment on the existing issue rather than opening a new one.
