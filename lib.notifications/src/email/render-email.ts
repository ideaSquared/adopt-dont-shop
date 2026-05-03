import mjml2html from 'mjml';

export type EmailTemplateData = Record<string, string | number | boolean | undefined>;

export type RenderEmailOptions = {
  mjml: string;
  data?: EmailTemplateData;
};

export type RenderEmailResult = {
  html: string;
  text: string;
};

export const renderEmail = async (options: RenderEmailOptions): Promise<RenderEmailResult> => {
  const { mjml, data = {} } = options;

  const processedMjml = processTemplateVariables(mjml, data);

  let result;
  try {
    result = await mjml2html(processedMjml);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown MJML error';
    throw new Error(`MJML rendering failed: ${message}`);
  }

  if (!result || result.errors.length > 0) {
    const errorMessages = result.errors.map((e: { message: string }) => e.message).join(', ');
    throw new Error(`MJML rendering failed: ${errorMessages}`);
  }

  const html = result.html;
  const text = generatePlainText(html);

  return { html, text };
};

const processTemplateVariables = (template: string, data: EmailTemplateData): string => {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = data[key.trim()];
    return value !== undefined ? String(value) : match;
  });
};

const generatePlainText = (html: string): string => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
