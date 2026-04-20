import { RichTextProcessingService } from '../../services/rich-text-processing.service';

describe('RichTextProcessingService.sanitize', () => {
  describe('XSS prevention', () => {
    it('strips script tags and their content', () => {
      const result = RichTextProcessingService.sanitize(
        '<p>Hello</p><script>alert("xss")</script>'
      );
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
    });

    it('strips inline event handler attributes', () => {
      const result = RichTextProcessingService.sanitize('<p onclick="alert(1)">Click me</p>');
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('strips onerror attributes from image tags', () => {
      const result = RichTextProcessingService.sanitize('<img src="x" onerror="alert(1)">');
      expect(result).not.toContain('onerror');
    });

    it('strips onload attributes', () => {
      const result = RichTextProcessingService.sanitize('<body onload="alert(1)">text</body>');
      expect(result).not.toContain('onload');
    });

    it('strips javascript: protocol from anchor hrefs', () => {
      const result = RichTextProcessingService.sanitize(
        '<a href="javascript:alert(1)">click</a>'
      );
      expect(result).not.toContain('javascript:');
    });

    it('strips object and embed tags', () => {
      const result = RichTextProcessingService.sanitize(
        '<object data="evil.swf"></object><embed src="evil.swf">'
      );
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
    });

    it('strips form and input elements', () => {
      const result = RichTextProcessingService.sanitize(
        '<form action="/steal"><input type="text" name="data"></form>'
      );
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
    });
  });

  describe('safe content preservation', () => {
    it('preserves paragraph and text formatting tags', () => {
      const safeHtml = '<p>Hello <strong>world</strong> and <em>everyone</em></p>';
      const result = RichTextProcessingService.sanitize(safeHtml);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('world');
    });

    it('preserves heading tags', () => {
      const result = RichTextProcessingService.sanitize('<h2>Section title</h2>');
      expect(result).toContain('<h2>');
      expect(result).toContain('Section title');
    });

    it('preserves list elements', () => {
      const result = RichTextProcessingService.sanitize('<ul><li>Item one</li><li>Item two</li></ul>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
      expect(result).toContain('Item one');
    });

    it('preserves safe anchor tags with http hrefs', () => {
      const result = RichTextProcessingService.sanitize(
        '<a href="https://example.com">Visit us</a>'
      );
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Visit us');
    });

    it('returns plain text unchanged', () => {
      const plainText = 'Just plain text with no HTML';
      const result = RichTextProcessingService.sanitize(plainText);
      expect(result).toBe(plainText);
    });

    it('returns empty string for empty input', () => {
      const result = RichTextProcessingService.sanitize('');
      expect(result).toBe('');
    });
  });
});
