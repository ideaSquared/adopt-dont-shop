import { vars } from '../../styles/theme.css';

/**
 * Shared shape for every single-line form control (Input, TextInput, SelectInput, DateInput)
 * and the box styling TextArea reuses. Change it here and all controls follow.
 */
export const control = {
  radius: vars.border.radius.base,
  borderColor: vars.border.color.default,
  background: vars.background.body,
  paddingX: vars.spacing['3'],
  height: {
    sm: '2rem',
    md: '2.5rem',
    lg: '3rem',
  },
  fontSize: {
    sm: vars.typography.size.sm,
    md: vars.typography.size.base,
    lg: vars.typography.size.lg,
  },
  focusRing: vars.shadows.focus,
  focusRingDanger: vars.shadows.focusDanger,
} as const;
