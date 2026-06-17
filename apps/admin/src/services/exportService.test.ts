import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUnparse = vi.fn();
vi.mock('papaparse', () => ({
  default: { unparse: (...args: unknown[]) => mockUnparse(...args) },
}));

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

import { exportToCSV, exportToPDF, exportData, type ExportColumn } from './exportService';

type Row = { name: string; age: number | null; nickname?: string };

const columns: ExportColumn<Row>[] = [
  { header: 'Name', accessor: 'name' },
  { header: 'Age', accessor: 'age' },
  { header: 'Nick', accessor: row => row.nickname },
];

const rows: Row[] = [
  { name: 'Rex', age: 3, nickname: 'Rexy' },
  { name: 'Mittens', age: null },
];

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  mockUnparse.mockReturnValue('csv-output');
});

describe('exportToCSV', () => {
  it('flattens rows using column accessors and triggers a download', () => {
    const clickSpy = vi.fn();
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const createObjectURL = vi.fn(() => 'blob:url');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = createElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    exportToCSV(rows, columns, 'pets');

    expect(mockUnparse).toHaveBeenCalledWith(
      [
        { Name: 'Rex', Age: '3', Nick: 'Rexy' },
        { Name: 'Mittens', Age: '', Nick: '' },
      ],
      { header: true }
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });
});

describe('exportToPDF', () => {
  it('writes a titled table and saves a pdf file', () => {
    exportToPDF(rows, columns, 'pets', 'Pets Report');

    expect(mockText).toHaveBeenCalledWith('Pets Report', 14, 18);
    expect(mockText).toHaveBeenCalledWith('Total records: 2', 14, 32);
    expect(mockAutoTable).toHaveBeenCalledOnce();
    const tableArg = mockAutoTable.mock.calls[0][1] as {
      head: string[][];
      body: string[][];
    };
    expect(tableArg.head).toEqual([['Name', 'Age', 'Nick']]);
    expect(tableArg.body).toEqual([
      ['Rex', '3', 'Rexy'],
      ['Mittens', '', ''],
    ]);
    expect(mockSave).toHaveBeenCalledWith('pets.pdf');
  });
});

describe('exportData', () => {
  it('delegates to CSV export for the csv format', () => {
    exportData(rows, columns, 'pets', 'Pets Report', 'csv');

    expect(mockUnparse).toHaveBeenCalledOnce();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('delegates to PDF export for the pdf format', () => {
    exportData(rows, columns, 'pets', 'Pets Report', 'pdf');

    expect(mockSave).toHaveBeenCalledWith('pets.pdf');
    expect(mockUnparse).not.toHaveBeenCalled();
  });
});
