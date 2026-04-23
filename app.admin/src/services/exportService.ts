import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportColumn<T> = {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
};

export type ExportFormat = 'csv' | 'pdf';

const getCellValue = <T>(row: T, accessor: ExportColumn<T>['accessor']): string => {
  const raw = typeof accessor === 'function' ? accessor(row) : row[accessor];
  if (raw === null || raw === undefined) {
    return '';
  }
  return String(raw);
};

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const exportToCSV = <T>(data: T[], columns: ExportColumn<T>[], filename: string): void => {
  const rows = data.map(row =>
    columns.reduce<Record<string, string>>((acc, col) => {
      acc[col.header] = getCellValue(row, col.accessor);
      return acc;
    }, {})
  );

  const csv = Papa.unparse(rows, { header: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
};

export const exportToPDF = <T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string
): void => {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
  doc.text(`Total records: ${data.length}`, 14, 32);

  const headers = columns.map(c => c.header);
  const body = data.map(row => columns.map(col => getCellValue(row, col.accessor)));

  autoTable(doc, {
    head: [headers],
    body,
    startY: 38,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${filename}.pdf`);
};

export const exportData = <T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string,
  format: ExportFormat
): void => {
  if (format === 'csv') {
    exportToCSV(data, columns, filename);
  } else {
    exportToPDF(data, columns, filename, title);
  }
};
