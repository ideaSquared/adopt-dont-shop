import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useOneTimeUrlToken } from './useOneTimeUrlToken';

const renderWithUrl = (url: string, paramName?: string) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => ({
      token: useOneTimeUrlToken(paramName),
      location: useLocation(),
    }),
    { wrapper }
  );
};

describe('useOneTimeUrlToken', () => {
  it('returns the token from the URL', () => {
    const { result } = renderWithUrl('/reset?token=abc123');
    expect(result.current.token).toBe('abc123');
  });

  it('returns null when the URL has no token', () => {
    const { result } = renderWithUrl('/reset');
    expect(result.current.token).toBeNull();
  });

  it('removes the token from the URL but keeps other params', async () => {
    const { result } = renderWithUrl('/reset?token=abc123&keep=1');
    await act(async () => {});
    expect(result.current.location.search).toBe('?keep=1');
  });

  it('keeps returning the token after it has been stripped from the URL', async () => {
    const { result } = renderWithUrl('/reset?token=abc123');
    await act(async () => {});
    expect(result.current.location.search).toBe('');
    expect(result.current.token).toBe('abc123');
  });

  it('supports a custom parameter name', async () => {
    const { result } = renderWithUrl('/accept?invite=xyz&token=other', 'invite');
    await act(async () => {});
    expect(result.current.token).toBe('xyz');
    expect(result.current.location.search).toBe('?token=other');
  });
});
