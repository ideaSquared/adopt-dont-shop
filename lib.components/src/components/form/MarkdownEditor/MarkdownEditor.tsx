import React from 'react';

import * as styles from './MarkdownEditor.css';

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
    <div className={styles.editorContainer}>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={readOnly}
        aria-label='Message input'
      />
      <div className={styles.markdownHint}>Supports Markdown: **bold**, *italic*, # headers, - lists, `code`</div>
    </div>
  );
};

export default MarkdownEditor;
