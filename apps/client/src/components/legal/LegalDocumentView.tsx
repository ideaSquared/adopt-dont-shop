import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { Container, PageHeader } from '@adopt-dont-shop/lib.components';
import type { ParsedLegalDocument } from '@adopt-dont-shop/lib.legal';
import { SafeHtml } from '@/components/SafeHtml';
import * as styles from './LegalDocumentView.css';
import { LEGAL_DOCUMENT_TITLES, type LegalDocumentSlug } from './legal-documents';

const DOCUMENT_LINKS: ReadonlyArray<{ slug: LegalDocumentSlug; label: string }> = [
  { slug: 'terms', label: 'Terms' },
  { slug: 'privacy', label: 'Privacy' },
  { slug: 'cookies', label: 'Cookies' },
];

const DESKTOP_QUERY = '(min-width: 1024px)';

const startsOpenOnDesktop = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP_QUERY).matches;

type LegalDocumentViewProps = {
  slug: LegalDocumentSlug;
  document: ParsedLegalDocument;
};

/**
 * Reading layout shared by /terms, /privacy and /cookies: title and version
 * up top, links between the three documents, a section index, and the body at
 * a readable line length.
 */
export const LegalDocumentView: React.FC<LegalDocumentViewProps> = ({ slug, document }) => {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const pageRef = React.useRef<HTMLDivElement>(null);
  const [isTocOpen, setIsTocOpen] = React.useState(startsOpenOnDesktop);

  // Switching documents is a client-side navigation, which keeps the old scroll
  // position and focus. Start the new document at the top with focus on it,
  // unless the link targets a section (the browser handles those itself).
  React.useEffect(() => {
    if (hash) {
      return;
    }
    window.scrollTo(0, 0);
    pageRef.current?.focus({ preventScroll: true });
  }, [slug, hash]);

  // The body is injected HTML, so in-page links to the sibling documents
  // would otherwise reload the app; route them client-side instead.
  const handleBodyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = event.target instanceof Element ? event.target.closest('a') : null;
    const href = anchor?.getAttribute('href');
    const isPlainClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (!href?.startsWith('/') || !isPlainClick) {
      return;
    }
    event.preventDefault();
    navigate(href);
  };

  return (
    <Container size='xl'>
      <div ref={pageRef} tabIndex={-1} className={styles.page}>
        <PageHeader
          title={LEGAL_DOCUMENT_TITLES[slug]}
          description={
            document.lastUpdated || document.version ? (
              <span className={styles.meta}>
                {document.lastUpdated && <span>Last updated {document.lastUpdated}</span>}
                {document.version && <span>Version {document.version}</span>}
              </span>
            ) : undefined
          }
        />

        <nav aria-label='Legal documents' className={styles.documentNav}>
          {DOCUMENT_LINKS.map(link => (
            <NavLink key={link.slug} to={`/${link.slug}`} className={styles.documentNavLink}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.layout}>
          {document.sections.length > 0 && (
            <nav aria-label='On this page' className={styles.toc}>
              <details open={isTocOpen} onToggle={event => setIsTocOpen(event.currentTarget.open)}>
                <summary className={styles.tocSummary}>On this page</summary>
                <ol className={styles.tocList}>
                  {document.sections.map(section => (
                    <li key={section.id}>
                      <a href={`#${section.id}`} className={styles.tocLink}>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            </nav>
          )}

          {/* Clicks are delegated from the injected HTML; the links inside are real anchors. */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={handleBodyClick} className={styles.article}>
            <SafeHtml html={document.html} />
          </div>
        </div>
      </div>
    </Container>
  );
};
