import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { formatCurrency, formatCompact } from '../../lib/utils';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#f43f5e', '#84cc16'];

type BarDef = { dataKey: string; name: string; color?: string };

type Props = {
  type: 'bar' | 'stacked-bar' | 'line' | 'pie' | 'horizontal-bar';
  data: any[];
  xKey?: string;
  bars?: BarDef[];
  height?: number;
  title?: string;
};

export default function ReportChartPanel({ type, data, xKey = 'label', bars = [], height = 350, title }: Props) {
  const barDefs = useMemo(() => {
    if (bars.length) return bars;
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]).filter((k) => k !== xKey && typeof data[0][k] === 'number');
    return keys.slice(0, 3).map((k, i) => ({ dataKey: k, name: k.replace(/_/g, ' '), color: COLORS[i] }));
  }, [data, bars, xKey]);

  if (!data.length) {
    return (
      <div className="card p-6">
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-48 text-gray-400">No chart data</div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {type === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={barDefs[0]?.dataKey ?? 'value'} nameKey={xKey} cx="50%" cy="50%"
                 outerRadius={120} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
          </PieChart>
        ) : type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCompact(v)} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            {barDefs.map((b, i) => (
              <Line key={b.dataKey} type="monotone" dataKey={b.dataKey} name={b.name}
                    stroke={b.color || COLORS[i]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : type === 'horizontal-bar' ? (
          <BarChart data={data.slice(0, 15)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 10 }} width={150} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            {barDefs.map((b, i) => (
              <Bar key={b.dataKey} dataKey={b.dataKey} name={b.name} fill={b.color || COLORS[i]}
                   radius={[0, 4, 4, 0]} />
            ))}
          </BarChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCompact(v)} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            {barDefs.map((b, i) => (
              <Bar key={b.dataKey} dataKey={b.dataKey} name={b.name} fill={b.color || COLORS[i]}
                   radius={[4, 4, 0, 0]} stackId={type === 'stacked-bar' ? 'stack' : undefined} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
