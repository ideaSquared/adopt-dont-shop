import {
  reportConfigSchema,
  reportFiltersSchema,
  reportWidgetSchema,
  savedReportSchema,
  scheduledReportSchema,
  executedReportSchema,
  type ReportConfig,
} from './reports';

const lineWidget = {
  id: '634d3ff9-634a-40e8-8ef5-efd55e37d4b1',
  title: 'Adoptions',
  position: { x: 0, y: 0, w: 6, h: 4 },
  metric: 'adoption',
  chartType: 'line',
  options: {
    xKey: 'date',
    series: [{ key: 'count', label: 'Count' }],
  },
};

const baseConfig: ReportConfig = {
  filters: { groupBy: 'day' },
  layout: { columns: 2 },
  widgets: [lineWidget],
};

describe('reportFiltersSchema', () => {
  it('coerces ISO date strings into Date instances', () => {
    const parsed = reportFiltersSchema.parse({
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T00:00:00.000Z',
      groupBy: 'week',
    });

    expect(parsed.startDate).toBeInstanceOf(Date);
    expect(parsed.groupBy).toBe('week');
  });

  it('rejects a non-uuid rescueId', () => {
    expect(() => reportFiltersSchema.parse({ rescueId: 'nope' })).toThrow();
  });

  it('rejects an unknown groupBy value', () => {
    expect(() => reportFiltersSchema.parse({ groupBy: 'year' })).toThrow();
  });
});

describe('reportWidgetSchema', () => {
  it('accepts a valid line widget', () => {
    expect(() => reportWidgetSchema.parse(lineWidget)).not.toThrow();
  });

  it('discriminates on chartType — a pie widget needs labelKey/valueKey, not series', () => {
    const pie = {
      ...lineWidget,
      chartType: 'pie',
      options: { labelKey: 'breed', valueKey: 'count' },
    };
    expect(() => reportWidgetSchema.parse(pie)).not.toThrow();
  });

  it('rejects a line widget whose series array is empty', () => {
    const invalid = { ...lineWidget, options: { xKey: 'date', series: [] } };
    expect(() => reportWidgetSchema.parse(invalid)).toThrow();
  });

  it('rejects a widget position with width above the 12-column max', () => {
    const invalid = { ...lineWidget, position: { x: 0, y: 0, w: 13, h: 4 } };
    expect(() => reportWidgetSchema.parse(invalid)).toThrow();
  });

  it('rejects an unknown chartType', () => {
    const invalid = { ...lineWidget, chartType: 'scatter' };
    expect(() => reportWidgetSchema.parse(invalid)).toThrow();
  });
});

describe('reportConfigSchema', () => {
  it('accepts a config with a single widget', () => {
    expect(() => reportConfigSchema.parse(baseConfig)).not.toThrow();
  });

  it('rejects a config with no widgets', () => {
    expect(() => reportConfigSchema.parse({ ...baseConfig, widgets: [] })).toThrow();
  });

  it('rejects a layout with an unsupported column count', () => {
    expect(() => reportConfigSchema.parse({ ...baseConfig, layout: { columns: 5 } })).toThrow();
  });
});

describe('savedReportSchema', () => {
  it('accepts a saved report with null optional foreign keys', () => {
    const report = {
      saved_report_id: '589d55e5-2e80-40d8-84d7-1784f351abdf',
      user_id: '53675d26-0427-4dba-a837-cabde1605f76',
      rescue_id: null,
      template_id: null,
      name: 'Report',
      description: null,
      config: baseConfig,
      is_archived: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    expect(() => savedReportSchema.parse(report)).not.toThrow();
  });

  it('rejects a saved report with a non-uuid id', () => {
    expect(() =>
      savedReportSchema.parse({
        saved_report_id: 'x',
        user_id: '53675d26-0427-4dba-a837-cabde1605f76',
        rescue_id: null,
        template_id: null,
        name: 'Report',
        description: null,
        config: baseConfig,
        is_archived: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
    ).toThrow();
  });
});

describe('scheduledReportSchema', () => {
  it('rejects a recipient with an invalid email', () => {
    expect(() =>
      scheduledReportSchema.parse({
        schedule_id: 'c786db74-eb4f-4c2b-82ad-7d44a435f469',
        saved_report_id: '589d55e5-2e80-40d8-84d7-1784f351abdf',
        cron: '0 9 * * 1',
        timezone: 'UTC',
        recipients: [{ email: 'not-an-email' }],
        format: 'pdf',
        is_enabled: true,
        last_run_at: null,
        next_run_at: null,
        last_status: null,
        last_error: null,
      })
    ).toThrow();
  });
});

describe('executedReportSchema', () => {
  it('accepts an executed report with arbitrary widget data', () => {
    const executed = {
      widgets: [
        {
          id: '634d3ff9-634a-40e8-8ef5-efd55e37d4b1',
          data: [{ anything: true }],
          meta: { metric: 'adoption', chartType: 'line', computedAt: '2026-01-01T00:00:00.000Z' },
        },
      ],
      filters: { groupBy: 'day' },
      computedAt: '2026-01-01T00:00:00.000Z',
      cacheHit: true,
    };

    const parsed = executedReportSchema.parse(executed);
    expect(parsed.cacheHit).toBe(true);
  });
});
