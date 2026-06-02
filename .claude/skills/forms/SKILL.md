---
name: forms
description: >
  Patterns for building forms in the React apps. Apply when adding form inputs,
  validation, submission handlers, error display, or multi-step flows. Covers Zod
  schemas, FormField from lib.components, apiService submission, and accessibility.
---

# Forms

Forms in this project follow a consistent stack:

- **Schema** — Zod (shared with the backend via `lib.validation` where possible)
- **Inputs** — components from `lib.components/src/components/form/` (`TextInput`,
  `SelectInput`, `CheckboxInput`, `DateInput`, `TextArea`, `FileUpload`, etc.) wrapped
  in `<FormField>` for label + error wiring
- **Submission** — through `apiService` (see `api-fetch` skill)
- **Server state** — via React Query `useMutation` (see `react-query` skill)

## The full pattern

```typescript
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FormField,
  TextInput,
  SelectInput,
  CheckboxInput,
  Button,
  toast,
} from '@adopt-dont-shop/lib.components';
import { useState } from 'react';
import { petService } from '../services/petService';

const CreatePetFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  species: z.enum(['dog', 'cat', 'rabbit']),
  ageYears: z.coerce.number().int().min(0).max(30),
  fostered: z.boolean().default(false),
});

type CreatePetForm = z.infer<typeof CreatePetFormSchema>;

export const CreatePetForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Partial<CreatePetForm>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof CreatePetForm, string>>>({});

  const mutation = useMutation({
    mutationFn: (payload: CreatePetForm) => petService.create(payload),
    onSuccess: () => {
      toast.success('Pet created');
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create pet');
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = CreatePetFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(formatZodErrors(parsed.error));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField label="Name" htmlFor="pet-name" required error={errors.name}>
        <TextInput
          id="pet-name"
          value={values.name ?? ''}
          onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
          aria-invalid={!!errors.name}
        />
      </FormField>

      <FormField label="Species" htmlFor="pet-species" required error={errors.species}>
        <SelectInput
          id="pet-species"
          value={values.species ?? ''}
          onChange={e => setValues(v => ({ ...v, species: e.target.value as CreatePetForm['species'] }))}
          options={[
            { value: 'dog', label: 'Dog' },
            { value: 'cat', label: 'Cat' },
            { value: 'rabbit', label: 'Rabbit' },
          ]}
        />
      </FormField>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Create pet'}
      </Button>
    </form>
  );
};
```

## Step-by-step

### 1. Define the schema (Zod)

Keep the schema next to the form, or import from `lib.validation` if the backend
uses the same shape. Schema-first means the type is derived (`z.infer`) so the
form and the API contract can't drift.

```typescript
const FormSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^0\d{4} \d{3} \d{4}$/, 'Use UK format: 0XXXX XXX XXX'),
});

type FormValues = z.infer<typeof FormSchema>;
```

### 2. Validate on submit, not on every keystroke

Per-keystroke validation creates jittery error messages. Validate on submit and
clear an individual error when the user edits that field:

```typescript
const handleChange = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
  setValues(v => ({ ...v, [field]: e.target.value }));
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }
};
```

Onblur validation per field is acceptable for fields with expensive checks
(postcode lookup, email-exists). Keep it consistent within a form.

### 3. Use `FormField` for label + error + required marker

`FormField` from `lib.components` handles:

- Rendering the `<label htmlFor>` correctly
- Showing the `required` asterisk
- Slotting an error message with `aria-describedby` wired up
- Spacing between fields

Don't reproduce its scaffolding manually — you'll miss an a11y detail.

### 4. Submit via apiService through a service module

Forms call a service method (`petService.create`), never `fetch`/`axios` directly.
Server state changes flow through React Query mutations:

```typescript
const mutation = useMutation({
  mutationFn: petService.create,
  onSuccess: data => {
    queryClient.invalidateQueries({ queryKey: ['pets'] });
    onClose();
  },
});
```

See the `api-fetch` and `react-query` skills.

### 5. Surface errors accessibly

Per the `accessibility` skill, every error must:
- Be linked to its input via `aria-describedby`
- Set `aria-invalid="true"` on the input
- Be announced — `FormField` handles this via `role="alert"` on the error slot

Top-of-form summary errors (network failures, server-side validation) live in
an `aria-live="polite"` region or a toast. The project uses `toast` from
`lib.components`:

```typescript
import { toast } from '@adopt-dont-shop/lib.components';
toast.error('Submission failed — please try again');
```

### 6. Disable submit while pending

```typescript
<Button type="submit" disabled={mutation.isPending}>
  {mutation.isPending ? 'Saving…' : 'Save'}
</Button>
```

Prevents double-submits. Don't `setDisabled(true)` manually — derive from the
mutation state.

## UK-locale fields

For UK-specific inputs (postcode, phone, address), use the formatters and
validators from `lib.utils`. See the `uk-localization` skill for the full list.

```typescript
import { validatePostcode, formatPhoneNumber } from '@adopt-dont-shop/lib.utils';

const PostcodeSchema = z.string().refine(validatePostcode, 'Invalid UK postcode');
```

## File uploads

Use `FileUpload` from `lib.components/src/components/form/FileUpload`. It handles:
- Drag-and-drop
- File type filtering
- Size limits
- Multi-file accumulation

```typescript
<FormField label="Documents" htmlFor="docs">
  <FileUpload
    id="docs"
    accept="application/pdf,image/*"
    maxSizeBytes={5 * 1024 * 1024}
    onFilesAdded={files => setValues(v => ({ ...v, docs: files }))}
  />
</FormField>
```

The backend upload guard checks MIME types again — see `enforceUploadMime`
middleware. Don't rely on frontend filtering alone for security.

## Multi-step forms

For long flows (rescue onboarding, adoption applications), break the form into
steps with `<FormSection>` and a wizard wrapper that:

1. Keeps all answers in a single state object
2. Validates each step's slice of the schema on "Next"
3. Submits the full payload only on the final step
4. Persists draft state via the relevant draft service if the user might leave

Example: `app.client/src/pages/AdoptionApplicationFlow.tsx` uses
`ApplicationDraftService` to save progress.

## Testing forms

See the `frontend-test` skill. Key points:

- Use `userEvent.setup()` for typing, not `fireEvent`
- Query inputs by label: `screen.getByLabelText(/email/i)`
- Submit by clicking the named button: `screen.getByRole('button', { name: /save/i })`
- Assert errors appear: `await screen.findByText(/required/i)`

```typescript
import { renderWithProviders, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';

it('rejects an empty submission', async () => {
  const user = userEvent.setup();
  renderWithProviders(<CreatePetForm onSuccess={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: /create pet/i }));
  expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
});
```

## Helpers

A `formatZodErrors` utility flattens a `ZodError` into `{ [field]: message }`:

```typescript
const formatZodErrors = (error: z.ZodError) =>
  Object.fromEntries(
    error.errors.map(e => [e.path.join('.'), e.message])
  );
```

Some apps already export this from `src/utils/`; check before redefining.

## Common mistakes

- Using `<input>` without a `<label>` (or `<FormField>`) — fails a11y
- Validating on every keystroke — jittery UX, hostile to slow typers
- Storing each field in its own `useState` — leads to stale-closure bugs.
  One `values` object is simpler.
- Submitting via raw `fetch` instead of through a service module
- Manually disabling submit and forgetting to re-enable on failure — use
  `mutation.isPending`
- Putting validation errors as inline `<span style={{ color: 'red' }}>` — bypasses
  the a11y wiring in `FormField` (see the `accessibility` and `design-tokens` skills)
- Toasting on every keystroke validation error — only toast on submission failure
- Not handling the loading state on submit → double-submits
- Skipping the postcode/phone formatter for UK fields → inconsistent display
  (see the `uk-localization` skill)
