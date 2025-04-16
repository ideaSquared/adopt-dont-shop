import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test' // Import fn for actions
import ImageGallery from './ImageGallery'
// Assuming you have placeholder images or use URLs
// import noImage from './no-image.png' // Keep note of the original import
const noImageUrl = './no-image.png' // Use string representation for story

const meta = {
  title: 'Components/ImageGallery',
  component: ImageGallery,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    // Add optional actions to args
    onUpload: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof ImageGallery>

export default meta
type Story = StoryObj<typeof meta>

// Convert sampleImages to string array
const sampleImageUrls: string[] = [
  'https://via.placeholder.com/600x400/FF0000/FFFFFF?text=Image+1',
  'https://via.placeholder.com/600x400/00FF00/000000?text=Image+2',
  'https://via.placeholder.com/600x400/0000FF/FFFFFF?text=Image+3',
  noImageUrl, // Use string representation
]

export const DefaultGallery: Story = {
  // Renamed for clarity
  args: {
    images: sampleImageUrls,
    viewMode: 'gallery', // Add required viewMode
  },
}

export const DefaultCarousel: Story = {
  // Added carousel view
  args: {
    images: sampleImageUrls,
    viewMode: 'carousel', // Add required viewMode
  },
}

export const Empty: Story = {
  args: {
    images: [],
    viewMode: 'gallery', // Add required viewMode
  },
}
