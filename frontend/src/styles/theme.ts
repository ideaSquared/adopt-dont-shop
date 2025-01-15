import { palette, typography } from './colors'

export type ThemeMode = 'light' | 'dark'

export type Theme = {
  typography: typeof typography
  text: {
    body: string
    dark: string
    light: string
    dim: string
    highlight: string
    link: string
    danger: string
    success: string
    warning: string
    info: string
  }
  background: {
    body: string
    content: string
    contrast: string
    highlight: string
    mouseHighlight: string
    danger: string
    success: string
    warning: string
    info: string
    disabled: string
  }
  border: {
    width: {
      thin: string
      normal: string
      thick: string
    }
    radius: {
      none: string
      sm: string
      md: string
      lg: string
      full: string
    }
    color: {
      default: string
      focus: string
      hover: string
      success: string
      danger: string
      warning: string
      info: string
      disabled: string
    }
  }
  spacing: {
    none: string
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
  }
  shadows: {
    none: string
    sm: string
    md: string
    lg: string
  }
  transitions: {
    fast: string
    normal: string
    slow: string
  }
  breakpoints: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  zIndex: {
    base: number
    dropdown: number
    sticky: number
    fixed: number
    modal: number
    popover: number
    toast: number
    tooltip: number
  }
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
  },

  border: {
    width: {
      thin: '1px',
      normal: '2px',
      thick: '4px',
    },
    radius: {
      none: '0',
      sm: '0.125rem',
      md: '0.25rem',
      lg: '0.5rem',
      full: '9999px',
    },
  },

  transitions: {
    fast: '100ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
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
}

export const lightTheme: Theme = {
  ...baseTheme,
  text: {
    body: palette.darkGrey,
    dark: palette.veryDarkGrey,
    light: palette.white,
    dim: palette.mediumGrey,
    highlight: palette.brightOrange,
    link: palette.brightBlue,
    danger: palette.brightRed,
    success: palette.brightGreen,
    warning: palette.brightOrange,
    info: palette.brightSkyBlue,
  },

  background: {
    body: palette.veryLightGrey,
    content: palette.white,
    contrast: palette.paleGrey,
    highlight: palette.brightYellow,
    mouseHighlight: palette.brightAmber,
    danger: palette.lightRed,
    success: palette.lightGreen,
    warning: palette.lightOrangeYellow,
    info: palette.lightSkyBlue,
    disabled: palette.paleGrey,
  },

  border: {
    ...baseTheme.border,
    color: {
      default: palette.lightGrey,
      focus: palette.brightOrange,
      hover: palette.brightOrange,
      success: palette.brightGreen,
      danger: palette.brightRed,
      warning: palette.brightOrange,
      info: palette.brightSkyBlue,
      disabled: palette.mediumGrey,
    },
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
}

export const darkTheme: Theme = {
  ...baseTheme,
  text: {
    body: palette.white,
    dark: palette.white,
    light: palette.veryLightGrey,
    dim: palette.lightGrey,
    highlight: palette.lightOrangeYellow,
    link: palette.lightBlue,
    danger: palette.lightRed,
    success: palette.lightGreen,
    warning: palette.lightOrange,
    info: palette.lightSkyBlue,
  },

  background: {
    body: palette.veryDarkGrey,
    content: palette.darkGrey,
    contrast: palette.mediumGrey,
    highlight: palette.darkYellow,
    mouseHighlight: palette.darkAmber,
    danger: palette.darkRed,
    success: palette.darkGreen,
    warning: palette.darkOrange,
    info: palette.darkSkyBlue,
    disabled: palette.mediumGrey,
  },

  border: {
    ...baseTheme.border,
    color: {
      default: palette.mediumGrey,
      focus: palette.darkOrange,
      hover: palette.darkOrange,
      success: palette.darkGreen,
      danger: palette.darkRed,
      warning: palette.darkOrange,
      info: palette.darkSkyBlue,
      disabled: palette.mediumGrey,
    },
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
  },
}
