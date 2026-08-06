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

type ControlAriaProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

const mergeDescribedBy = (existing: string | undefined, added: string): string =>
  existing ? `${existing} ${added}` : added;

export const FormField = ({
  label,
  htmlFor,
  required = false,
  description,
  error,
  fullWidth = false,
  children,
  className,
}: FormFieldProps) => {
  const reactId = React.useId();
  const errorId = `${reactId}-error`;
  const descriptionId = `${reactId}-description`;
  const showDescription = Boolean(description) && !error;
  const describedById = error ? errorId : showDescription ? descriptionId : undefined;

  // Wire the message to the control via aria-describedby so screen readers
  // announce it when the field regains focus (role="alert" only fires when the
  // error first appears). Only a single valid element child is augmented;
  // anything else renders untouched.
  const control =
    describedById && React.isValidElement<ControlAriaProps>(children)
      ? React.cloneElement(children, {
          'aria-describedby': mergeDescribedBy(children.props['aria-describedby'], describedById),
          'aria-invalid': error ? true : children.props['aria-invalid'],
        })
      : children;

  return (
    <div className={clsx(styles.field, fullWidth && styles.fieldFullWidth, className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className={clsx(styles.fieldLabel, required && styles.fieldLabelRequired)}
        >
          {label}
        </label>
      )}
      {control}
      {showDescription && (
        <span id={descriptionId} className={styles.fieldDescription}>
          {description}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.fieldError} role='alert'>
          {error}
        </span>
      )}
    </div>
  );
};
