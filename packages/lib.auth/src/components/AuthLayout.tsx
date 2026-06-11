import React, { ReactNode } from 'react';
import { Card } from '@adopt-dont-shop/lib.components';
import * as styles from './AuthLayout.css';

export interface AuthLayoutProps {
  /**
   * Title displayed at the top of the auth form
   */
  title: string;
  /**
   * Subtitle/description text
   */
  subtitle?: string;
  /**
   * Auth form content (LoginForm or RegisterForm)
   */
  children: ReactNode;
  /**
   * Optional footer content (e.g., links to other pages)
   */
  footer?: ReactNode;
}

/**
 * Shared layout wrapper for all authentication pages
 * Provides consistent styling and branding across all apps
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => {
  return (
    <div className={styles.container}>
      <Card className={styles.authCard}>
        <div className={styles.header}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
        {footer && footer}
      </Card>
    </div>
  );
};
