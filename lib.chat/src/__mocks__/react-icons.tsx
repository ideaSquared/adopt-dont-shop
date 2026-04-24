/**
 * Jest stub for react-icons/md. Real icons ship as tree-shakable ESM
 * components that jest + ts-jest can process, but stubbing keeps tests
 * fast and focused on the component behavior rather than the glyph.
 * Every named import returns a generic <span role="img" data-icon>.
 */
import type { CSSProperties } from 'react';

type IconProps = { size?: number | string; className?: string; style?: CSSProperties };

const makeIcon = (name: string) => {
  const Icon = ({ size, className, style }: IconProps) => (
    <span
      role="img"
      aria-label={name}
      data-icon={name}
      className={className}
      style={{ ...style, width: size, height: size, display: 'inline-block' }}
    />
  );
  Icon.displayName = name;
  return Icon;
};

export const MdArrowBack = makeIcon('arrow-back');
export const MdAttachFile = makeIcon('attach-file');
export const MdClose = makeIcon('close');
export const MdDownload = makeIcon('download');
export const MdImage = makeIcon('image');
export const MdInsertDriveFile = makeIcon('file');
export const MdNavigateBefore = makeIcon('nav-before');
export const MdNavigateNext = makeIcon('nav-next');
export const MdPictureAsPdf = makeIcon('pdf');
export const MdSearch = makeIcon('search');
export const MdSend = makeIcon('send');
export const MdVisibility = makeIcon('visibility');
export const MdZoomIn = makeIcon('zoom-in');
export const MdZoomOut = makeIcon('zoom-out');
