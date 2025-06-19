# ProgressBar Component

A versatile progress bar component for displaying progress indicators, application progress, loading states, and more.

## Usage

```tsx
import { ProgressBar } from '@lib/components';

function ApplicationForm() {
  const [progress, setProgress] = useState(0);
  const totalSteps = 5;
  const currentStep = 2;

  return (
    <div>
      <h2>Adoption Application</h2>
      
      <ProgressBar
        value={currentStep}
        max={totalSteps}
        label="Application Progress"
        showValue
        variant="success"
      />
      
      {/* Form steps */}
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Current progress value (required) |
| `max` | `number` | `100` | Maximum value |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the progress bar |
| `variant` | `'default' \| 'success' \| 'warning' \| 'error'` | `'default'` | Color variant |
| `label` | `string` | - | Label text to display above the bar |
| `showValue` | `boolean` | `false` | Show current/max values |
| `showPercentage` | `boolean` | `false` | Show percentage (takes precedence over showValue) |
| `animated` | `boolean` | `false` | Enable stripe animation |
| `striped` | `boolean` | `false` | Add diagonal stripes |
| `indeterminate` | `boolean` | `false` | Show indeterminate/loading state |

## Features

- **Multiple Variants**: Default, success, warning, and error colors
- **Flexible Display**: Show values, percentages, or just the bar
- **Visual Effects**: Striped patterns and animations
- **Indeterminate State**: For unknown progress duration
- **Accessibility**: Full screen reader support with ARIA attributes
- **Responsive**: Adapts to container width

## Examples

### Basic Progress Bar
```tsx
<ProgressBar value={75} />
```

### With Label and Percentage
```tsx
<ProgressBar
  value={45}
  label="Upload Progress"
  showPercentage
/>
```

### Step Progress (Application Form)
```tsx
<ProgressBar
  value={3}
  max={5}
  label="Application Steps"
  showValue
  variant="success"
/>
```

### File Upload with Custom Max
```tsx
<ProgressBar
  value={15}
  max={20}
  label="Files Uploaded"
  showValue
  variant="default"
/>
```

### Different Variants
```tsx
<ProgressBar value={90} variant="success" label="Complete" />
<ProgressBar value={60} variant="warning" label="In Progress" />
<ProgressBar value={25} variant="error" label="Failed" />
<ProgressBar value={50} variant="default" label="Loading" />
```

### Different Sizes
```tsx
<ProgressBar value={50} size="sm" />
<ProgressBar value={50} size="md" />
<ProgressBar value={50} size="lg" />
```

### Striped Progress Bar
```tsx
<ProgressBar
  value={60}
  striped
  label="Processing"
/>
```

### Animated Striped Progress Bar
```tsx
<ProgressBar
  value={40}
  striped
  animated
  label="Uploading..."
/>
```

### Indeterminate Progress (Loading)
```tsx
<ProgressBar
  value={0}
  indeterminate
  label="Loading pets..."
/>
```

### Application Progress Example
```tsx
function AdoptionApplicationProgress() {
  const steps = [
    'Personal Information',
    'Housing Details', 
    'Pet Preferences',
    'References',
    'Review & Submit'
  ];
  
  const currentStep = 3;

  return (
    <div>
      <ProgressBar
        value={currentStep}
        max={steps.length}
        label={`Step ${currentStep} of ${steps.length}: ${steps[currentStep - 1]}`}
        showValue
        variant="success"
      />
    </div>
  );
}
```

### File Upload Progress
```tsx
function FileUploadProgress() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    setIsUploading(false);
  };

  return (
    <div>
      {isUploading && (
        <ProgressBar
          value={uploadProgress}
          label="Uploading documents..."
          showPercentage
          animated
          striped
        />
      )}
    </div>
  );
}
```

### Multi-Step Form with Progress
```tsx
function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div>
      <ProgressBar
        value={progress}
        label={`Step ${currentStep} of ${totalSteps}`}
        showPercentage
        variant={progress === 100 ? 'success' : 'default'}
      />
      
      {/* Form content */}
      
      <div>
        <button 
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </button>
        <button 
          onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
          disabled={currentStep === totalSteps}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Dynamic Variant Based on Progress
```tsx
function DynamicProgressBar({ value }: { value: number }) {
  const getVariant = (progress: number) => {
    if (progress >= 80) return 'success';
    if (progress >= 60) return 'default';
    if (progress >= 40) return 'warning';
    return 'error';
  };

  return (
    <ProgressBar
      value={value}
      variant={getVariant(value)}
      showPercentage
      label="Application Score"
    />
  );
}
```

## Use Cases

### Adoption Application Progress
- Show completion status of multi-step application forms
- Track required documents upload
- Display application review progress

### Pet Search & Filtering
- Show loading progress when filtering large pet databases
- Display search result processing

### Media Upload
- File upload progress for pet photos
- Document upload for adoption applications
- Video upload progress

### Data Loading
- Loading pet listings
- Processing user preferences
- Generating recommendations

## Accessibility

- Full keyboard navigation support
- Screen reader accessible with proper ARIA attributes
- Progress announcements for assistive technology
- Semantic HTML with `role="progressbar"`
- Descriptive labels for current progress state

## Styling

The component uses the theme system for consistent colors:

- **Default**: Primary theme color
- **Success**: Green for completed/successful states
- **Warning**: Orange for attention/caution states  
- **Error**: Red for error/failed states

## Performance

- Smooth animations with CSS transitions
- Optimized rendering for frequent value updates
- Minimal re-renders with proper prop comparison 