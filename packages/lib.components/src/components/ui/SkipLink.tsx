import clsx from 'clsx';
import React from 'react';

import * as styles from './SkipLink.css';

export type SkipLinkProps = {
  /** Anchor target id of the main content area. Defaults to "main-content". */
  href?: string;
  /** Link label. Defaults to "Skip to main content". */
  children?: React.ReactNode;
  className?: string;
};

/**
 * Visually hidden link that becomes visible when focused via keyboard. Lets
 * keyboard and screen reader users bypass the navigation chrome and jump
 * straight to the main content region.
 */
export const SkipLink = ({
  href = '#main-content',
  children = 'Skip to main content',
  className,
}: SkipLinkProps) => (
  <a href={href} className={clsx(styles.skipLink, className)}>
    {children}
  </a>
);
