import {
  animations,
  black,
  brand,
  brandGradient,
  gray,
  primaryGradient,
  typography,
  warmCream,
  warmCreamMuted,
  white,
} from './colors';

export type ThemeMode = 'light' | 'normal' | 'dark';

export type Theme = {
  mode: ThemeMode;
  typography: typeof typography;
  animations: typeof animations;
  colors: {
    primary: string;
    primaryHover: string;
    primaryActive: string;
    primaryBgSubtle: string;
    primaryBorderSubtle: string;
    primaryTextEmphasis: string;
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    secondaryBgSubtle: string;
    secondaryBorderSubtle: string;
    secondaryTextEmphasis: string;
    success: string;
    successHover: string;
    successActive: string;
    successBgSubtle: string;
    successBorderSubtle: string;
    successTextEmphasis: string;
    danger: string;
    dangerHover: string;
    dangerActive: string;
    dangerBgSubtle: string;
    dangerBorderSubtle: string;
    dangerTextEmphasis: string;
    warning: string;
    warningHover: string;
    warningActive: string;
    warningBgSubtle: string;
    warningBorderSubtle: string;
    warningTextEmphasis: string;
    info: string;
    infoHover: string;
    infoActive: string;
    infoBgSubtle: string;
    infoBorderSubtle: string;
    infoTextEmphasis: string;
    accentPaw: string;
    accentSky: string;
    accentLeaf: string;
    gradientPrimary: string;
    gradientBrand: string;
  };
  gray: {
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    disabled: string;
    inverse: string;
    link: string;
    linkHover: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
  };
  background: {
    body: string;
    surface: string;
    muted: string;
    inverse: string;
    overlay: string;
    disabled: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
  };
  border: {
    width: {
      thin: string;
      base: string;
      thick: string;
    };
    radius: {
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      pill: string;
    };
    color: {
      default: string;
      muted: string;
      strong: string;
      focus: string;
      danger: string;
      success: string;
      warning: string;
      info: string;
    };
  };
  shadows: {
    none: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    inner: string;
    focus: string;
    focusDanger: string;
  };
  spacing: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
  };
  transitions: {
    none: string;
    fast: string;
    base: string;
    slow: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  zIndex: {
    base: number;
    docked: number;
    dropdown: number;
    sticky: number;
    overlay: number;
    modal: number;
    popover: number;
    toast: number;
    tooltip: number;
  };
};

const baseColors = {
  primary: brand.primary,
  primaryHover: brand.primaryHover,
  primaryActive: brand.primaryActive,
  primaryBgSubtle: brand.primaryBgSubtle,
  primaryBorderSubtle: brand.primaryBorderSubtle,
  primaryTextEmphasis: brand.primaryTextEmphasis,
  secondary: brand.secondary,
  secondaryHover: brand.secondaryHover,
  secondaryActive: brand.secondaryActive,
  secondaryBgSubtle: brand.secondaryBgSubtle,
  secondaryBorderSubtle: brand.secondaryBorderSubtle,
  secondaryTextEmphasis: brand.secondaryTextEmphasis,
  success: brand.success,
  successHover: brand.successHover,
  successActive: brand.successActive,
  successBgSubtle: brand.successBgSubtle,
  successBorderSubtle: brand.successBorderSubtle,
  successTextEmphasis: brand.successTextEmphasis,
  danger: brand.danger,
  dangerHover: brand.dangerHover,
  dangerActive: brand.dangerActive,
  dangerBgSubtle: brand.dangerBgSubtle,
  dangerBorderSubtle: brand.dangerBorderSubtle,
  dangerTextEmphasis: brand.dangerTextEmphasis,
  warning: brand.warning,
  warningHover: brand.warningHover,
  warningActive: brand.warningActive,
  warningBgSubtle: brand.warningBgSubtle,
  warningBorderSubtle: brand.warningBorderSubtle,
  warningTextEmphasis: brand.warningTextEmphasis,
  info: brand.info,
  infoHover: brand.infoHover,
  infoActive: brand.infoActive,
  infoBgSubtle: brand.infoBgSubtle,
  infoBorderSubtle: brand.infoBorderSubtle,
  infoTextEmphasis: brand.infoTextEmphasis,
  accentPaw: brand.accentPaw,
  accentSky: brand.accentSky,
  accentLeaf: brand.accentLeaf,
  gradientPrimary: primaryGradient,
  gradientBrand: brandGradient,
};

const baseTheme = {
  typography,
  animations,
  gray,
  border: {
    width: {
      thin: '1px',
      base: '2px',
      thick: '4px',
    },
    radius: {
      sm: '0.25rem',
      base: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      '2xl': '1.5rem',
      pill: '9999px',
    },
  },
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '1rem',
    4: '1.5rem',
    5: '2rem',
    6: '3rem',
    7: '4rem',
    8: '6rem',
  },
  transitions: {
    none: 'none',
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  zIndex: {
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    toast: 1700,
    tooltip: 1800,
  },
};

const lightShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  focus: '0 0 0 3px rgb(244 63 94 / 0.4)',
  focusDanger: '0 0 0 3px rgb(239 68 68 / 0.4)',
};

const darkShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.25), 0 1px 2px -1px rgb(0 0 0 / 0.25)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.15)',
  focus: '0 0 0 3px rgb(244 63 94 / 0.5)',
  focusDanger: '0 0 0 3px rgb(239 68 68 / 0.5)',
};

export const lightTheme: Theme = {
  ...baseTheme,
  mode: 'light',
  colors: baseColors,
  text: {
    primary: gray[900],
    secondary: gray[700],
    tertiary: gray[600],
    muted: gray[500],
    disabled: gray[400],
    inverse: white,
    link: brand.infoHover,
    linkHover: brand.infoActive,
    danger: brand.dangerHover,
    success: brand.successHover,
    warning: brand.warningHover,
    info: brand.infoHover,
  },
  background: {
    body: white,
    surface: white,
    muted: gray[100],
    inverse: gray[900],
    overlay: 'rgb(0 0 0 / 0.5)',
    disabled: gray[200],
    danger: brand.dangerBgSubtle,
    success: brand.successBgSubtle,
    warning: brand.warningBgSubtle,
    info: brand.infoBgSubtle,
  },
  border: {
    ...baseTheme.border,
    color: {
      default: gray[300],
      muted: gray[200],
      strong: gray[400],
      focus: brand.primary,
      danger: brand.dangerBorderSubtle,
      success: brand.successBorderSubtle,
      warning: brand.warningBorderSubtle,
      info: brand.infoBorderSubtle,
    },
  },
  shadows: lightShadows,
};

// "Normal" — the warm-cream cosy default. Same contrast posture as light, but
// with a softer body/muted surface tinted toward cream. Matches the warm
// surface from the design system's logo lockup.
export const normalTheme: Theme = {
  ...baseTheme,
  mode: 'normal',
  colors: baseColors,
  text: {
    primary: gray[900],
    secondary: gray[700],
    tertiary: gray[600],
    muted: gray[500],
    disabled: gray[400],
    inverse: white,
    link: brand.infoHover,
    linkHover: brand.infoActive,
    danger: brand.dangerHover,
    success: brand.successHover,
    warning: brand.warningHover,
    info: brand.infoHover,
  },
  background: {
    body: warmCream,
    surface: white,
    muted: warmCreamMuted,
    inverse: gray[900],
    overlay: 'rgb(0 0 0 / 0.5)',
    disabled: gray[200],
    danger: brand.dangerBgSubtle,
    success: brand.successBgSubtle,
    warning: brand.warningBgSubtle,
    info: brand.infoBgSubtle,
  },
  border: {
    ...baseTheme.border,
    color: {
      default: gray[300],
      muted: gray[200],
      strong: gray[400],
      focus: brand.primary,
      danger: brand.dangerBorderSubtle,
      success: brand.successBorderSubtle,
      warning: brand.warningBorderSubtle,
      info: brand.infoBorderSubtle,
    },
  },
  shadows: lightShadows,
};

export const darkTheme: Theme = {
  ...baseTheme,
  mode: 'dark',
  colors: baseColors,
  text: {
    primary: gray[100],
    secondary: gray[300],
    tertiary: gray[400],
    muted: gray[500],
    disabled: gray[600],
    inverse: gray[900],
    link: '#93C5FD',
    linkHover: '#BFDBFE',
    danger: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
  background: {
    body: black,
    surface: gray[900],
    muted: gray[800],
    inverse: gray[100],
    overlay: 'rgb(0 0 0 / 0.7)',
    disabled: gray[800],
    danger: '#450A0A',
    success: '#052E16',
    warning: '#451A03',
    info: '#172554',
  },
  border: {
    ...baseTheme.border,
    color: {
      default: gray[800],
      muted: gray[800],
      strong: gray[700],
      focus: brand.primary,
      danger: '#7F1D1D',
      success: '#14532D',
      warning: '#78350F',
      info: '#1E3A8A',
    },
  },
  shadows: darkShadows,
};
