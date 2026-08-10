import React from 'react';
import * as styles from './SharedComponents.css';

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
