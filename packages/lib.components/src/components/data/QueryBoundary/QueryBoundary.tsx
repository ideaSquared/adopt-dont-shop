import React from 'react';

import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';

export type QueryBoundaryProps = {
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
};

const messageFromError = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return undefined;
};

export const QueryBoundary = ({
  isLoading,
  isError = false,
  error,
  isEmpty = false,
  onRetry,
  children,
  loadingFallback,
  errorFallback,
  emptyFallback,
}: QueryBoundaryProps) => {
  if (isLoading) {
    return <>{loadingFallback ?? <Skeleton />}</>;
  }

  if (isError) {
    return (
      <>{errorFallback ?? <ErrorState onRetry={onRetry} message={messageFromError(error)} />}</>
    );
  }

  if (isEmpty) {
    return <>{emptyFallback ?? <EmptyState title='Nothing here yet' />}</>;
  }

  return <>{children}</>;
};
