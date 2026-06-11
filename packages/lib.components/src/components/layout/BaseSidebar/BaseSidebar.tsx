import React from 'react';

import * as styles from './BaseSidebar.css';

type BaseSidebarProps = {
  show: boolean;
  handleClose: () => void;
  title: string;
  size?: string;
  children: React.ReactNode;
};

const BaseSidebar: React.FC<BaseSidebarProps> = ({
  show,
  handleClose,
  title,
  size = '33%',
  children,
}) => {
  return (
    <div
      className={styles.sidebarContainer}
      style={{
        width: size,
        transform: show ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>{title}</h2>
        <button className={styles.closeButton} onClick={handleClose}>
          &times;
        </button>
      </div>
      <div className={styles.sidebarContent}>{children}</div>
    </div>
  );
};

export default BaseSidebar;
