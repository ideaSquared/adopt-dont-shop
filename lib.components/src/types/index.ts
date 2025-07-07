export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: string;
  size: string;
  description: string;
  images: string[];
  isAvailable: boolean;
  rescueId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  petId: string;
  userId: string;
  status: ApplicationStatus;
  answers: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export type UserRole = 'USER' | 'RESCUE_ADMIN' | 'RESCUE_STAFF' | 'ADMIN';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type NotificationType = 'APPLICATION' | 'MESSAGE' | 'SYSTEM' | 'ADOPTION';

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
