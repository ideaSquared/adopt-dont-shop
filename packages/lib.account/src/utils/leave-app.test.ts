import { describe, expect, it, vi } from 'vitest';
import { leaveApp } from './leave-app';

describe('leaveApp', () => {
  it('reloads the app at its root', () => {
    const assign = vi.fn();

    leaveApp({ assign });

    expect(assign).toHaveBeenCalledWith('/');
  });
});
