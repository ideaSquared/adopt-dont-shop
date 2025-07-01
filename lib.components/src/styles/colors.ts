// Modern, accessible color palette following 2024 design standards
export const palette = {
  // Base colors
  white: '#FFFFFF',
  black: '#0F172A',

  // Modern neutral scale with better contrast ratios
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Modern primary palette - refined pet adoption brand
  primary: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E', // Main brand color
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
    950: '#4C0519',
  },

  // Modern secondary palette - calming teal
  secondary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6', // Main secondary
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
    950: '#042F2E',
  },

  // Modern semantic colors with better accessibility
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // Modern gradients
  gradients: {
    primary: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
    secondary: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    success: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
    warm: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    cool: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
  },
};

// Modern typography system with contemporary font stacks and improved scales
export const typography = {
  family: {
    sans: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      '"Noto Sans"',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
      '"Noto Color Emoji"',
    ].join(', '),
    serif: [
      'Playfair Display',
      'ui-serif',
      'Georgia',
      'Cambria',
      '"Times New Roman"',
      'Times',
      'serif',
    ].join(', '),
    mono: [
      'JetBrains Mono',
      'ui-monospace',
      'SFMono-Regular',
      '"SF Mono"',
      'Consolas',
      '"Liberation Mono"',
      'Menlo',
      'monospace',
    ].join(', '),
    display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'].join(', '),
  },
  weight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  size: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
    '8xl': '6rem', // 96px
    '9xl': '8rem', // 128px
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Modern animation curves and timing
export const animations = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Modern easing curves for 2024
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
};

// Modern shadow system following 2024 design trends
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  // Modern colored shadows for 2024
  primary: '0 10px 25px -3px rgba(244, 63, 94, 0.3), 0 4px 6px -4px rgba(244, 63, 94, 0.2)',
  secondary: '0 10px 25px -3px rgba(20, 184, 166, 0.3), 0 4px 6px -4px rgba(20, 184, 166, 0.2)',
  success: '0 10px 25px -3px rgba(34, 197, 94, 0.3), 0 4px 6px -4px rgba(34, 197, 94, 0.2)',
  error: '0 10px 25px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -4px rgba(239, 68, 68, 0.2)',
  // Focus shadows for accessibility
  focus: '0 0 0 3px rgba(59, 130, 246, 0.5)',
  focusPrimary: '0 0 0 3px rgba(244, 63, 94, 0.5)',
  focusError: '0 0 0 3px rgba(239, 68, 68, 0.5)',
  focusWarning: '0 0 0 3px rgba(245, 158, 11, 0.5)',
  focusSuccess: '0 0 0 3px rgba(34, 197, 94, 0.5)',
};

// Legacy exports for backward compatibility
export const legacyPalette = {
  // Primary colors
  white: palette.white,
  black: palette.black,

  // Grays - mapped to new neutral scale
  veryLightGrey: palette.neutral[50],
  paleGrey: palette.neutral[100],
  lightGrey: palette.neutral[200],
  mediumGrey: palette.neutral[500],
  darkGrey: palette.neutral[700],
  veryDarkGrey: palette.neutral[900],

  // Status colors - mapped to new semantic colors
  brightRed: palette.error[500],
  lightRed: palette.error[100],
  darkRed: palette.error[800],

  brightGreen: palette.success[500],
  lightGreen: palette.success[100],
  darkGreen: palette.success[800],

  brightBlue: palette.info[500],
  lightBlue: palette.info[100],
  darkBlue: palette.info[800],

  brightSkyBlue: palette.info[400],
  lightSkyBlue: palette.info[50],
  darkSkyBlue: palette.info[900],

  brightOrange: palette.warning[500],
  lightOrange: palette.warning[200],
  lightOrangeYellow: palette.warning[100],
  darkOrange: palette.warning[800],

  brightYellow: palette.warning[400],
  darkYellow: palette.warning[700],

  brightAmber: palette.warning[500],
  darkAmber: palette.warning[800],

  // Pet adoption specific colors
  adoptPrimary: palette.primary[500],
  adoptSecondary: palette.secondary[500],
};
