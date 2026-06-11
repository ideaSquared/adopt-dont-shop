// ADS-281: domain types (`User`, `Pet`, `Application`, `Message`,
// `Notification`, `UserRole`, `ApplicationStatus`, `NotificationType`)
// previously declared here used UPPERCASE literals incompatible with the
// rest of the workspace (`lib.types`, `lib.applications`, etc.). They were
// dead — no consumer imported them — so removing them rather than aligning
// avoids resurrecting the wrong-cased literals as a public surface. The
// real `NotificationType` enum used by the components lives in
// `./notifications`.

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The visual style of the button
   */
  variant?: ButtonVariant;
  /**
   * The size of the button
   */
  size?: ButtonSize;
  /**
   * Whether the button is in loading state
   */
  isLoading?: boolean;
  /**
   * Additional class name for the button
   */
  className?: string;
  /**
   * Whether the button takes full width of its container
   */
  isFullWidth?: boolean;
  /**
   * Whether the button has rounded corners
   */
  isRounded?: boolean;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Icon to display at the start of the button
   */
  startIcon?: React.ReactNode;
  /**
   * Icon to display at the end of the button
   */
  endIcon?: React.ReactNode;
  /**
   * Button content
   */
  children: React.ReactNode;
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Input label
   */
  label?: string;
  /**
   * Helper text to be shown below the input
   */
  helperText?: string;
  /**
   * Error message to be shown
   */
  error?: string;
  /**
   * Whether the input is required
   */
  required?: boolean;
  /**
   * Whether the input is full width
   */
  isFullWidth?: boolean;
  /**
   * Input size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Input visual variant
   */
  variant?: 'default' | 'success' | 'error';
  /**
   * Icon to display at the start of the input
   */
  startIcon?: React.ReactNode;
  /**
   * Icon to display at the end of the input
   */
  endIcon?: React.ReactNode;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}
