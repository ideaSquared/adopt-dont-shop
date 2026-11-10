import clsx from 'clsx';
import React from 'react';

import * as styles from './PageHeader.css';

export type PageHeaderProps = {
  /** Rendered as the page's single `<h1>`. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons or menus aligned to the right; they wrap below the title on narrow screens. */
  actions?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
  'data-testid': dataTestId,
}) => (
  <header className={clsx(styles.root, className)} data-testid={dataTestId}>
    <div className={styles.text}>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
);

PageHeader.displayName = 'PageHeader';

export default PageHeader;
