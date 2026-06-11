import React from 'react';
import { Link } from 'react-router-dom';
import * as styles from './AuthCtas.css';

export const AuthCtas: React.FC = () => (
  <div className={styles.row}>
    <Link className={styles.ghostLink} to='/login'>
      Log in
    </Link>
    <Link className={styles.solidLink} to='/register'>
      Sign up
    </Link>
  </div>
);
