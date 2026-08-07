/**
 * Vitest stub for lucide-react. Real icons ship as tree-shakable ESM
 * components, but stubbing keeps tests fast and focused on the component
 * behavior rather than the glyph.
 * Every named import returns a generic <span role="img" data-icon>.
 */
import type { CSSProperties } from 'react';

type IconProps = {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
};

const makeIcon = (name: string) => {
  const Icon = ({ size, className, style, ...rest }: IconProps) => (
    <span
      role="img"
      aria-label={name}
      data-icon={name}
      className={className}
      style={{ ...style, width: size, height: size, display: 'inline-block' }}
      {...rest}
    />
  );
  Icon.displayName = name;
  return Icon;
};

export const ArrowLeft = makeIcon('arrow-left');
export const ChevronLeft = makeIcon('chevron-left');
export const ChevronRight = makeIcon('chevron-right');
export const Download = makeIcon('download');
export const Eye = makeIcon('eye');
export const File = makeIcon('file');
export const FileText = makeIcon('file-text');
export const Image = makeIcon('image');
export const Paperclip = makeIcon('paperclip');
export const Send = makeIcon('send');
export const X = makeIcon('x');
export const ZoomIn = makeIcon('zoom-in');
export const ZoomOut = makeIcon('zoom-out');
