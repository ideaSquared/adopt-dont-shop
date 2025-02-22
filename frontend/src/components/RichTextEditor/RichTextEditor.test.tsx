import { fireEvent, render, screen } from '@testing-library/react'
import RichTextEditor from './RichTextEditor'

describe('RichTextEditor', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default placeholder', () => {
    render(<RichTextEditor value="" onChange={mockOnChange} />)
    expect(
      screen.getByPlaceholderText('Type your message...'),
    ).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Write something...'
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
        placeholder={customPlaceholder}
      />,
    )
    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument()
  })

  it('displays initial value', () => {
    const initialValue = '<p>Hello, world!</p>'
    render(<RichTextEditor value={initialValue} onChange={mockOnChange} />)
    expect(screen.getByText('Hello, world!')).toBeInTheDocument()
  })

  it('calls onChange with HTML format', () => {
    render(<RichTextEditor value="" onChange={mockOnChange} />)

    const editor = screen.getByRole('textbox')
    fireEvent.change(editor, { target: { value: 'New content' } })

    expect(mockOnChange).toHaveBeenCalledWith(expect.any(String), 'html')
  })

  it('renders toolbar with formatting options', () => {
    render(<RichTextEditor value="" onChange={mockOnChange} />)

    // Check for common formatting buttons
    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
    expect(screen.getByLabelText('Italic')).toBeInTheDocument()
    expect(screen.getByLabelText('Underline')).toBeInTheDocument()
  })
})
