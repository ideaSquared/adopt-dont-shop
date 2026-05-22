import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';

// The global setup-tests.ts mock of @adopt-dont-shop/lib.components doesn't
// export Logo (which AdminSidebar pulls in for the header), so stub it here.
vi.mock('@adopt-dont-shop/lib.components', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@adopt-dont-shop/lib.components');
  return {
    ...actual,
    Logo: () => null,
  };
});

import { AdminSidebar } from './AdminSidebar';

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <AdminSidebar collapsed={false} onToggle={() => undefined} />
    </MemoryRouter>
  );

/**
 * ADS-652: The "System" sidebar section was a junk drawer of six items in
 * an order driven by no particular logic. We reorder by frequency-of-use
 * (the items admins reach for most often appear first) and ensure no
 * sidebar entry points to a known-stub page.
 */
describe('AdminSidebar System section [ADS-652]', () => {
  const expectedSystemOrder = [
    { label: 'Audit Logs', href: '/audit' },
    { label: 'Security Center', href: '/security' },
    { label: 'Privacy Tools', href: '/privacy-tools' },
    { label: 'Configuration', href: '/configuration' },
    { label: 'Field Permissions', href: '/field-permissions' },
    { label: 'Reports', href: '/reports' },
  ];

  it('lists System items ordered by frequency-of-use', () => {
    renderSidebar();

    const systemHeading = screen.getByText('System');
    const systemSection = systemHeading.parentElement;
    expect(systemSection).not.toBeNull();
    if (!systemSection) {
      return;
    }

    const links = within(systemSection).getAllByRole('link');
    const visibleOrder = links.map(link => ({
      label: link.textContent?.trim() ?? '',
      href: link.getAttribute('href') ?? '',
    }));

    expect(visibleOrder).toEqual(expectedSystemOrder);
  });

  it('does not link to any known-stub pages', () => {
    renderSidebar();

    // Sentinel list: if a future page is added to System but is a stub,
    // add its path here and the test will fail until it is removed from
    // the sidebar or completed. Reports (ADS-105) is fully implemented
    // and is intentionally NOT in this list.
    const knownStubRoutes: string[] = [];

    const allLinks = screen.getAllByRole('link');
    const hrefs = allLinks.map(link => link.getAttribute('href') ?? '');

    for (const stub of knownStubRoutes) {
      expect(hrefs).not.toContain(stub);
    }
  });
});
