// Modern component library exports for Adopt Don't Shop

// Theme exports
export { GlobalStyles } from './styles/GlobalStyles';
export { darkTheme, lightTheme } from './styles/theme';
export type { Theme, ThemeMode } from './styles/theme';
export { ThemeProvider, useTheme } from './styles/ThemeProvider';

// Foundation Components
export { Avatar } from './components/ui/Avatar';
export { Badge } from './components/ui/Badge';
export { Button } from './components/ui/Button';
export { Heading } from './components/ui/Heading';
export { DotSpinner, Spinner } from './components/ui/Spinner';
export { Text } from './components/ui/Text';

// Layout Components
export { Container } from './components/layout/Container';
export { Stack } from './components/layout/Stack';
export { Card, CardContent, CardFooter, CardHeader } from './components/ui/Card';

// Form Components
export { CheckboxInput } from './components/form/CheckboxInput';
export { SelectInput } from './components/form/SelectInput';
export { TextArea } from './components/form/TextArea';
export { TextInput } from './components/form/TextInput';
export { Input } from './components/ui/Input';

// Feedback Components
export { Alert } from './components/ui/Alert';
export { Modal } from './components/ui/Modal';

// Navigation Components
export { Breadcrumbs } from './components/navigation/Breadcrumbs';
export { Navbar } from './components/navigation/Navbar';

// Data Display Components
export { Table } from './components/data/Table';

// Pet-Specific Components
export { PetCard } from './components/pet/PetCard';
export { PetFilters } from './components/pet/PetFilters';

// Types
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
  Pet,
  PetCardProps,
  PetFilterValues,
  PetFiltersProps,
  PetStatus,
  SelectInputProps,
  StackProps,
  TableColumn,
  TableProps,
  TextAreaProps,
  TextInputProps,
} from './types';
