import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import MarkdownEditor from './MarkdownEditor';

/**
 * The original test suite targeted a Quill-based implementation. The
 * component has since been reduced to a labelled textarea with a markdown
 * hint, so these tests cover the actual surface: rendering the placeholder,
 * displaying the initial value, calling onChange with markdown format, and
 * honouring the readOnly flag.
 */
describe('MarkdownEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the default placeholder when none is provided', () => {
    render(<MarkdownEditor value='' onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('uses a custom placeholder when provided', () => {
    render(<MarkdownEditor value='' onChange={vi.fn()} placeholder='Write something...' />);
    expect(screen.getByPlaceholderText('Write something...')).toBeInTheDocument();
  });

  it('displays the initial value', () => {
    const value = '# Hello, world!';
    render(<MarkdownEditor value={value} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Message input')).toHaveValue(value);
  });

  it('calls onChange with the new content and markdown format on input', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value='' onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Message input'), {
      target: { value: 'New **content**' },
    });

    expect(onChange).toHaveBeenCalledWith('New **content**', 'markdown');
  });

  it('disables the textarea when readOnly is true', () => {
    render(<MarkdownEditor value='locked' onChange={vi.fn()} readOnly />);
    expect(screen.getByLabelText('Message input')).toBeDisabled();
  });
});
