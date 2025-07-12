import React from 'react';
import styled from 'styled-components';

const EditorContainer = styled.div`
  flex: 1;
  min-width: 0;
  position: relative;
`;

const StyledTextArea = styled.textarea`
  width: 100%;
  height: 150px;
  padding: ${props => props.theme.spacing.md};
  background-color: ${props => props.theme.background.primary};
  border: ${props => props.theme.border.width.thin} solid
    ${props => props.theme.border.color.primary};
  border-radius: ${props => props.theme.border.radius.md};
  font-family: monospace;
  font-size: ${props => props.theme.typography.size.sm};
  line-height: 1.5;
  resize: none;
  color: ${props => props.theme.text.primary};

  &::placeholder {
    color: ${props => props.theme.text.secondary};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.border.color.focus};
  }

  &:disabled {
    background-color: ${props => props.theme.background.disabled};
    cursor: not-allowed;
  }
`;

const MarkdownHint = styled.div`
  position: absolute;
  right: ${props => props.theme.spacing.sm};
  bottom: ${props => props.theme.spacing.sm};
  font-size: ${props => props.theme.typography.size.xs};
  color: ${props => props.theme.text.secondary};
  pointer-events: none;
`;

type MarkdownEditorProps = {
  value: string;
  onChange: (content: string, format: 'plain' | 'markdown' | 'html') => void;
  placeholder?: string;
  readOnly?: boolean;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your message...',
  readOnly = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value, 'markdown');
  };

  return (
    <EditorContainer>
      <StyledTextArea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={readOnly}
        aria-label='Message input'
      />
      <MarkdownHint>Supports Markdown: **bold**, *italic*, # headers, - lists, `code`</MarkdownHint>
    </EditorContainer>
  );
};

export default MarkdownEditor;
