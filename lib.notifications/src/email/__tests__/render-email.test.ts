import { renderEmail, RenderEmailResult } from '../render-email';
import { welcomeEmailTemplate } from '../templates/welcome';

describe('Email Rendering', () => {
  describe('renderEmail', () => {
    it('renders valid MJML to HTML and plain text', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Hello World</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({ mjml });

      expect(result.html).toContain('Hello World');
      expect(result.text).toContain('Hello World');
    });

    it('returns both HTML and plain text versions', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Test Content</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result: RenderEmailResult = await renderEmail({ mjml });

      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(typeof result.html).toBe('string');
      expect(typeof result.text).toBe('string');
      expect(result.html.length).toBeGreaterThan(0);
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('replaces template variables with provided data', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Welcome {{firstName}}</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({
        mjml,
        data: { firstName: 'John' },
      });

      expect(result.html).toContain('Welcome John');
      expect(result.text).toContain('Welcome John');
    });

    it('handles multiple template variables', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{firstName}} {{lastName}}, welcome to {{appName}}</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({
        mjml,
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
          appName: 'Adopt Don\'t Shop',
        },
      });

      expect(result.html).toContain('Hello Jane Doe, welcome to Adopt Don\'t Shop');
      expect(result.text).toContain('Hello Jane Doe, welcome to Adopt Don\'t Shop');
    });

    it('preserves unmatched template variables when data not provided', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{firstName}}</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({ mjml });

      expect(result.html).toContain('{{firstName}}');
      expect(result.text).toContain('{{firstName}}');
    });

    it('handles whitespace in template variable names', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Welcome {{ firstName }}</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({
        mjml,
        data: { firstName: 'Alice' },
      });

      expect(result.html).toContain('Welcome Alice');
    });

    it('converts HTML to plain text by stripping tags', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text><b>Bold Text</b></mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({ mjml });

      expect(result.text).toContain('Bold Text');
      expect(result.text).not.toContain('<b>');
    });

    it('converts line breaks in plain text correctly', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Line 1</mj-text></mj-column></mj-section><mj-section><mj-column><mj-text>Line 2</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({ mjml });

      expect(result.text).toContain('Line 1');
      expect(result.text).toContain('Line 2');
    });

    it('renders welcome template with user data', async () => {
      const result = await renderEmail({
        mjml: welcomeEmailTemplate,
        data: {
          firstName: 'Sarah',
          year: 2024,
        },
      });

      expect(result.html).toContain('Welcome to Adopt Don\'t Shop');
      expect(result.html).toContain('Hi Sarah');
      expect(result.html).toContain('2024');
      expect(result.text).toContain('Welcome to Adopt Don\'t Shop');
      expect(result.text).toContain('Hi Sarah');
    });

    it('handles empty data object', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Test</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({ mjml, data: {} });

      expect(result.html).toBeTruthy();
      expect(result.text).toBeTruthy();
    });

    it('converts numeric data to strings in templates', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Year: {{year}}</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({
        mjml,
        data: { year: 2024 },
      });

      expect(result.html).toContain('Year: 2024');
      expect(result.text).toContain('Year: 2024');
    });

    it('handles boolean values in templates', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Active: {{isActive}}</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({
        mjml,
        data: { isActive: true },
      });

      expect(result.html).toContain('Active: true');
    });

    it('ignores undefined values and preserves original template variable', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Value: {{missing}}</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({
        mjml,
        data: { present: 'here', missing: undefined },
      });

      expect(result.html).toContain('Value: {{missing}}');
    });

    it('removes HTML entities from plain text output', async () => {
      const mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>Special chars: &lt; &gt; &amp;</mj-text></mj-column></mj-section></mj-body></mjml>';

      const result = await renderEmail({ mjml });

      expect(result.text).toContain('Special chars: < > &');
    });

    it('throws error for invalid MJML', async () => {
      const mjml = '<mjml><invalid-tag>Content</invalid-tag></mjml>';

      await expect(renderEmail({ mjml })).rejects.toThrow();
    });
  });
});
