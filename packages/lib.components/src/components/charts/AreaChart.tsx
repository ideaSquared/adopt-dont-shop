import React from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame, type ChartFrameProps } from './ChartFrame';
import { PALETTE, type ChartDatum, type ChartSeries } from './types';

export type AreaChartProps = Omit<ChartFrameProps, 'children' | 'isEmpty'> & {
  data: ChartDatum[];
  xKey: string;
  series: ChartSeries[];
  stacked?: boolean;
  showLegend?: boolean;
};

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  xKey,
  series,
  stacked,
  showLegend,
  ...frame
}) => (
  <ChartFrame {...frame} isEmpty={data.length === 0}>
    <ResponsiveContainer width='100%' height='100%'>
      <RechartsAreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
        <XAxis dataKey={xKey} stroke='#6b7280' fontSize={12} />
        <YAxis stroke='#6b7280' fontSize={12} />
        <Tooltip />
        {showLegend ? <Legend /> : null}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type='monotone'
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? PALETTE[i % PALETTE.length]}
            fill={s.color ?? PALETTE[i % PALETTE.length]}
            fillOpacity={0.25}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  </ChartFrame>
);
