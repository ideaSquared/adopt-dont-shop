import PDFDocument from 'pdfkit';
import Papa from 'papaparse';
import type { ExecutedReport } from './reports.service';
import type { SavedReport } from '../models';

/**
 * ADS-105: Renderers for scheduled-report delivery.
 *
 * Both renderers are intentionally minimal — they produce a "good
 * enough" textual digest of the executed report. The frontend's
 * <ReportRenderer> shows the full visualization; an emailed PDF/CSV
 * is a snapshot, not an interactive document.
 *
 * For widget data we only render rows when the data shape is one of:
 *   - an array of records (table-shaped)            → tabulated
 *   - an object with numeric values (metric-card-y) → key/value list
 *   - anything else                                 → JSON dump
 *
 * Both renderers return a Buffer ready to attach to an email.
 */

type WidgetTitle = { id: string; title: string; chartType: string };

const titlesFromReport = (report: SavedReport): WidgetTitle[] => {
  const config = report.config as { widgets?: Array<{ id: string; title: string; chartType: string }> };
  return (config.widgets ?? []).map(w => ({ id: w.id, title: w.title, chartType: w.chartType }));
};

const isRecordArray = (v: unknown): v is Array<Record<string, unknown>> =>
  Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null;

export const ReportRenderer = {
  renderCsv(report: SavedReport, executed: ExecutedReport): Buffer {
    const titles = titlesFromReport(report);
    const sections: string[] = [];
    sections.push(`Report: ${report.name}`);
    sections.push(`Computed at: ${executed.computedAt}`);
    sections.push('');
    for (const widget of executed.widgets) {
      const title = titles.find(t => t.id === widget.id)?.title ?? widget.id;
      sections.push(`# ${title}`);
      const data = widget.data;
      if (isRecordArray(data)) {
        sections.push(Papa.unparse(data as Record<string, unknown>[]));
      } else if (data && typeof data === 'object') {
        const rows = Object.entries(data as Record<string, unknown>).map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
        }));
        sections.push(Papa.unparse(rows));
      } else {
        sections.push(`value,${String(data ?? '')}`);
      }
      sections.push('');
    }
    return Buffer.from(sections.join('\n'), 'utf-8');
  },

  async renderPdf(report: SavedReport, executed: ExecutedReport): Promise<Buffer> {
    const titles = titlesFromReport(report);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(report.name, { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#666').text(`Computed at: ${executed.computedAt}`);
      doc.fillColor('#000');
      doc.moveDown(0.6);

      for (const widget of executed.widgets) {
        const title = titles.find(t => t.id === widget.id)?.title ?? widget.id;
        doc.fontSize(14).text(title);
        doc.moveDown(0.2);
        const data = widget.data;
        doc.fontSize(10);
        if (isRecordArray(data)) {
          const rows = data as Record<string, unknown>[];
          const headers = Object.keys(rows[0]);
          doc.text(headers.join(' | '), { continued: false });
          for (const row of rows.slice(0, 50)) {
            doc.text(headers.map(h => String(row[h] ?? '')).join(' | '));
          }
          if (rows.length > 50) {
            doc.fillColor('#888').text(`...and ${rows.length - 50} more rows`).fillColor('#000');
          }
        } else if (data && typeof data === 'object') {
          for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            doc.text(
              `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}`
            );
          }
        } else {
          doc.text(String(data ?? ''));
        }
        doc.moveDown(0.8);
      }

      doc.end();
    });
  },

  renderInlineHtml(report: SavedReport, executed: ExecutedReport): string {
    const titles = titlesFromReport(report);
    const widgetHtml = executed.widgets
      .map(widget => {
        const title = titles.find(t => t.id === widget.id)?.title ?? widget.id;
        const data = widget.data;
        let body = '';
        if (isRecordArray(data)) {
          const rows = data as Record<string, unknown>[];
          const headers = Object.keys(rows[0]);
          body = `<table style="border-collapse:collapse;width:100%"><thead><tr>${headers
            .map(h => `<th style="text-align:left;border-bottom:1px solid #ccc;padding:4px">${h}</th>`)
            .join('')}</tr></thead><tbody>${rows
            .slice(0, 50)
            .map(
              row =>
                `<tr>${headers
                  .map(h => `<td style="padding:4px;border-bottom:1px solid #eee">${String(row[h] ?? '')}</td>`)
                  .join('')}</tr>`
            )
            .join('')}</tbody></table>`;
        } else if (data && typeof data === 'object') {
          body = `<dl>${Object.entries(data as Record<string, unknown>)
            .map(
              ([k, v]) =>
                `<dt style="font-weight:bold">${k}</dt><dd>${
                  typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')
                }</dd>`
            )
            .join('')}</dl>`;
        } else {
          body = `<p>${String(data ?? '')}</p>`;
        }
        return `<section style="margin-bottom:24px"><h3>${title}</h3>${body}</section>`;
      })
      .join('');
    return `<!doctype html><html><body style="font-family:system-ui,sans-serif"><h1>${report.name}</h1><p style="color:#666">Computed at: ${executed.computedAt}</p>${widgetHtml}</body></html>`;
  },
};
