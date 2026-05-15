// Modern component library exports for Adopt Don't Shop
// Testing hot reload functionality - if you see this change, hot reload is working!

// Theme exports
export { darkTheme, highContrastTheme, lightTheme } from './styles/theme';
export type { Theme, ThemeMode } from './styles/theme';
export {
  HIGH_CONTRAST_STORAGE_KEY,
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from './styles/ThemeProvider';
export { darkThemeClass, highContrastThemeClass, lightThemeClass, vars } from './styles/theme.css';
export {
  HIGH_CONTRAST_SHORTCUT_HINT,
  HighContrastToggle,
} from './components/ui/HighContrastToggle/HighContrastToggle';
export type { HighContrastToggleProps } from './components/ui/HighContrastToggle/HighContrastToggle';

// Hooks
export { useConfirm } from './hooks/useConfirm';
export type { ConfirmOptions, UseConfirmReturn } from './hooks/useConfirm';
export { useToast } from './hooks/useToast';
export type { ToastMessage, UseToastReturn } from './hooks/useToast';

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
export type { SelectOption } from './components/form/SelectInput/';
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

// Form components
export * from './components/form/FileUpload';
// export * from './components/form/RadioInput';

// UI components - commenting out problematic ones
// export * from './components/ui/EmptyState';
// export * from './components/ui/Pagination';
// export * from './components/ui/ProgressBar';
export { Toast, ToastContainer } from './components/ui/Toast';
export type { ToastContainerProps, ToastPosition, ToastProps } from './components/ui/Toast';

// ADS-125: sonner-based toast notification system
export { Toaster, toast } from './components/ui/Toaster';
export type { ToasterProps } from './components/ui/Toaster';

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

// Analytics chart primitives + report builder (ADS-105)
export { ChartFrame } from './components/charts/ChartFrame';
export type { ChartFrameProps } from './components/charts/ChartFrame';
export { LineChart } from './components/charts/LineChart';
export type { LineChartProps } from './components/charts/LineChart';
export { BarChart } from './components/charts/BarChart';
export type { BarChartProps } from './components/charts/BarChart';
export { PieChart } from './components/charts/PieChart';
export type { PieChartProps } from './components/charts/PieChart';
export { AreaChart } from './components/charts/AreaChart';
export type { AreaChartProps } from './components/charts/AreaChart';
export { MetricCard } from './components/charts/MetricCard';
export type { MetricCardProps, MetricCardFormat } from './components/charts/MetricCard';
export { DataTable } from './components/charts/DataTable';
export type { DataTableProps, DataTableColumn } from './components/charts/DataTable';
export { PALETTE as ChartPalette } from './components/charts/types';
export type { ChartSeries, ChartDatum } from './components/charts/types';

export { ReportRenderer } from './components/reports/ReportRenderer';
export type {
  ReportRendererProps,
  ReportRendererWidget,
} from './components/reports/ReportRenderer';
export { ReportBuilder } from './components/reports/ReportBuilder';
export type { ReportBuilderProps, ReportBuilderConfig } from './components/reports/ReportBuilder';
export { FilterPanel } from './components/reports/FilterPanel';
export type { FilterPanelProps, FilterPanelValue } from './components/reports/FilterPanel';
export {
  WidgetPicker,
  DEFAULT_PRESETS as DEFAULT_WIDGET_PRESETS,
} from './components/reports/WidgetPicker';
export type { WidgetPickerProps, WidgetPreset } from './components/reports/WidgetPicker';
export { DrillDownModal } from './components/reports/DrillDownModal';
export type { DrillDownModalProps } from './components/reports/DrillDownModal';
