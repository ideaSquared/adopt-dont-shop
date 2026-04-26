import DOMPurify from 'dompurify';

type SafeHtmlProps = {
  html: string;
  className?: string;
};

// eslint-disable-next-line react/no-danger -- sanitization is enforced by this component; all callers go through DOMPurify
export const SafeHtml = ({ html, className }: SafeHtmlProps) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
);
