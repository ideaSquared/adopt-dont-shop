import { describe, it, expect } from 'vitest';
import { render } from '@/test-utils/render';
import { SafeHtml } from './SafeHtml';

describe('SafeHtml', () => {
  it('renders safe HTML content', () => {
    const { container } = render(<SafeHtml html="<p>Hello <strong>world</strong></p>" />);
    expect(container.querySelector('p')).not.toBeNull();
    expect(container.querySelector('strong')).not.toBeNull();
  });

  it('strips script tags', () => {
    const { container } = render(
      <SafeHtml html='<p>Safe</p><script>alert("xss")</script>' />
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container).toHaveTextContent('Safe');
  });

  it('strips event handler attributes', () => {
    const { container } = render(<SafeHtml html='<p onclick="alert(1)">Click</p>' />);
    expect(container.querySelector('p')?.getAttribute('onclick')).toBeNull();
  });

  it('forwards className so styled-components can inject styles', () => {
    const { container } = render(<SafeHtml html="<p>test</p>" className="my-class" />);
    expect(container.firstElementChild?.classList.contains('my-class')).toBe(true);
  });
});
