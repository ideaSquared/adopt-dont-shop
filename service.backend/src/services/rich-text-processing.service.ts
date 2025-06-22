import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { logger } from '../utils/logger';

export interface RichTextOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
  stripHtml?: boolean;
  convertLinks?: boolean;
  allowImages?: boolean;
  allowVideos?: boolean;
}

export interface ProcessedContent {
  html: string;
  plainText: string;
  markdown: string;
  wordCount: number;
  hasLinks: boolean;
  hasImages: boolean;
  hasVideos: boolean;
  links: string[];
  images: string[];
  videos: string[];
}

export interface ContentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  processedContent?: ProcessedContent;
}

export class RichTextProcessingService {
  // Default configuration
  private static readonly DEFAULT_OPTIONS: RichTextOptions = {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'a',
      'img',
      'video',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      video: ['src', 'controls', 'width', 'height'],
      table: ['class'],
      th: ['scope'],
      td: ['colspan', 'rowspan'],
    },
    maxLength: 10000,
    stripHtml: false,
    convertLinks: true,
    allowImages: true,
    allowVideos: false,
  };

  /**
   * Process markdown content to HTML with sanitization
   */
  static async processMarkdown(
    markdown: string,
    options: RichTextOptions = {}
  ): Promise<ProcessedContent> {
    try {
      const opts = { ...this.DEFAULT_OPTIONS, ...options };

      // Validate input length
      if (markdown.length > (opts.maxLength || 10000)) {
        throw new Error(`Content exceeds maximum length of ${opts.maxLength} characters`);
      }

      // Configure marked options
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      // Convert markdown to HTML
      let html = marked(markdown) as string;

      // Sanitize HTML
      html = this.sanitizeHtml(html, opts);

      // Extract content information
      const contentInfo = this.extractContentInfo(html);

      // Generate plain text version
      const plainText = this.htmlToPlainText(html);

      return {
        html,
        plainText,
        markdown,
        wordCount: this.countWords(plainText),
        hasLinks: contentInfo.links.length > 0,
        hasImages: contentInfo.images.length > 0,
        hasVideos: contentInfo.videos.length > 0,
        links: contentInfo.links,
        images: contentInfo.images,
        videos: contentInfo.videos,
      };
    } catch (error) {
      logger.error('Error processing markdown:', error);
      throw new Error(
        `Failed to process markdown: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process HTML content with sanitization
   */
  static async processHtml(html: string, options: RichTextOptions = {}): Promise<ProcessedContent> {
    try {
      const opts = { ...this.DEFAULT_OPTIONS, ...options };

      // Validate input length
      if (html.length > (opts.maxLength || 10000)) {
        throw new Error(`Content exceeds maximum length of ${opts.maxLength} characters`);
      }

      // Sanitize HTML
      const sanitizedHtml = this.sanitizeHtml(html, opts);

      // Extract content information
      const contentInfo = this.extractContentInfo(sanitizedHtml);

      // Generate plain text version
      const plainText = this.htmlToPlainText(sanitizedHtml);

      // Convert back to markdown (approximate)
      const markdown = this.htmlToMarkdown(sanitizedHtml);

      return {
        html: sanitizedHtml,
        plainText,
        markdown,
        wordCount: this.countWords(plainText),
        hasLinks: contentInfo.links.length > 0,
        hasImages: contentInfo.images.length > 0,
        hasVideos: contentInfo.videos.length > 0,
        links: contentInfo.links,
        images: contentInfo.images,
        videos: contentInfo.videos,
      };
    } catch (error) {
      logger.error('Error processing HTML:', error);
      throw new Error(
        `Failed to process HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate and process content
   */
  static async validateAndProcess(
    content: string,
    contentType: 'markdown' | 'html' | 'plain',
    options: RichTextOptions = {}
  ): Promise<ContentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!content || content.trim().length === 0) {
        errors.push('Content cannot be empty');
      }

      if (content.length > (options.maxLength || this.DEFAULT_OPTIONS.maxLength!)) {
        errors.push(
          `Content exceeds maximum length of ${options.maxLength || this.DEFAULT_OPTIONS.maxLength} characters`
        );
      }

      // Check for potentially malicious content
      if (this.containsSuspiciousContent(content)) {
        warnings.push('Content contains potentially suspicious elements');
      }

      // Process content based on type
      let processedContent: ProcessedContent;

      switch (contentType) {
        case 'markdown':
          processedContent = await this.processMarkdown(content, options);
          break;
        case 'html':
          processedContent = await this.processHtml(content, options);
          break;
        case 'plain':
          processedContent = await this.processPlainText(content, options);
          break;
        default:
          errors.push('Invalid content type specified');
          return { isValid: false, errors, warnings };
      }

      // Additional validation on processed content
      if (processedContent.links.length > 10) {
        warnings.push('Content contains many links, which may be flagged as spam');
      }

      if (processedContent.images.length > 20) {
        warnings.push('Content contains many images, which may affect performance');
      }

      // Validate links
      for (const link of processedContent.links) {
        if (!this.isValidUrl(link)) {
          errors.push(`Invalid URL detected: ${link}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        processedContent,
      };
    } catch (error) {
      logger.error('Error validating content:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Sanitize HTML content
   */
  private static sanitizeHtml(html: string, options: RichTextOptions): string {
    const allowedTags = options.allowedTags || this.DEFAULT_OPTIONS.allowedTags || [];
    const forbiddenTags = ['script', 'object', 'embed', 'form', 'input', 'button'];

    // Remove images if not allowed
    if (!options.allowImages) {
      forbiddenTags.push('img');
    }

    // Remove videos if not allowed
    if (!options.allowVideos) {
      forbiddenTags.push('video', 'audio', 'source');
    }

    const config = {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: [
        'href',
        'src',
        'alt',
        'title',
        'width',
        'height',
        'controls',
        'target',
        'class',
        'scope',
        'colspan',
        'rowspan',
      ],
      ALLOW_DATA_ATTR: false,
      FORBID_SCRIPT: true,
      FORBID_TAGS: forbiddenTags,
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    };

    return DOMPurify.sanitize(html, config);
  }

  /**
   * Extract content information (links, images, videos)
   */
  private static extractContentInfo(html: string): {
    links: string[];
    images: string[];
    videos: string[];
  } {
    const links: string[] = [];
    const images: string[] = [];
    const videos: string[] = [];

    // Simple regex-based extraction (in production, use a proper HTML parser)
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;

    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      links.push(match[1]);
    }

    while ((match = imageRegex.exec(html)) !== null) {
      images.push(match[1]);
    }

    while ((match = videoRegex.exec(html)) !== null) {
      videos.push(match[1]);
    }

    return { links, images, videos };
  }

  /**
   * Convert HTML to plain text
   */
  private static htmlToPlainText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Convert HTML to markdown (basic conversion)
   */
  private static htmlToMarkdown(html: string): string {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Process plain text content
   */
  private static async processPlainText(
    text: string,
    options: RichTextOptions = {}
  ): Promise<ProcessedContent> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Auto-link URLs if enabled
    let processedText = text;
    const links: string[] = [];

    if (opts.convertLinks) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const foundUrls = text.match(urlRegex) || [];
      links.push(...foundUrls);

      processedText = text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    }

    // Convert line breaks to HTML
    const html = processedText.replace(/\n/g, '<br>');

    return {
      html,
      plainText: text,
      markdown: text,
      wordCount: this.countWords(text),
      hasLinks: links.length > 0,
      hasImages: false,
      hasVideos: false,
      links,
      images: [],
      videos: [],
    };
  }

  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * Check for suspicious content
   */
  private static containsSuspiciousContent(content: string): boolean {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /<script/i,
      /on\w+\s*=/i, // Event handlers
      /expression\s*\(/i, // CSS expressions
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Get content preview (truncated version)
   */
  static getContentPreview(content: string, maxLength: number = 200): string {
    const plainText = this.htmlToPlainText(content);

    if (plainText.length <= maxLength) {
      return plainText;
    }

    // Find the last complete word within the limit
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  /**
   * Extract hashtags from content
   */
  static extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;

    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(match[1].toLowerCase());
    }

    return [...new Set(hashtags)]; // Remove duplicates
  }

  /**
   * Extract mentions from content
   */
  static extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1].toLowerCase());
    }

    return [...new Set(mentions)]; // Remove duplicates
  }
}
