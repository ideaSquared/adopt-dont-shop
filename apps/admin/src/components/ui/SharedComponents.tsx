import React from 'react';
import * as styles from './SharedComponents.css';

// Shared Badge Component
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  $variant: BadgeVariant;
};

export const Badge = ({ $variant, className, ...props }: BadgeProps) => (
  <span
    className={`${styles.badge({ variant: $variant })}${className ? ` ${className}` : ''}`}
    {...props}
  />
);

// Shared Filter Components
export const FilterBar = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.filterBar}${className ? ` ${className}` : ''}`} {...props} />
);

export const FilterGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.filterGroup}${className ? ` ${className}` : ''}`} {...props} />
);

export const FilterLabel = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={`${styles.filterLabel}${className ? ` ${className}` : ''}`} {...props} />
);

export const SearchInputWrapper = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.searchInputWrapper}${className ? ` ${className}` : ''}`} {...props} />
);

export const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={`${styles.select}${className ? ` ${className}` : ''}`} {...props} />
);

// Shared Page Layout Components
export const PageContainer = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.pageContainer}${className ? ` ${className}` : ''}`} {...props} />
);

export const PageHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.pageHeader}${className ? ` ${className}` : ''}`} {...props} />
);

export const HeaderLeft = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.headerLeft}${className ? ` ${className}` : ''}`} {...props} />
);

// Shared Card Components
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.card}${className ? ` ${className}` : ''}`} {...props} />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.cardHeader}${className ? ` ${className}` : ''}`} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`${styles.cardTitle}${className ? ` ${className}` : ''}`} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.cardContent}${className ? ` ${className}` : ''}`} {...props} />
);

// Utility Components
export const EmptyState = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.emptyState}${className ? ` ${className}` : ''}`} {...props} />
);
