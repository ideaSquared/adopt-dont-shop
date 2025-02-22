import React from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import styled from 'styled-components'

const EditorContainer = styled.div`
  .quill {
    height: 150px;
    background-color: white;
    border-radius: 4px;
    border: 1px solid #ccc;

    .ql-toolbar {
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      border-bottom: 1px solid #ccc;
      background-color: #f8f9fa;
    }

    .ql-container {
      height: calc(150px - 42px);
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      font-size: 16px;

      .ql-editor {
        height: 100%;

        &.ql-blank::before {
          font-style: normal;
          color: #6c757d;
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

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
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
