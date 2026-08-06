import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { QueryBoundary } from './QueryBoundary';

const Content = () => <div data-testid='content'>Loaded content</div>;

describe('QueryBoundary', () => {
  it('renders the default loading fallback while loading', () => {
    const { container } = render(
      <QueryBoundary isLoading>
        <Content />
      </QueryBoundary>
    );

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders a custom loading fallback when provided', () => {
    render(
      <QueryBoundary isLoading loadingFallback={<div data-testid='custom-loading' />}>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders an error state with a working retry when isError', () => {
    const handleRetry = vi.fn();

    render(
      <QueryBoundary
        isLoading={false}
        isError
        error={new Error('Network down')}
        onRetry={handleRetry}
      >
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('derives an error message from a string error', () => {
    render(
      <QueryBoundary isLoading={false} isError error='boom string'>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByText('boom string')).toBeInTheDocument();
  });

  it('renders the error state even when the error is not narrowable', () => {
    render(
      <QueryBoundary isLoading={false} isError error={{ code: 500 }}>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders a custom error fallback when provided', () => {
    render(
      <QueryBoundary isLoading={false} isError errorFallback={<div data-testid='custom-error' />}>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the default empty fallback when isEmpty', () => {
    render(
      <QueryBoundary isLoading={false} isEmpty>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders a custom empty fallback when provided', () => {
    render(
      <QueryBoundary isLoading={false} isEmpty emptyFallback={<div data-testid='custom-empty' />}>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
  });

  it('renders children on success', () => {
    render(
      <QueryBoundary isLoading={false}>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('prefers loading over error, empty and children', () => {
    const { container } = render(
      <QueryBoundary isLoading isError isEmpty error={new Error('ignored')}>
        <Content />
      </QueryBoundary>
    );

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('prefers error over empty and children', () => {
    render(
      <QueryBoundary isLoading={false} isError isEmpty>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('prefers empty over children', () => {
    render(
      <QueryBoundary isLoading={false} isEmpty>
        <Content />
      </QueryBoundary>
    );

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });
});
