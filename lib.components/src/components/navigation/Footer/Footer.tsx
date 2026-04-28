import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

import { footer, footerContainer, footerText, footerLinks, footerLink } from './Footer.css';

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={clsx(footer, className)}>
      <div className={footerContainer}>
        <div className={footerLinks}>
          <Link to='/blog' className={footerLink}>
            Blog
          </Link>
          <Link to='/help' className={footerLink}>
            Help
          </Link>
          <Link to='/about' className={footerLink}>
            About
          </Link>
          <Link to='/privacy' className={footerLink}>
            Privacy
          </Link>
          <Link to='/terms' className={footerLink}>
            Terms
          </Link>
          <Link to='/contact' className={footerLink}>
            Contact
          </Link>
        </div>
        <p className={footerText}>
          © {new Date().getFullYear()} Adopt Don&apos;t Shop. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

Footer.displayName = 'Footer';
