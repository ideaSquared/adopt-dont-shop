import DOMPurify from 'dompurify';
import { marked, type Token, type Tokens } from 'marked';

export type LegalSection = {
  id: string;
  title: string;
};

export type ParsedLegalDocument = {
  title: string | null;
  version: string | null;
  lastUpdated: string | null;
  sections: ReadonlyArray<LegalSection>;
  /** Sanitized HTML for the readable body only. */
  html: string;
};

const VERSION_LINE = /^\*\*Version:\*\*\s*(.+)$/m;
const LAST_UPDATED_LINE = /^\*\*Last updated:\*\*\s*(.+)$/m;
// The markdown files cross-link with repo-relative paths (`./privacy.md`);
// on the site those documents live at /privacy, /terms and /cookies.
const SIBLING_DOCUMENT_LINK = /\]\(\.\/(terms|privacy|cookies)\.md\)/g;

const isHeading = (token: Token, depth: number): token is Tokens.Heading =>
  token.type === 'heading' && token.depth === depth;

const isMetadata = (token: Token): boolean =>
  token.type === 'paragraph' && (VERSION_LINE.test(token.raw) || LAST_UPDATED_LINE.test(token.raw));

const plainText = (inlineMarkdown: string): string => inlineMarkdown.replace(/[*_`]/g, '').trim();

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Checked against the ids already emitted (not the source slugs), so a heading
// literally titled "Overview 2" cannot collide with the suffix given to a repeat.
const firstFreeId = (base: string, taken: ReadonlySet<string>): string => {
  const withSuffix = (n: number): string =>
    taken.has(`${base}-${n}`) ? withSuffix(n + 1) : `${base}-${n}`;
  return taken.has(base) ? withSuffix(2) : base;
};

const toSections = (headings: ReadonlyArray<Tokens.Heading>): ReadonlyArray<LegalSection> =>
  headings.reduce<ReadonlyArray<LegalSection>>((sections, heading) => {
    const title = plainText(heading.text);
    const taken = new Set(sections.map(section => section.id));
    return [...sections, { id: firstFreeId(`section-${slugify(title)}`, taken), title }];
  }, []);

const anchorHeadings = (html: string, sections: ReadonlyArray<LegalSection>): string => {
  const nextSection = sections[Symbol.iterator]();
  return html.replace(/<h2>/g, () => {
    const next = nextSection.next();
    return next.done ? '<h2>' : `<h2 id="${next.value.id}">`;
  });
};

// The wrapper scrolls sideways on narrow screens; a tab stop and a name let
// keyboard users reach columns that overflow (not every browser focuses
// scroll containers on its own).
const TABLE_WRAPPER_OPEN =
  '<div data-legal-table role="region" aria-label="Scrollable table" tabindex="0"><table>';

const wrapTables = (html: string): string =>
  html.replace(/<table>/g, TABLE_WRAPPER_OPEN).replace(/<\/table>/g, '</table></div>');

/**
 * Turns a versioned legal markdown document (served by the gateway from
 * docs/legal/*.md) into what the page needs: the title, version and
 * last-updated date lifted out of the body, a section list for navigation,
 * and sanitized HTML. The block between the title and the first `##` section
 * holds maintainer notes ("source of truth…", "placeholder copy…") and the
 * metadata lines; none of that is policy text, so it is not rendered.
 */
export const parseLegalDocument = (markdown: string): ParsedLegalDocument => {
  const tokens = marked.lexer(markdown.replace(SIBLING_DOCUMENT_LINK, '](/$1)'));
  const firstSection = tokens.findIndex(token => isHeading(token, 2));
  const cutoff = firstSection === -1 ? tokens.length : firstSection;
  const preamble = tokens.slice(0, cutoff);
  const body = tokens.slice(cutoff);

  const title = preamble.find((token): token is Tokens.Heading => isHeading(token, 1));
  const metadata = preamble
    .filter(isMetadata)
    .map(token => token.raw)
    .join('\n');
  const readablePreamble = preamble.filter(
    token => !isHeading(token, 1) && token.type !== 'blockquote' && !isMetadata(token)
  );

  const sections = toSections(body.filter((token): token is Tokens.Heading => isHeading(token, 2)));
  const html = wrapTables(anchorHeadings(marked.parser([...readablePreamble, ...body]), sections));

  return {
    title: title ? plainText(title.text) : null,
    version: VERSION_LINE.exec(metadata)?.[1].trim() ?? null,
    lastUpdated: LAST_UPDATED_LINE.exec(metadata)?.[1].trim() ?? null,
    sections,
    html: DOMPurify.sanitize(html),
  };
};
