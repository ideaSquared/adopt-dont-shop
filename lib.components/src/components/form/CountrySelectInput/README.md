# CountrySelectInput Component

A specialized select input component for country selection with flag icons, proper z-index positioning, and comprehensive country data.

## Features

- **Portal Rendering**: Dropdown renders in a portal to ensure it sits above all other DOM elements
- **Proper Z-Index**: Uses theme-based z-index values for consistent layering
- **Country Flags**: Displays country codes as flag placeholders (ready for flag icons)
- **Keyboard Navigation**: Full keyboard support with arrow keys, Enter, and Escape
- **Accessibility**: Proper ARIA attributes and roles
- **Responsive Positioning**: Automatically adjusts position on scroll and resize
- **Theme Integration**: Fully integrated with the design system theme
- **Error Handling**: Built-in error state and helper text support

## Usage

```tsx
import { CountrySelectInput } from '@adopt-dont-shop/components'

// Basic usage
<CountrySelectInput 
  onCountryChange={handleCountryChange}
  countryValue={selectedCountry}
/>

// With full props
<CountrySelectInput 
  onCountryChange={handleCountryChange}
  countryValue={selectedCountry}
  label="Country"
  placeholder="Select your country..."
  error={errorMessage}
  helperText="Choose the country where you live"
  disabled={isLoading}
  fullWidth={true}
  className="custom-country-select"
  data-testid="country-selector"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCountryChange` | `(value: string) => void` | - | Callback when country selection changes (required) |
| `countryValue` | `string` | `''` | Currently selected country name |
| `disabled` | `boolean` | `false` | Whether the select is disabled |
| `label` | `string` | - | Label text for the select |
| `placeholder` | `string` | `'Select Country'` | Placeholder text when no country selected |
| `error` | `string` | - | Error message to display |
| `helperText` | `string` | - | Helper text to display below the select |
| `fullWidth` | `boolean` | `false` | Whether to take full width of container |
| `className` | `string` | - | Additional CSS class names |
| `data-testid` | `string` | - | Test ID for testing purposes |

## Z-Index and Positioning

The component uses several advanced techniques to ensure the dropdown always appears above other content:

1. **Portal Rendering**: The dropdown is rendered using React's `createPortal` to append it directly to `document.body`
2. **Fixed Positioning**: Uses `position: fixed` with calculated coordinates
3. **Theme Z-Index**: Uses `theme.zIndex.dropdown` for consistent layering
4. **Dynamic Updates**: Recalculates position on scroll and resize events

## Keyboard Navigation

- **Arrow Down/Up**: Navigate through options
- **Enter**: Select highlighted option or open dropdown
- **Escape**: Close dropdown
- **Tab**: Move focus away (closes dropdown)

## Accessibility Features

- Proper `role="combobox"` on trigger button
- `aria-expanded` state management
- `aria-selected` on options
- `role="listbox"` on dropdown
- `role="option"` on each country item
- Keyboard event handlers on all interactive elements

## Country Data

The component uses a comprehensive country list from `CountryList.json` with:
- Country names (display labels)
- Country codes (for flag icons)
- Alphabetically sorted for easy browsing

## Example with Error State

```tsx
const [country, setCountry] = useState('')
const [error, setError] = useState('')

const handleCountryChange = (value: string) => {
  setCountry(value)
  if (value) {
    setError('')
  } else {
    setError('Please select a country')
  }
}

return (
  <CountrySelectInput
    onCountryChange={handleCountryChange}
    countryValue={country}
    label="Country of Residence"
    error={error}
    helperText="This helps us provide region-specific information"
    required
  />
)
```

## Styling Notes

The component uses styled-components and integrates with the theme system:
- Border colors change based on state (default, error, focus)
- Hover and focus states provide visual feedback
- Error state shows red border and error text
- Disabled state has appropriate opacity and cursor

## Technical Implementation

- Uses React Hooks for state management
- Event listeners for outside clicks, scroll, and resize
- Calculates dropdown position using `getBoundingClientRect()`
- Portal rendering ensures proper z-index behavior
- Throttled position updates for performance 