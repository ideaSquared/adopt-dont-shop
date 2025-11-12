# FileUpload Component

A versatile file upload component with drag-and-drop functionality, file validation, and preview capabilities.

## Usage

```tsx
import { FileUpload } from '@lib/components';

function MyComponent() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFilesSelect = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  const handleFileRemove = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <FileUpload
      accept='.pdf,.doc,.docx'
      multiple
      maxSize={5242880} // 5MB
      files={files}
      onFilesSelect={handleFilesSelect}
      onFileRemove={handleFileRemove}
      label='Upload documents'
    />
  );
}
```

## Props

| Prop            | Type                                             | Default        | Description                                    |
| --------------- | ------------------------------------------------ | -------------- | ---------------------------------------------- |
| `accept`        | `string`                                         | -              | Accepted file types (MIME types or extensions) |
| `multiple`      | `boolean`                                        | `false`        | Allow multiple file selection                  |
| `maxSize`       | `number`                                         | -              | Maximum file size in bytes                     |
| `maxFiles`      | `number`                                         | -              | Maximum number of files allowed                |
| `size`          | `'sm' \| 'md' \| 'lg'`                           | `'md'`         | Size of the upload area                        |
| `state`         | `'default' \| 'error' \| 'success' \| 'warning'` | `'default'`    | Visual state                                   |
| `disabled`      | `boolean`                                        | `false`        | Disable file upload                            |
| `required`      | `boolean`                                        | `false`        | Mark as required field                         |
| `label`         | `string`                                         | -              | Label for the upload area                      |
| `error`         | `string`                                         | -              | Error message to display                       |
| `helperText`    | `string`                                         | -              | Helper text to display                         |
| `placeholder`   | `string`                                         | Auto-generated | Placeholder text in upload area                |
| `fullWidth`     | `boolean`                                        | `false`        | Take full width of container                   |
| `files`         | `File[]`                                         | `[]`           | Currently selected files                       |
| `onFilesSelect` | `(files: File[]) => void`                        | -              | Callback when files are selected               |
| `onFileRemove`  | `(index: number) => void`                        | -              | Callback when a file is removed                |
| `onError`       | `(error: string) => void`                        | -              | Callback when validation errors occur          |

## Features

- **Drag and Drop**: Drop files directly onto the upload area
- **File Validation**: Validates file type, size, and count
- **File Preview**: Shows selected files with names and sizes
- **Multiple Files**: Support for single or multiple file selection
- **Error Handling**: Built-in validation with custom error callbacks
- **Accessibility**: Full keyboard and screen reader support

## Examples

### Basic Usage

```tsx
<FileUpload onFilesSelect={files => console.log(files)} label='Upload file' />
```

### With File Type Restrictions

```tsx
<FileUpload
  accept='image/*'
  onFilesSelect={handleFiles}
  label='Upload images'
  helperText='JPG, PNG, GIF up to 10MB'
/>
```

### Multiple Files with Size Limit

```tsx
<FileUpload
  multiple
  maxFiles={5}
  maxSize={2097152} // 2MB
  onFilesSelect={handleFiles}
  onFileRemove={handleRemove}
  files={selectedFiles}
  label='Upload documents'
/>
```

### With Error Handling

```tsx
<FileUpload
  accept='.pdf,.doc,.docx'
  maxSize={5242880}
  onFilesSelect={handleFiles}
  onError={error => setErrorMessage(error)}
  error={errorMessage}
  label='Required documents'
  required
/>
```

### Different Sizes

```tsx
<FileUpload size="sm" label="Small upload" />
<FileUpload size="md" label="Medium upload" />
<FileUpload size="lg" label="Large upload" />
```

## File Validation

The component validates files against the following criteria:

1. **File Type**: Based on the `accept` prop (MIME types or file extensions)
2. **File Size**: Based on the `maxSize` prop (in bytes)
3. **File Count**: Based on the `maxFiles` prop

When validation fails, the `onError` callback is called with a descriptive error message.

## Accessibility

- Full keyboard navigation support
- Screen reader accessible
- ARIA labels for all interactive elements
- Focus management for file removal buttons
