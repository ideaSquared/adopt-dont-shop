import { describe, expect, it } from 'vitest';

import { MessageBubbleComponent } from './MessageBubbleComponent';
import type { MessageAttachment } from '../types';
import { buildChatContextValue, buildTestMessage, renderWithChatContext } from '../test-utils';

// Mirrors apps/client's resolveFileUrl reject rules (ADS-1011): undefined
// signals a BLOCKED url (non-http(s) scheme, protocol-relative cross-origin),
// a string is a url safe to hand to <img src>. The component must never fall
// back to the raw url when this returns undefined.
const sanitizingResolveFileUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  const trimmed = url.trim();
  const scheme = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (scheme) {
    const s = scheme[1].toLowerCase();
    return s === 'http' || s === 'https' ? trimmed : undefined;
  }
  if (trimmed.startsWith('//')) {
    return undefined;
  }
  return trimmed;
};

const buildImageAttachment = (url: string): MessageAttachment => ({
  id: 'att-1',
  filename: 'photo.png',
  url,
  size: 1024,
  mimeType: 'image/png',
});

const renderBubbleWithAttachment = (url: string) => {
  const message = buildTestMessage({ attachments: [buildImageAttachment(url)] });
  return renderWithChatContext(
    <MessageBubbleComponent message={message} isOwn={false} currentUserId="user-1" />,
    { value: buildChatContextValue({ resolveFileUrl: sanitizingResolveFileUrl }) }
  );
};

describe('MessageBubbleComponent image attachments — sanitiser is authoritative (ADS-1011)', () => {
  it('renders no <img> for a protocol-relative attachment url, showing a placeholder instead', () => {
    const { container } = renderBubbleWithAttachment('//evil.example/beacon.gif?r=victim');
    // No <img> is emitted at all — so nothing fetches from evil.example on render.
    expect(container.querySelector('img')).toBeNull();
    // The file-icon placeholder (filename text) stands in for the blocked image.
    expect(container.textContent).toContain('photo.png');
  });

  it('renders no <img> for a non-http(s) scheme attachment url', () => {
    const { container } = renderBubbleWithAttachment('data:image/png;base64,AAAA');
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('photo.png');
  });

  it('renders an <img> at the resolved url for a valid absolute https attachment', () => {
    const { container } = renderBubbleWithAttachment('https://cdn.example/photo.png');
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://cdn.example/photo.png');
  });

  it('renders an <img> for a valid relative attachment url', () => {
    const { container } = renderBubbleWithAttachment('/uploads/photo.png');
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/uploads/photo.png');
  });
});
