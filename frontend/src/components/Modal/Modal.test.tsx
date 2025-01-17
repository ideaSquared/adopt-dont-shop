import { lightTheme as theme } from '@adoptdontshop/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import Modal from './Modal'

describe('Modal', () => {
  const title = 'Test Modal'
  const content = 'This is the modal content'
  const mockOnClose = jest.fn()

  const renderModal = (isOpen: boolean) =>
    render(
      <ThemeProvider theme={theme}>
        <Modal title={title} isOpen={isOpen} onClose={mockOnClose}>
          {content}
        </Modal>
      </ThemeProvider>,
    )

  beforeEach(() => {
    mockOnClose.mockClear() // Clear mock function calls before each test
  })

  it('renders correctly when open', () => {
    renderModal(true)

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(content)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderModal(false)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    renderModal(true)

    const closeButton = screen.getByTestId('modal-close-button')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the footer close button is clicked', () => {
    renderModal(true)

    const footerCloseButton = screen.getByText('Close')
    fireEvent.click(footerCloseButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
