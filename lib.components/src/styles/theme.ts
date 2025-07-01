import { animations, palette, typography } from './colors';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  typography: typeof typography;
  animations: typeof animations;
  shadows: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    inner: string;
    primary: string;
    secondary: string;
    success: string;
    error: string;
    focus: string;
    focusPrimary: string;
    focusError: string;
    focusWarning: string;
    focusSuccess: string;
  };
  colors: {
    primary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
    };
    secondary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
    };
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
    };
    semantic: {
      success: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
      };
      error: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
      };
      warning: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
      };
      info: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
      };
    };
    gradients: {
      primary: string;
      secondary: string;
      success: string;
      warm: string;
      cool: string;
    };
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
    inverse: string;
    disabled: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    link: string;
    linkHover: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    overlay: string;
    disabled: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };
  border: {
    width: {
      none: string;
      thin: string;
      normal: string;
      thick: string;
      thicker: string;
    };
    radius: {
      none: string;
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      full: string;
    };
    color: {
      primary: string;
      secondary: string;
      tertiary: string;
      quaternary: string;
      disabled: string;
      focus: string;
      success: string;
      error: string;
      warning: string;
      info: string;
    };
  };
  spacing: {
    none: string;
    px: string;
    0.5: string;
    1: string;
    1.5: string;
    2: string;
    2.5: string;
    3: string;
    3.5: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
    9: string;
    10: string;
    11: string;
    12: string;
    14: string;
    16: string;
    20: string;
    24: string;
    28: string;
    32: string;
    36: string;
    40: string;
    44: string;
    48: string;
    52: string;
    56: string;
    60: string;
    64: string;
    72: string;
    80: string;
    96: string;
    // Legacy naming for backward compatibility
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  transitions: {
    none: string;
    fast: string;
    normal: string;
    slow: string;
    slower: string;
  };
  breakpoints: {
    xs: string;
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
    banner: number;
    overlay: number;
    modal: number;
    popover: number;
    skipLink: number;
    toast: number;
    tooltip: number;
  };
}

const baseTheme = {
  typography,
  animations,
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '3xl': '0 35px 60px -15px rgb(0 0 0 / 0.3)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    // Modern colored shadows for 2024
    primary: '0 10px 25px -3px rgb(244 63 94 / 0.3), 0 4px 6px -4px rgb(244 63 94 / 0.2)',
    secondary: '0 10px 25px -3px rgb(20 184 166 / 0.3), 0 4px 6px -4px rgb(20 184 166 / 0.2)',
    success: '0 10px 25px -3px rgb(34 197 94 / 0.3), 0 4px 6px -4px rgb(34 197 94 / 0.2)',
    error: '0 10px 25px -3px rgb(239 68 68 / 0.3), 0 4px 6px -4px rgb(239 68 68 / 0.2)',
    // Focus shadows for accessibility
    focus: '0 0 0 3px rgb(59 130 246 / 0.5)',
    focusPrimary: '0 0 0 3px rgb(244 63 94 / 0.5)',
    focusError: '0 0 0 3px rgb(239 68 68 / 0.5)',
    focusWarning: '0 0 0 3px rgb(245 158 11 / 0.5)',
    focusSuccess: '0 0 0 3px rgb(34 197 94 / 0.5)',
  },
  spacing: {
    none: '0',
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem', // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem', // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem', // 12px
    3.5: '0.875rem', // 14px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    7: '1.75rem', // 28px
    8: '2rem', // 32px
    9: '2.25rem', // 36px
    10: '2.5rem', // 40px
    11: '2.75rem', // 44px
    12: '3rem', // 48px
    14: '3.5rem', // 56px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    28: '7rem', // 112px
    32: '8rem', // 128px
    36: '9rem', // 144px
    40: '10rem', // 160px
    44: '11rem', // 176px
    48: '12rem', // 192px
    52: '13rem', // 208px
    56: '14rem', // 224px
    60: '15rem', // 240px
    64: '16rem', // 256px
    72: '18rem', // 288px
    80: '20rem', // 320px
    96: '24rem', // 384px
    // Legacy naming for backward compatibility
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
    '4xl': '5rem', // 80px
  },

  border: {
    width: {
      none: '0',
      thin: '1px',
      normal: '2px',
      thick: '4px',
      thicker: '8px',
    },
    radius: {
      none: '0',
      xs: '0.125rem', // 2px
      sm: '0.25rem', // 4px
      md: '0.375rem', // 6px
      lg: '0.5rem', // 8px
      xl: '0.75rem', // 12px
      '2xl': '1rem', // 16px
      '3xl': '1.5rem', // 24px
      full: '9999px',
    },
  },

  transitions: {
    none: 'none',
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    slower: '700ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  breakpoints: {
    xs: '480px',
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
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
};

export const lightTheme: Theme = {
  ...baseTheme,
  mode: 'light',
  colors: {
    primary: palette.primary,
    secondary: palette.secondary,
    neutral: palette.neutral,
    semantic: {
      success: palette.success,
      error: palette.error,
      warning: palette.warning,
      info: palette.info,
    },
    gradients: palette.gradients,
  },
  text: {
    primary: palette.neutral[900],
    secondary: palette.neutral[700],
    tertiary: palette.neutral[600],
    quaternary: palette.neutral[500],
    inverse: palette.neutral[50],
    disabled: palette.neutral[400],
    success: palette.success[700],
    error: palette.error[700],
    warning: palette.warning[700],
    info: palette.info[700],
    link: palette.info[600],
    linkHover: palette.info[700],
  },
  background: {
    primary: palette.neutral[50],
    secondary: palette.white,
    tertiary: palette.neutral[100],
    inverse: palette.neutral[900],
    overlay: 'rgb(0 0 0 / 0.5)',
    disabled: palette.neutral[100],
    success: palette.success[50],
    error: palette.error[50],
    warning: palette.warning[50],
    info: palette.info[50],
  },
  border: {
    ...baseTheme.border,
    color: {
      primary: palette.neutral[200],
      secondary: palette.neutral[300],
      tertiary: palette.neutral[400],
      quaternary: palette.neutral[500],
      disabled: palette.neutral[200],
      focus: palette.primary[500],
      success: palette.success[300],
      error: palette.error[300],
      warning: palette.warning[300],
      info: palette.info[300],
    },
  },
};

export const darkTheme: Theme = {
  ...baseTheme,
  mode: 'dark',
  colors: {
    primary: palette.primary,
    secondary: palette.secondary,
    neutral: {
      50: palette.neutral[950],
      100: palette.neutral[900],
      200: palette.neutral[800],
      300: palette.neutral[700],
      400: palette.neutral[600],
      500: palette.neutral[500],
      600: palette.neutral[400],
      700: palette.neutral[300],
      800: palette.neutral[200],
      900: palette.neutral[100],
      950: palette.neutral[50],
    },
    semantic: {
      success: palette.success,
      error: palette.error,
      warning: palette.warning,
      info: palette.info,
    },
    gradients: palette.gradients,
  },
  text: {
    primary: palette.neutral[100],
    secondary: palette.neutral[300],
    tertiary: palette.neutral[400],
    quaternary: palette.neutral[500],
    inverse: palette.neutral[900],
    disabled: palette.neutral[600],
    success: palette.success[400],
    error: palette.error[400],
    warning: palette.warning[400],
    info: palette.info[400],
    link: palette.info[400],
    linkHover: palette.info[300],
  },
  background: {
    primary: palette.neutral[950],
    secondary: palette.neutral[900],
    tertiary: palette.neutral[800],
    inverse: palette.neutral[50],
    overlay: 'rgb(0 0 0 / 0.7)',
    disabled: palette.neutral[800],
    success: palette.success[950],
    error: palette.error[950],
    warning: palette.warning[950],
    info: palette.info[950],
  },
  border: {
    ...baseTheme.border,
    color: {
      primary: palette.neutral[800],
      secondary: palette.neutral[700],
      tertiary: palette.neutral[600],
      quaternary: palette.neutral[500],
      disabled: palette.neutral[800],
      focus: palette.primary[500],
      success: palette.success[600],
      error: palette.error[600],
      warning: palette.warning[600],
      info: palette.info[600],
    },
  },
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.15)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.2), 0 1px 2px -1px rgb(0 0 0 / 0.2)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.2)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.2)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.4)',
    '3xl': '0 35px 60px -15px rgb(0 0 0 / 0.5)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)',
    // Modern colored shadows for 2024 (dark theme versions)
    primary: '0 10px 25px -3px rgb(244 63 94 / 0.4), 0 4px 6px -4px rgb(244 63 94 / 0.3)',
    secondary: '0 10px 25px -3px rgb(20 184 166 / 0.4), 0 4px 6px -4px rgb(20 184 166 / 0.3)',
    success: '0 10px 25px -3px rgb(34 197 94 / 0.4), 0 4px 6px -4px rgb(34 197 94 / 0.3)',
    error: '0 10px 25px -3px rgb(239 68 68 / 0.4), 0 4px 6px -4px rgb(239 68 68 / 0.3)',
    focus: '0 0 0 3px rgb(59 130 246 / 0.2)',
    focusPrimary: '0 0 0 3px rgb(244 63 94 / 0.2)',
    focusError: '0 0 0 3px rgb(239 68 68 / 0.2)',
    focusWarning: '0 0 0 3px rgb(245 158 11 / 0.2)',
    focusSuccess: '0 0 0 3px rgb(34 197 94 / 0.2)',
  },
};
