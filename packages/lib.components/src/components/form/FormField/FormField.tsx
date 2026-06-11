import React from 'react';
import clsx from 'clsx';

import * as styles from './FormField.css';

export type FormSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export const FormSection = ({ title, description, children, className }: FormSectionProps) => (
  <section className={clsx(styles.section, className)}>
    {(title || description) && (
      <header className={styles.sectionHeader}>
        {title && <h3 className={styles.sectionTitle}>{title}</h3>}
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </header>
    )}
    {children}
  </section>
);

export type FormRowColumns = 'auto' | 'single' | 'two' | 'three';

export type FormRowProps = {
  columns?: FormRowColumns;
  children: React.ReactNode;
  className?: string;
};

export const FormRow = ({ columns = 'auto', children, className }: FormRowProps) => (
  <div className={clsx(styles.row[columns], className)}>{children}</div>
);

export type FormFieldProps = {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
};

export const FormField = ({
  label,
  htmlFor,
  required = false,
  description,
  error,
  fullWidth = false,
  children,
  className,
}: FormFieldProps) => (
  <div className={clsx(styles.field, fullWidth && styles.fieldFullWidth, className)}>
    {label && (
      <label
        htmlFor={htmlFor}
        className={clsx(styles.fieldLabel, required && styles.fieldLabelRequired)}
      >
        {label}
      </label>
    )}
    {children}
    {description && !error && <span className={styles.fieldDescription}>{description}</span>}
    {error && (
      <span className={styles.fieldError} role='alert'>
        {error}
      </span>
    )}
  </div>
);
