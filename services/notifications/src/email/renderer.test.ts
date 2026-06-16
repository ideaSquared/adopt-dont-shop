import { describe, expect, it } from 'vitest';

import { renderEmailTemplate, renderHtmlTemplate, renderTemplate } from './renderer.js';

describe('renderTemplate (plain text)', () => {
  it('substitutes {{var}} with the raw value, leaving text un-escaped', () => {
    const out = renderTemplate('Hi {{name}}', { name: '<b>Ada</b> & co' });
    // Text context: nothing to break out of, so no escaping.
    expect(out).toBe('Hi <b>Ada</b> & co');
  });

  it('leaves unmatched placeholders intact so typos are visible', () => {
    expect(renderTemplate('Hi {{missing}}', {})).toBe('Hi {{missing}}');
  });

  it('resolves dotted paths', () => {
    expect(renderTemplate('{{user.firstName}}', { user: { firstName: 'Ada' } })).toBe('Ada');
  });
});

describe('renderHtmlTemplate (HTML context)', () => {
  it('HTML-escapes a script injection so it renders inert', () => {
    const out = renderHtmlTemplate('<p>Hi {{name}}</p>', {
      name: '<script>alert(1)</script>',
    });
    expect(out).toBe('<p>Hi &lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(out).not.toContain('<script>');
  });

  it('escapes quotes so a value cannot break out of an HTML attribute', () => {
    const out = renderHtmlTemplate('<a title="{{name}}">x</a>', {
      name: '" onmouseover="alert(1)',
    });
    expect(out).toBe('<a title="&quot; onmouseover=&quot;alert(1)">x</a>');
    expect(out).not.toContain('onmouseover="alert');
  });

  it('escapes ampersands without double-encoding the surrounding template', () => {
    const out = renderHtmlTemplate('<p>{{name}} &amp; friends</p>', { name: 'A & B' });
    // The value's `&` is escaped; the template's own `&amp;` is untouched.
    expect(out).toBe('<p>A &amp; B &amp; friends</p>');
  });

  it('passes {{{var}}} through raw for pre-sanitised HTML', () => {
    const out = renderHtmlTemplate('<p>{{{link}}}</p>', {
      link: '<a href="https://example.com">Reset</a>',
    });
    expect(out).toBe('<p><a href="https://example.com">Reset</a></p>');
  });

  it('escapes a {{var}} even when a {{{raw}}} placeholder is also present', () => {
    const out = renderHtmlTemplate('{{{safe}}} {{unsafe}}', {
      safe: '<b>ok</b>',
      unsafe: '<b>bad</b>',
    });
    expect(out).toBe('<b>ok</b> &lt;b&gt;bad&lt;/b&gt;');
  });

  it('leaves unmatched placeholders intact', () => {
    expect(renderHtmlTemplate('Hi {{missing}}', {})).toBe('Hi {{missing}}');
    expect(renderHtmlTemplate('Hi {{{missing}}}', {})).toBe('Hi {{{missing}}}');
  });
});

describe('renderEmailTemplate', () => {
  it('escapes htmlContent and the subject, but keeps textContent literal', () => {
    const rendered = renderEmailTemplate(
      {
        subject: 'Welcome {{name}}',
        htmlContent: '<h1>Welcome {{name}}</h1>',
        textContent: 'Welcome {{name}}',
      },
      { name: '<script>x</script>' }
    );

    expect(rendered.subject).toBe('Welcome &lt;script&gt;x&lt;/script&gt;');
    expect(rendered.htmlContent).toBe('<h1>Welcome &lt;script&gt;x&lt;/script&gt;</h1>');
    // Text body is not double-encoded.
    expect(rendered.textContent).toBe('Welcome <script>x</script>');
  });

  it('renders a null textContent as null', () => {
    const rendered = renderEmailTemplate(
      { subject: 'Hi', htmlContent: '<p>Hi</p>', textContent: null },
      {}
    );
    expect(rendered.textContent).toBeNull();
  });

  // Render-all-templates snapshot — guards against accidental
  // double-escaping of HTML that legitimately belongs in a template body.
  // The literal markup, entities, and {{{raw}}} passthrough must survive
  // verbatim; only the {{var}} interpolations are escaped.
  it('renders representative templates without corrupting intended HTML (snapshot)', () => {
    const variables = {
      firstName: 'Ada',
      rescueName: 'Happy Tails',
      petName: 'Rex',
      reason: 'We found a closer match <see notes>',
      resetLink: '<a href="https://example.com/reset?t=abc">Reset your password</a>',
    };

    const templates = [
      {
        name: 'application-approved',
        subject: 'Your application for {{petName}} was approved',
        htmlContent:
          '<h1>Great news, {{firstName}}!</h1>' +
          '<p>{{rescueName}} approved your application for <strong>{{petName}}</strong>.</p>' +
          '<hr />',
        textContent: 'Great news, {{firstName}}! {{rescueName}} approved {{petName}}.',
      },
      {
        name: 'application-rejected',
        subject: 'Update on your application',
        htmlContent: '<p>Hi {{firstName}},</p><p>Reason: {{reason}}</p>',
        textContent: 'Hi {{firstName}}, Reason: {{reason}}',
      },
      {
        name: 'password-reset',
        subject: 'Reset your password',
        // {{{resetLink}}} is server-built and pre-sanitised — passes through raw.
        htmlContent: '<p>Hello {{firstName}} &mdash; click below:</p><p>{{{resetLink}}}</p>',
        textContent: 'Hello {{firstName}}, reset your password.',
      },
    ];

    const rendered = templates.map(t => ({ name: t.name, ...renderEmailTemplate(t, variables) }));
    expect(rendered).toMatchInlineSnapshot(`
      [
        {
          "htmlContent": "<h1>Great news, Ada!</h1><p>Happy Tails approved your application for <strong>Rex</strong>.</p><hr />",
          "name": "application-approved",
          "subject": "Your application for Rex was approved",
          "textContent": "Great news, Ada! Happy Tails approved Rex.",
        },
        {
          "htmlContent": "<p>Hi Ada,</p><p>Reason: We found a closer match &lt;see notes&gt;</p>",
          "name": "application-rejected",
          "subject": "Update on your application",
          "textContent": "Hi Ada, Reason: We found a closer match <see notes>",
        },
        {
          "htmlContent": "<p>Hello Ada &mdash; click below:</p><p><a href="https://example.com/reset?t=abc">Reset your password</a></p>",
          "name": "password-reset",
          "subject": "Reset your password",
          "textContent": "Hello Ada, reset your password.",
        },
      ]
    `);
  });
});
