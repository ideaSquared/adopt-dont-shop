import React from 'react';

// Core shared types for the component library

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'link'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isFullWidth?: boolean;
  isRounded?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  isFullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

// Re-export additional component types from their respective files
export type { SortDirection, TableColumn, TableProps } from './components/data/Table';
export type {
  CheckboxInputProps,
  CheckboxSize,
  CheckboxState,
} from './components/form/CheckboxInput';
export type {
  SelectInputProps,
  SelectInputSize,
  SelectInputState,
  SelectOption,
} from './components/form/SelectInput';
export type {
  TextAreaProps,
  TextAreaSize,
  TextAreaState,
  TextAreaVariant,
} from './components/form/TextArea';
export type {
  TextInputProps,
  TextInputSize,
  TextInputState,
  TextInputVariant,
} from './components/form/TextInput';
export type { ContainerProps, ContainerSize } from './components/layout/Container';
export type {
  StackAlign,
  StackDirection,
  StackJustify,
  StackProps,
  StackSpacing,
} from './components/layout/Stack';
export type { BreadcrumbItem, BreadcrumbsProps } from './components/navigation/Breadcrumbs';
export type {
  NavItem,
  NavbarProps,
  NavbarVariant,
  UserMenuAction,
} from './components/navigation/Navbar';

export type { AlertProps, AlertSize, AlertVariant } from './components/ui/Alert';
export type { ModalProps, ModalSize } from './components/ui/Modal';
