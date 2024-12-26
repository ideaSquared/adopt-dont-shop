import { theme } from '@adoptdontshop/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import ImageGallery from './ImageGallery'

describe('ImageGallery Component', () => {
  const initialImages = [
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150/0000FF',
    'https://via.placeholder.com/150/FF0000',
  ]

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('renders images correctly in gallery view', () => {
    renderWithTheme(<ImageGallery images={initialImages} viewMode="gallery" />)

    const images = screen.getAllByRole('img')
    expect(images.length).toBe(initialImages.length)

    initialImages.forEach((src, index) => {
      expect(images[index]).toHaveAttribute('src', src)
    })
  })

  it('renders a single image in carousel view', () => {
    renderWithTheme(<ImageGallery images={initialImages} viewMode="carousel" />)

    const images = screen.getAllByRole('img')
    expect(images.length).toBe(1)
    expect(images[0]).toHaveAttribute('src', initialImages[0])
  })

  it('calls onUpload when an image is uploaded', async () => {
    const mockOnUpload = jest.fn()
    renderWithTheme(
      <ImageGallery images={[]} viewMode="gallery" onUpload={mockOnUpload} />,
    )

    const file = new File(['dummy content'], 'example.png', {
      type: 'image/png',
    })
    const input = screen.getByLabelText(/upload image/i)

    // Simulate the upload
    fireEvent.change(input, { target: { files: [file] } })

    // Wait for the onUpload callback to be called
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledTimes(1)
    })

    // Verify the file was passed correctly
    expect(mockOnUpload).toHaveBeenCalledWith(file)
  })

  it('calls onDelete when an image is deleted in gallery view', () => {
    const mockOnDelete = jest.fn()
    renderWithTheme(
      <ImageGallery
        images={initialImages}
        viewMode="gallery"
        onDelete={mockOnDelete}
      />,
    )

    const deleteButtons = screen.getAllByRole('button', { name: /x/i })
    expect(deleteButtons.length).toBe(initialImages.length)

    fireEvent.click(deleteButtons[0])

    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith(0)
  })

  it('calls onDelete when an image is deleted in carousel view', () => {
    const mockOnDelete = jest.fn()
    renderWithTheme(
      <ImageGallery
        images={initialImages}
        viewMode="carousel"
        onDelete={mockOnDelete}
      />,
    )

    const deleteButton = screen.getByRole('button', { name: /x/i })
    expect(deleteButton).toBeInTheDocument()

    fireEvent.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith(0)
  })

  it('does not show delete button if onDelete is not provided', () => {
    renderWithTheme(<ImageGallery images={initialImages} viewMode="gallery" />)

    const deleteButtons = screen.queryAllByRole('button', { name: /x/i })
    expect(deleteButtons.length).toBe(0)
  })

  it('does not show upload button if onUpload is not provided', () => {
    renderWithTheme(<ImageGallery images={initialImages} viewMode="gallery" />)

    const uploadButton = screen.queryByLabelText(/upload image/i)
    expect(uploadButton).not.toBeInTheDocument()
  })

  it('updates the image index when a dot is clicked in carousel view', () => {
    renderWithTheme(<ImageGallery images={initialImages} viewMode="carousel" />)

    const dots = screen.getAllByRole('button', { name: '' }) // Navigation dots
    expect(dots.length).toBe(initialImages.length)

    fireEvent.click(dots[1]) // Click the second dot
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', initialImages[1])
  })
})
