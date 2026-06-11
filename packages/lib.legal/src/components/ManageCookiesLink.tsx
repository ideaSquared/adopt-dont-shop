import { useCookieConsent } from './CookieBanner';
import * as styles from './ManageCookiesLink.css';

/**
 * ADS-497 (slice 5b): footer link that re-opens the cookie banner.
 *
 * The cookies policy (`docs/legal/cookies.md`) tells users to use the
 * on-page banner to withdraw or change their analytics consent. This
 * button is the entry point: clicking it clears the stored consent
 * record and dispatches the synthetic event that `CookieBanner` listens
 * for, so the banner re-appears without a page reload.
 *
 * Rendered as a `<button>` (not an `<a>`) because it triggers in-page
 * UI rather than navigating. Styled to look like an inline link so it
 * sits naturally next to existing "Privacy" / "Terms" footer links.
 */

type ManageCookiesLinkProps = {
  className?: string;
};

export const ManageCookiesLink = ({ className }: ManageCookiesLinkProps) => {
  const { openPreferences } = useCookieConsent();
  const composedClassName = className ? `${styles.link} ${className}` : styles.link;

  return (
    <button
      type='button'
      className={composedClassName}
      onClick={openPreferences}
      data-testid='manage-cookies-link'
    >
      Manage cookies
    </button>
  );
};
