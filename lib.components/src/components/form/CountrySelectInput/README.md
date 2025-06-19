# CountrySelectInput Component

A select input component specifically designed for country selection with comprehensive country data.

## Usage

```tsx
import { CountrySelectInput } from '@/components/form/CountrySelectInput'

// Basic usage
<CountrySelectInput 
  value={selectedCountry}
  onChange={handleCountryChange}
/>

// With custom placeholder
<CountrySelectInput 
  value={selectedCountry}
  onChange={handleCountryChange}
  placeholder="Select a country..."
  className="custom-class"
/>
```

## Props

- `value`: Currently selected country code
- `onChange`: Function called when selection changes
- `placeholder`: Optional placeholder text
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying select element

## Features

- Complete country list with codes
- Search/filter functionality
- Accessible markup
- TypeScript support
- Consistent with other form inputs 