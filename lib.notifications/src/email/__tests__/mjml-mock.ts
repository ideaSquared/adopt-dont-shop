const mjml2html = async (mjml: string) => {
  if (mjml.includes('<invalid-tag>')) {
    return {
      html: '',
      errors: [{ message: 'Malformed MJML' }],
      json: {},
    };
  }

  const textMatches = mjml.match(/<mj-text[^>]*>([\s\S]*?)<\/mj-text>/g) || [];
  const texts = textMatches.map(match => {
    const content = match.replace(/<mj-text[^>]*>/, '').replace(/<\/mj-text>/, '');
    return content.trim();
  });

  const htmlContent = texts.join('<br>');
  const html = `<!DOCTYPE html><html><body>${htmlContent}</body></html>`;

  return {
    html,
    errors: [],
    json: {},
  };
};

export default mjml2html;
