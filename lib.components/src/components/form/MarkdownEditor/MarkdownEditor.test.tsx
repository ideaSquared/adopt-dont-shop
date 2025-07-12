import { fireEvent, render } from '@testing-library/react';
import MarkdownEditor from './MarkdownEditor';

// TODO: Fix this test
describe.skip('MarkdownEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    render(<MarkdownEditor value='' onChange={mockOnChange} />);
    const editor = document.querySelector('.ql-editor[data-placeholder="Type your message..."]');
    expect(editor).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Write something...';
    render(<MarkdownEditor value='' onChange={mockOnChange} placeholder={customPlaceholder} />);
    const editor = document.querySelector(`.ql-editor[data-placeholder="${customPlaceholder}"]`);
    expect(editor).toBeInTheDocument();
  });

  it('displays initial value', () => {
    const initialValue = '<p>Hello, world!</p>';
    render(<MarkdownEditor value={initialValue} onChange={mockOnChange} />);
    const editor = document.querySelector('.ql-editor');
    expect(editor).not.toBeNull();
    expect(editor?.innerHTML).toBe(initialValue);
  });

  it('calls onChange with HTML format', () => {
    render(<MarkdownEditor value='' onChange={mockOnChange} />);
    const editor = document.querySelector('.ql-editor');
    expect(editor).not.toBeNull();
    fireEvent.input(editor!, { target: { innerHTML: '<p>New content</p>' } });
    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('New content'), 'html');
  });

  it('renders toolbar with formatting options', () => {
    render(<MarkdownEditor value='' onChange={mockOnChange} />);

    // Check for common formatting buttons in Quill's toolbar
    const boldButton = document.querySelector('button.ql-bold');
    const italicButton = document.querySelector('button.ql-italic');
    const underlineButton = document.querySelector('button.ql-underline');

    expect(boldButton).toBeInTheDocument();
    expect(italicButton).toBeInTheDocument();
    expect(underlineButton).toBeInTheDocument();
  });
});
