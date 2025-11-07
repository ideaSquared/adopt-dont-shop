// Modern component library exports for Adopt Don't Shop
// Testing hot reload functionality - if you see this change, hot reload is working!

// Theme exports
export { GlobalStyles } from './styles/GlobalStyles';
export { darkTheme, lightTheme } from './styles/theme';
export type { Theme, ThemeMode } from './styles/theme';
export { ThemeProvider, useTheme } from './styles/ThemeProvider';

// Hooks
export { useConfirm } from './hooks/useConfirm';
export type { ConfirmOptions, UseConfirmReturn } from './hooks/useConfirm';
export { useToast } from './hooks/useToast';

// Foundation Components
export { Avatar } from './components/ui/Avatar';
export { Badge } from './components/ui/Badge';
export { Button } from './components/ui/Button';
export { default as DateTime } from './components/ui/DateTime/DateTime';
export { Heading } from './components/ui/Heading';
export { DotSpinner, Spinner } from './components/ui/Spinner';
export { Text } from './components/ui/Text';

// Layout Components
export { Container } from './components/layout/Container';
export { Stack } from './components/layout/Stack';
export { Card, CardContent, CardFooter, CardHeader } from './components/ui/Card';

// Form Components - commenting out problematic ones for now
export { CheckboxInput } from './components/form/CheckboxInput';
// export { default as CountrySelectInput } from './components/form/CountrySelectInput';
export { SelectInput } from './components/form/SelectInput/';
export { TextArea } from './components/form/TextArea';
export { TextInput } from './components/form/TextInput';
export { Input } from './components/ui/Input';

// Feedback Components
export { Alert } from './components/ui/Alert';
export { Modal } from './components/ui/Modal';
export { ConfirmDialog } from './components/ui/ConfirmDialog';

// Navigation Components
export { Breadcrumbs } from './components/navigation/Breadcrumbs';
export { Footer } from './components/navigation/Footer';
export { Header } from './components/navigation/Header';
export { Navbar } from './components/navigation/Navbar';

// Data Display Components - commenting out for now
// export { Table } from './components/data/Table';

// Form components - commenting out problematic ones
// export * from './components/form/FileUpload';
// export * from './components/form/RadioInput';

// UI components - commenting out problematic ones
// export * from './components/ui/EmptyState';
// export * from './components/ui/Pagination';
// export * from './components/ui/ProgressBar';
// export * from './components/ui/Toast';

// Types - only export working ones
export type {
  AlertProps,
  AlertVariant,
  BreadcrumbItem,
  BreadcrumbsProps,
  ButtonProps,
  ButtonSize,
  ButtonVariant,
  CheckboxInputProps,
  ContainerProps,
  InputProps,
  ModalProps,
  ModalSize,
  NavbarProps,
  SelectInputProps,
  StackProps,
  TextAreaProps,
  TextInputProps,
} from './types';

export type { ConfirmDialogProps } from './components/ui/ConfirmDialog';

// Component Types
export type { FooterProps } from './components/navigation/Footer';
export type { HeaderProps } from './components/navigation/Header';
