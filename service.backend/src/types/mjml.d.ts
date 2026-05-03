declare module 'mjml' {
  type MjmlError = {
    message: string;
    tagName: string;
    severity: string;
    line: number;
  };

  type MjmlResult = {
    html: string;
    errors: MjmlError[];
  };

  type MjmlOptions = {
    fonts?: Record<string, string>;
    keepComments?: boolean;
    beautify?: boolean;
    minify?: boolean;
    validationLevel?: 'strict' | 'soft' | 'skip';
    filePath?: string;
  };

  function mjml2html(input: string, options?: MjmlOptions): Promise<MjmlResult>;
  export default mjml2html;
}
