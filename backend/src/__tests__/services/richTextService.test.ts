import { RichTextService } from '../../services/richTextService'

describe('RichTextService', () => {
  describe('markdownToHtml', () => {
    it('should convert markdown to sanitized HTML', () => {
      const markdown = '# Hello\n\n**Bold** and *italic* text'
      const html = RichTextService.markdownToHtml(markdown)
      expect(html).toContain('<h1>Hello</h1>')
      expect(html).toContain('<strong>Bold</strong>')
      expect(html).toContain('<em>italic</em>')
    })

    it('should sanitize malicious HTML in markdown', () => {
      const markdown = '[Click me](javascript:alert("xss"))'
      const html = RichTextService.markdownToHtml(markdown)
      expect(html).not.toContain('javascript:')
    })
  })

  describe('sanitizeHtml', () => {
    it('should remove disallowed tags and attributes', () => {
      const html = '<script>alert("xss")</script><p onclick="alert()">Hello</p>'
      const sanitized = RichTextService.sanitizeHtml(html)
      expect(sanitized).not.toContain('script')
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).toContain('<p>Hello</p>')
    })

    it('should allow permitted tags and attributes', () => {
      const html = '<a href="https://example.com" title="Link">Click</a>'
      const sanitized = RichTextService.sanitizeHtml(html)
      expect(sanitized).toBe(
        '<a href="https://example.com" title="Link" target="_blank" rel="noopener noreferrer">Click</a>',
      )
    })
  })

  describe('formatContent', () => {
    it('should handle plain text format', () => {
      const text = 'Hello\nWorld & <script>'
      const formatted = RichTextService.formatContent(text, 'plain')
      expect(formatted).toBe('Hello<br>World &amp; &lt;script&gt;')
    })

    it('should handle markdown format', () => {
      const text = '# Title\n\n**Bold**'
      const formatted = RichTextService.formatContent(text, 'markdown')
      expect(formatted).toContain('<h1>Title</h1>')
      expect(formatted).toContain('<strong>Bold</strong>')
    })

    it('should handle HTML format', () => {
      const text = '<p>Hello</p><script>alert("xss")</script>'
      const formatted = RichTextService.formatContent(text, 'html')
      expect(formatted).toBe('<p>Hello</p>')
    })
  })

  describe('extractPlainText', () => {
    it('should extract plain text from HTML', () => {
      const html = '<h1>Title</h1><p>Content with <strong>bold</strong></p>'
      const text = RichTextService.extractPlainText(html, 'html')
      expect(text).toBe('Title Content with bold')
    })

    it('should extract plain text from markdown', () => {
      const markdown = '# Title\n\n**Bold** text'
      const text = RichTextService.extractPlainText(markdown, 'markdown')
      expect(text).toBe('Title Bold text')
    })

    it('should return plain text as is', () => {
      const plainText = 'Simple text'
      const text = RichTextService.extractPlainText(plainText, 'plain')
      expect(text).toBe('Simple text')
    })
  })
})
