import React from 'react';
import clsx from 'clsx';

import { footerLink } from './Footer.css';

/**
 * AGPL-3.0 section 13: users interacting with the software over a network
 * must be offered the corresponding source. Every app footer renders this.
 */
export const SOURCE_CODE_URL = 'https://github.com/ideaSquared/adopt-dont-shop';

export type SourceCodeLinkProps = {
  className?: string;
};

export const SourceCodeLink: React.FC<SourceCodeLinkProps> = ({ className }) => (
  <a
    href={SOURCE_CODE_URL}
    className={clsx(footerLink, className)}
    target='_blank'
    rel='noopener noreferrer'
  >
    Source code
  </a>
);

SourceCodeLink.displayName = 'SourceCodeLink';
