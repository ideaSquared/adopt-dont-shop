import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

// Configure marked options
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert line breaks to <br>
})

// Configure sanitize-html options
const sanitizeOptions = {
  allowedTags: [
    'p',
    'br',
    'b',
    'i',
    'em',
    'strong',
    'a',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'img',
    'span',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    span: ['class'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName: string, attribs: any) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  },
}

export class RichTextService {
  /**
   * Convert markdown to sanitized HTML
   */
  static markdownToHtml(markdown: string): string {
    const html = marked(markdown)
    return sanitizeHtml(html, sanitizeOptions)
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html: string): string {
    return sanitizeHtml(html, sanitizeOptions)
  }

  /**
   * Format message content based on the specified format
   */
  static formatContent(
    content: string,
    format: 'plain' | 'markdown' | 'html',
  ): string {
    switch (format) {
      case 'markdown':
        return this.markdownToHtml(content)
      case 'html':
        return this.sanitizeHtml(content)
      case 'plain':
      default:
        return content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\n/g, '<br>')
    }
  }

  /**
   * Extract plain text from formatted content (for search indexing)
   */
  static extractPlainText(
    content: string,
    format: 'plain' | 'markdown' | 'html',
  ): string {
    let text = content
    if (format === 'markdown') {
      text = marked(content)
    }
    if (format === 'markdown' || format === 'html') {
      // Add spaces between block-level elements before sanitizing
      text = text.replace(/<\/(h[1-6]|p|div|li)>/gi, '$& ')
      text = sanitizeHtml(text, {
        allowedTags: [],
        allowedAttributes: {},
      })
    }
    // Normalize spaces and trim
    return text.replace(/\s+/g, ' ').trim()
  }
}
