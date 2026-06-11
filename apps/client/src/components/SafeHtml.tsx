/* eslint-disable react/no-danger -- This component is the single authorised user of dangerouslySetInnerHTML; DOMPurify.sanitize is always called before injection */
import DOMPurify from 'dompurify';

type SafeHtmlProps = {
  html: string;
  className?: string;
};

export const SafeHtml = ({ html, className }: SafeHtmlProps) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
);
