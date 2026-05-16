import clsx from 'clsx';
import React from 'react';
import * as styles from './Logo.css';

export type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  darkBg?: boolean;
  className?: string;
  'data-testid'?: string;
};

const DetailedMark = ({ size }: { size: number }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 100 100'
    width={size}
    height={size}
    role='img'
    aria-label='AdoptDontShop'
    data-mark='detailed'
    aria-hidden='true'
    focusable='false'
  >
    <defs>
      <filter id='logo-ds-detailed' x='-20%' y='-15%' width='140%' height='140%'>
        <feDropShadow dx='0' dy='2.5' stdDeviation='2' floodColor='#0F172A' floodOpacity='0.18' />
      </filter>
    </defs>
    <g filter='url(#logo-ds-detailed)'>
      <path
        d='M50 10 C 53 10, 55 11, 57 13 L 88 42 C 90 44, 91 46, 91 49 L 91 84 C 91 88, 87 92, 83 92 L 17 92 C 13 92, 9 88, 9 84 L 9 49 C 9 46, 10 44, 12 42 L 43 13 C 45 11, 47 10, 50 10 Z'
        fill='#F43F5E'
      />
      <path
        d='M43 13 C 45 11, 47 10, 50 10 L 50 17 L 19 43 L 12 43 C 10.5 43, 10 44, 10 45 Z'
        fill='#FDA4AF'
        opacity='0.85'
      />
      <rect x='68' y='20' width='8' height='14' rx='1' fill='#BE123C' />
      <rect x='66.5' y='19' width='11' height='3.5' rx='1' fill='#BE123C' />
      <circle cx='74' cy='14' r='2.4' fill='#FFE4E6' opacity='0.92' />
      <circle cx='80' cy='9' r='3.1' fill='#FFE4E6' opacity='0.75' />
      <circle cx='86' cy='3' r='3.6' fill='#FFE4E6' opacity='0.55' />
      <path
        d='M58 22 C 56.3 20.3, 53 21, 53 23.5 C 53 25.5, 56 27.5, 58 29 C 60 27.5, 63 25.5, 63 23.5 C 63 21, 59.7 20.3, 58 22 Z'
        fill='#FECDD3'
      />
      <ellipse cx='32' cy='62' rx='5.5' ry='7' fill='#FFFFFF' transform='rotate(-18 32 62)' />
      <ellipse cx='43' cy='55' rx='5.5' ry='7.5' fill='#FFFFFF' transform='rotate(-6 43 55)' />
      <ellipse cx='57' cy='55' rx='5.5' ry='7.5' fill='#FFFFFF' transform='rotate(6 57 55)' />
      <ellipse cx='68' cy='62' rx='5.5' ry='7' fill='#FFFFFF' transform='rotate(18 68 62)' />
      <path
        d='M50 67 C 40 67, 33 73, 33 80 C 33 86, 41 89, 50 89 C 59 89, 67 86, 67 80 C 67 73, 60 67, 50 67 Z'
        fill='#FFFFFF'
      />
    </g>
  </svg>
);

const SimpleMark = ({ size }: { size: number }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 100 100'
    width={size}
    height={size}
    role='img'
    aria-label='AdoptDontShop'
    data-mark='simple'
    aria-hidden='true'
    focusable='false'
  >
    <defs>
      <filter id='logo-ds-simple' x='-20%' y='-15%' width='140%' height='135%'>
        <feDropShadow dx='0' dy='2' stdDeviation='1.6' floodColor='#0F172A' floodOpacity='0.16' />
      </filter>
    </defs>
    <g filter='url(#logo-ds-simple)'>
      <path
        d='M50 10 C 53 10, 55 11, 57 13 L 88 42 C 90 44, 91 46, 91 49 L 91 84 C 91 88, 87 92, 83 92 L 17 92 C 13 92, 9 88, 9 84 L 9 49 C 9 46, 10 44, 12 42 L 43 13 C 45 11, 47 10, 50 10 Z'
        fill='#F43F5E'
      />
      <ellipse cx='32' cy='62' rx='5.5' ry='7' fill='#FFFFFF' transform='rotate(-18 32 62)' />
      <ellipse cx='43' cy='55' rx='5.5' ry='7.5' fill='#FFFFFF' transform='rotate(-6 43 55)' />
      <ellipse cx='57' cy='55' rx='5.5' ry='7.5' fill='#FFFFFF' transform='rotate(6 57 55)' />
      <ellipse cx='68' cy='62' rx='5.5' ry='7' fill='#FFFFFF' transform='rotate(18 68 62)' />
      <path
        d='M50 67 C 40 67, 33 73, 33 80 C 33 86, 41 89, 50 89 C 59 89, 67 86, 67 80 C 67 73, 60 67, 50 67 Z'
        fill='#FFFFFF'
      />
    </g>
  </svg>
);

export const Logo: React.FC<LogoProps> = ({
  size = 32,
  showWordmark = false,
  darkBg = false,
  className,
  'data-testid': testId,
}) => {
  const Mark = size >= 48 ? DetailedMark : SimpleMark;

  if (!showWordmark) {
    return (
      <span
        className={clsx(styles.lockup, className)}
        data-testid={testId}
        role='img'
        aria-label='AdoptDontShop'
      >
        <Mark size={size} />
      </span>
    );
  }

  return (
    <span className={clsx(styles.lockup, className)} data-testid={testId}>
      <Mark size={size} />
      <span
        className={clsx(styles.wordmark, darkBg && styles.wordmarkDark)}
        data-wordmark=''
        data-dark={darkBg ? 'true' : undefined}
        aria-label='AdoptDontShop'
      >
        <span style={{ fontWeight: 700 }}>Adopt</span>
        <span style={{ fontWeight: 600 }}>DontShop</span>
      </span>
    </span>
  );
};
