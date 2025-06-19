import { palette, typography } from './colors';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  typography: typeof typography;
  colors: {
    primary: {
      light: string;
      main: string;
      dark: string;
    };
    secondary: {
      light: string;
      main: string;
      dark: string;
    };
    neutral: {
      white: string;
      25: string;
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
    };
    semantic: {
      success: {
        light: string;
        main: string;
        dark: string;
      };
      error: {
        light: string;
        main: string;
        dark: string;
      };
      warning: {
        light: string;
        main: string;
        dark: string;
      };
      info: {
        light: string;
        main: string;
        dark: string;
      };
    };
  };
  text: {
    body: string;
    dark: string;
    light: string;
    dim: string;
    highlight: string;
    link: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
    primary: string;
    secondary: string;
  };
  background: {
    body: string;
    content: string;
    contrast: string;
    highlight: string;
    mouseHighlight: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
    disabled: string;
    primary: string;
    secondary: string;
  };
  border: {
    width: {
      thin: string;
      normal: string;
      thick: string;
    };
    radius: {
      none: string;
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      full: string;
    };
    color: {
      default: string;
      focus: string;
      hover: string;
      success: string;
      danger: string;
      warning: string;
      info: string;
      disabled: string;
      primary: string;
      secondary: string;
    };
  };
  spacing: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  shadows: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
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
    dropdown: number;
    sticky: number;
    fixed: number;
    modal: number;
    popover: number;
    toast: number;
    tooltip: number;
  };
}

const baseTheme = {
  typography,
  spacing: {
    none: '0',
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
      thin: '1px',
      normal: '2px',
      thick: '4px',
    },
    radius: {
      none: '0',
      xs: '0.125rem', // 2px
      sm: '0.25rem', // 4px
      md: '0.5rem', // 8px
      lg: '1rem', // 16px
      xl: '1.5rem', // 24px
      full: '9999px',
    },
  },

  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
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
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    toast: 1500,
    tooltip: 1600,
  },

  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

export const lightTheme: Theme = {
  ...baseTheme,
  colors: {
    primary: {
      light: '#FFB3B3',
      main: palette.adoptPrimary,
      dark: '#E55555',
    },
    secondary: {
      light: '#8FE5DF',
      main: palette.adoptSecondary,
      dark: '#3EB8AF',
    },
    neutral: {
      white: palette.white,
      25: '#FCFCFD',
      50: palette.veryLightGrey,
      100: palette.paleGrey,
      200: palette.lightGrey,
      300: '#CED4DA',
      400: '#ADB5BD',
      500: palette.mediumGrey,
      600: '#495057',
      700: palette.darkGrey,
      800: '#2D3748',
      900: palette.veryDarkGrey,
    },
    semantic: {
      success: {
        light: palette.lightGreen,
        main: palette.brightGreen,
        dark: palette.darkGreen,
      },
      error: {
        light: palette.lightRed,
        main: palette.brightRed,
        dark: palette.darkRed,
      },
      warning: {
        light: palette.lightOrangeYellow,
        main: palette.brightOrange,
        dark: palette.darkOrange,
      },
      info: {
        light: palette.lightSkyBlue,
        main: palette.brightSkyBlue,
        dark: palette.darkSkyBlue,
      },
    },
  },
  text: {
    body: palette.darkGrey,
    dark: palette.veryDarkGrey,
    light: palette.white,
    dim: palette.mediumGrey,
    highlight: palette.adoptPrimary,
    link: palette.brightBlue,
    danger: palette.brightRed,
    success: palette.brightGreen,
    warning: palette.brightOrange,
    info: palette.brightSkyBlue,
    primary: palette.adoptPrimary,
    secondary: palette.adoptSecondary,
  },

  background: {
    body: palette.veryLightGrey,
    content: palette.white,
    contrast: palette.paleGrey,
    highlight: palette.brightYellow,
    mouseHighlight: palette.lightOrange,
    danger: palette.lightRed,
    success: palette.lightGreen,
    warning: palette.lightOrangeYellow,
    info: palette.lightSkyBlue,
    disabled: palette.paleGrey,
    primary: palette.adoptPrimary,
    secondary: palette.adoptSecondary,
  },

  border: {
    ...baseTheme.border,
    color: {
      default: palette.lightGrey,
      focus: palette.adoptPrimary,
      hover: palette.mediumGrey,
      success: palette.brightGreen,
      danger: palette.brightRed,
      warning: palette.brightOrange,
      info: palette.brightSkyBlue,
      disabled: palette.paleGrey,
      primary: palette.adoptPrimary,
      secondary: palette.adoptSecondary,
    },
  },
};

export const darkTheme: Theme = {
  ...baseTheme,
  colors: {
    primary: {
      light: '#FFB3B3',
      main: palette.adoptPrimary,
      dark: '#E55555',
    },
    secondary: {
      light: '#8FE5DF',
      main: palette.adoptSecondary,
      dark: '#3EB8AF',
    },
    neutral: {
      white: '#1A1D29',
      25: '#181B26',
      50: '#1E2130',
      100: '#252936',
      200: '#2D323F',
      300: '#3B4049',
      400: '#5C6370',
      500: '#8B929B',
      600: '#A8AFB8',
      700: '#C5CCD5',
      800: '#E1E7ED',
      900: palette.white,
    },
    semantic: {
      success: {
        light: '#2D4A3A',
        main: palette.brightGreen,
        dark: palette.lightGreen,
      },
      error: {
        light: '#4A2D2D',
        main: palette.brightRed,
        dark: palette.lightRed,
      },
      warning: {
        light: '#4A3D2D',
        main: palette.brightOrange,
        dark: palette.lightOrangeYellow,
      },
      info: {
        light: '#2D3E4A',
        main: palette.brightSkyBlue,
        dark: palette.lightSkyBlue,
      },
    },
  },
  text: {
    body: '#E1E7ED',
    dark: palette.white,
    light: palette.veryDarkGrey,
    dim: '#A8AFB8',
    highlight: palette.adoptPrimary,
    link: palette.brightBlue,
    danger: palette.brightRed,
    success: palette.brightGreen,
    warning: palette.brightOrange,
    info: palette.brightSkyBlue,
    primary: palette.adoptPrimary,
    secondary: palette.adoptSecondary,
  },

  background: {
    body: '#181B26',
    content: '#1E2130',
    contrast: '#252936',
    highlight: palette.brightYellow,
    mouseHighlight: '#3B4049',
    danger: '#4A2D2D',
    success: '#2D4A3A',
    warning: '#4A3D2D',
    info: '#2D3E4A',
    disabled: '#252936',
    primary: palette.adoptPrimary,
    secondary: palette.adoptSecondary,
  },

  border: {
    ...baseTheme.border,
    color: {
      default: '#3B4049',
      focus: palette.adoptPrimary,
      hover: '#5C6370',
      success: palette.brightGreen,
      danger: palette.brightRed,
      warning: palette.brightOrange,
      info: palette.brightSkyBlue,
      disabled: '#252936',
      primary: palette.adoptPrimary,
      secondary: palette.adoptSecondary,
    },
  },
};
