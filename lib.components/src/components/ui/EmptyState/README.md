# EmptyState Component

A flexible empty state component for displaying when there's no data or content to show, with customizable icons, messaging, and actions.

## Usage

```tsx
import { EmptyState } from '@lib/components';

function PetListing() {
  const [pets, setPets] = useState([]);

  if (pets.length === 0) {
    return (
      <EmptyState
        title="No pets found"
        description="We couldn't find any pets matching your criteria."
        variant="search"
        actions={[
          {
            label: "Clear filters",
            onClick: () => clearFilters(),
            variant: "primary"
          },
          {
            label: "Browse all pets",
            onClick: () => navigateToAllPets(),
            variant: "secondary"
          }
        ]}
      />
    );
  }

  return <PetGrid pets={pets} />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Main heading text (required) |
| `description` | `string` | - | Optional description text |
| `icon` | `React.ReactNode` | - | Custom icon to display |
| `image` | `string` | - | Image URL to display instead of icon |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the empty state |
| `variant` | `'default' \| 'error' \| 'search' \| 'loading'` | `'default'` | Visual variant with preset icons |
| `actions` | `EmptyStateAction[]` | `[]` | Action buttons to display |

## EmptyStateAction Interface

```tsx
interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}
```

## Features

- **Multiple Variants**: Default, error, search, and loading states with appropriate icons
- **Custom Icons**: Use your own icons or images
- **Action Buttons**: Add primary and secondary actions
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Proper ARIA attributes and semantic HTML

## Examples

### Basic Empty State
```tsx
<EmptyState
  title="No items found"
  description="There are no items to display at this time."
/>
```

### With Custom Icon
```tsx
const PetIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="..." />
  </svg>
);

<EmptyState
  title="No pets available"
  description="All our furry friends have found homes!"
  icon={<PetIcon />}
/>
```

### With Image
```tsx
<EmptyState
  title="No pets available"
  description="All our furry friends have found homes!"
  image="/images/empty-pets.svg"
/>
```

### Error State
```tsx
<EmptyState
  title="Failed to load pets"
  description="Something went wrong while loading the pet listings."
  variant="error"
  actions={[
    {
      label: "Try again",
      onClick: () => refetch(),
      variant: "primary"
    }
  ]}
/>
```

### Search Results
```tsx
<EmptyState
  title="No search results"
  description="No pets match your search criteria. Try adjusting your filters."
  variant="search"
  actions={[
    {
      label: "Clear filters",
      onClick: () => clearFilters(),
      variant: "primary"
    },
    {
      label: "Browse all",
      onClick: () => showAll(),
      variant: "secondary"
    }
  ]}
/>
```

### Loading State
```tsx
<EmptyState
  title="Loading pets..."
  description="Please wait while we fetch the latest pet listings."
  variant="loading"
/>
```

### Multiple Actions
```tsx
<EmptyState
  title="No applications yet"
  description="You haven't submitted any adoption applications."
  actions={[
    {
      label: "Browse pets",
      onClick: () => navigate('/pets'),
      variant: "primary"
    },
    {
      label: "Learn about adoption",
      onClick: () => navigate('/adoption-guide'),
      variant: "secondary"
    },
    {
      label: "Contact us",
      onClick: () => openContact(),
      variant: "secondary"
    }
  ]}
/>
```

### Different Sizes
```tsx
{/* Small - good for cards or smaller sections */}
<EmptyState
  title="No comments"
  description="Be the first to comment!"
  size="sm"
/>

{/* Medium - default, good for main content areas */}
<EmptyState
  title="No pets found"
  description="Try adjusting your search criteria."
  size="md"
/>

{/* Large - good for full page empty states */}
<EmptyState
  title="Welcome to Pet Adoption"
  description="Start by browsing our available pets or creating your profile."
  size="lg"
/>
```

### Disabled Actions
```tsx
<EmptyState
  title="Temporarily unavailable"
  description="This feature is currently under maintenance."
  actions={[
    {
      label: "Retry",
      onClick: () => retry(),
      disabled: true
    }
  ]}
/>
```

## Variants

### Default
- Gray box icon
- Neutral colors
- General purpose empty state

### Error
- Red error icon
- Error colors
- For failed operations or errors

### Search
- Blue search icon
- Primary colors
- For empty search results

### Loading
- Animated loading icon
- Muted colors
- For loading states

## Best Practices

### When to Use
- No search results
- Empty data lists
- Failed data loading
- First-time user experience
- Temporary loading states

### Content Guidelines
- **Title**: Be clear and specific about what's missing
- **Description**: Explain why it's empty and what users can do
- **Actions**: Provide helpful next steps

### Examples of Good Content
```tsx
// Good: Specific and actionable
<EmptyState
  title="No pets match your filters"
  description="Try removing some filters or expanding your search area."
  actions={[{ label: "Reset filters", onClick: clearFilters }]}
/>

// Avoid: Vague and unhelpful
<EmptyState
  title="Nothing here"
  description="No data available."
/>
```

## Accessibility

- Uses semantic HTML with proper heading structure
- Includes `role="status"` and `aria-live="polite"` for screen readers
- Action buttons are fully keyboard accessible
- Icons are decorative and don't interfere with screen readers 