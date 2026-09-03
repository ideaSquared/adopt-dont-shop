# ImageGallery

Displays a list of image URLs either as a swipable carousel or a grid gallery,
with optional upload/delete handlers. Default export from `ImageGallery.tsx`.

> **Not exported** from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.

```tsx
import ImageGallery from './ImageGallery';

<ImageGallery
  images={pet.images.map(i => i.url)}
  viewMode='gallery'
  onUpload={file => uploadPetImage(pet.petId, file)}
  onDelete={fileName => deletePetImage(pet.petId, fileName)}
/>;
```

## Props

| Prop       | Type                         | Required | Description                                         |
| ---------- | ---------------------------- | -------- | --------------------------------------------------- |
| `images`   | `string[]`                   | Yes      | Image URLs (strings, not objects).                  |
| `viewMode` | `'carousel' \| 'gallery'`    | Yes      | Render mode.                                        |
| `onUpload` | `(file: File) => void`       | No       | Show upload affordance and call this with the file. |
| `onDelete` | `(fileName: string) => void` | No       | Show delete affordance and call this with the name. |
