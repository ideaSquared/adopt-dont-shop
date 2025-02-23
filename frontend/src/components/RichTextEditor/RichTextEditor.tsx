import React from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import styled from 'styled-components'

const EditorContainer = styled.div`
  flex: 1;
  min-width: 0; /* Prevents flex item from overflowing */

  .quill {
    height: 150px;
    width: 100%;
    background-color: ${(props) => props.theme.background.body};
    border-radius: ${(props) => props.theme.border.radius.md};
    border: ${(props) => props.theme.border.width.thin} solid
      ${(props) => props.theme.border.color.default};

    .ql-toolbar {
      border-top-left-radius: ${(props) => props.theme.border.radius.md};
      border-top-right-radius: ${(props) => props.theme.border.radius.md};
      border-bottom: ${(props) => props.theme.border.width.thin} solid
        ${(props) => props.theme.border.color.default};
      background-color: ${(props) => props.theme.background.contrast};
    }

    .ql-container {
      height: calc(150px - 42px);
      border-bottom-left-radius: ${(props) => props.theme.border.radius.md};
      border-bottom-right-radius: ${(props) => props.theme.border.radius.md};
      font-size: ${(props) => props.theme.typography.size.sm};

      .ql-editor {
        height: 100%;

        &.ql-blank::before {
          font-style: normal;
          color: ${(props) => props.theme.text.dim};
        }
      }
    }
  }
`

const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'code-block'],
    ['clean'],
  ],
}

const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'link',
  'code-block',
]

type RichTextEditorProps = {
  value: string
  onChange: (content: string, format: 'plain' | 'markdown' | 'html') => void
  placeholder?: string
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your message...',
}) => {
  const handleChange = (content: string) => {
    onChange(content, 'html')
  }

  return (
    <EditorContainer>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </EditorContainer>
  )
}

export default RichTextEditor
