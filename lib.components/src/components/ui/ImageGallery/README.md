# ImageGallery

Displays a list of image URLs either as a swipable carousel or a grid gallery, with optional upload/delete handlers. Default export from `ImageGallery.tsx`. Not re-exported from `lib.components/src/index.ts`.

```tsx
import ImageGallery from '@adopt-dont-shop/lib.components/src/components/ui/ImageGallery/ImageGallery';

<ImageGallery
  images={pet.images.map((i) => i.url)}
  viewMode="gallery"
  onUpload={(file) => uploadPetImage(pet.petId, file)}
  onDelete={(fileName) => deletePetImage(pet.petId, fileName)}
/>
```

## Props

| Prop       | Type                              | Required | Description                                            |
| ---------- | --------------------------------- | -------- | ------------------------------------------------------ |
| `images`   | `string[]`                        | Yes      | Image URLs (strings, not objects).                     |
| `viewMode` | `'carousel' \| 'gallery'`         | Yes      | Render mode.                                           |
| `onUpload` | `(file: File) => void`            | No       | Show upload affordance and call this with the file.    |
| `onDelete` | `(fileName: string) => void`      | No       | Show delete affordance and call this with the name.    |
