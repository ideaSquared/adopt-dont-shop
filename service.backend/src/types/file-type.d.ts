declare module 'file-type' {
  export type FileTypeResult = { mime: string; ext: string };
  export function fileTypeFromFile(path: string): Promise<FileTypeResult | undefined>;
}
