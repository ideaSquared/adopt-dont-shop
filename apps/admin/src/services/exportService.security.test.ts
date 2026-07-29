import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSave = vi.fn();
const mockJsPdf = vi.fn();
vi.mock('jspdf', () => ({
  default: function JsPdfCtor(this: Record<string, unknown>, ...args: unknown[]) {
    mockJsPdf(...args);
    this.setFontSize = mockSetFontSize;
    this.text = mockText;
    this.save = mockSave;
  },
}));

const mockAutoTable = vi.fn();
vi.mock('jspdf-autotable', () => ({
  default: (...args: unknown[]) => mockAutoTable(...args),
}));

import { exportToCSV, exportData, type ExportColumn } from './exportService';

type Row = { name: string };

const columns: ExportColumn<Row>[] = [{ header: 'Name', accessor: 'name' }];

let capturedBlob: Blob | null = null;
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  capturedBlob = null;

  const createObjectURL = vi.fn((blob: Blob) => {
    capturedBlob = blob;
    return 'blob:url';
  });
  const revokeObjectURL = vi.fn();
  Object.assign(URL, { createObjectURL, revokeObjectURL });

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = originalCreateElement(tag);
    if (tag === 'a') {
      (el as HTMLAnchorElement).click = vi.fn();
    }
    return el;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const unwrapCsvField = (field: string): string =>
  field.startsWith('"') && field.endsWith('"') ? field.slice(1, -1) : field;

describe('exportToCSV formula injection protection', () => {
  it.each(['=', '+', '-', '@'])(
    'neutralises cells whose value begins with "%s"',
    async dangerousChar => {
      const rows: Row[] = [{ name: `${dangerousChar}cmd|'/c calc'!A0` }];

      exportToCSV(rows, columns, 'export');

      const csvText = await capturedBlob!.text();
      const dataLine = csvText.trim().split(/\r?\n/)[1];
      expect(unwrapCsvField(dataLine).startsWith("'")).toBe(true);
    }
  );

  it('covers the rescues export path via exportData', async () => {
    const rows: Row[] = [{ name: '=HYPERLINK("http://evil.example/steal","Click")' }];

    exportData(rows, columns, 'rescues', 'Rescues', 'csv');

    const csvText = await capturedBlob!.text();
    const dataLine = csvText.trim().split(/\r?\n/)[1];
    expect(unwrapCsvField(dataLine).startsWith("'=HYPERLINK")).toBe(true);
  });
});
