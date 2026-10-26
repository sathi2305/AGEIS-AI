import React from 'react';

interface SvgChartProps {
  data: { timestamp: number; value: number }[];
  color?: string;
  fillColor?: string;
  height?: number;
  unit?: string;
  title?: string;
  yDomain?: [number, number];
}

export const SvgChart: React.FC<SvgChartProps> = ({
  data,
  color = '#38BDF8', // cyan-400
  fillColor = 'rgba(56, 189, 248, 0.1)',
  height = 140,
  unit = '',
  title,
  yDomain,
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-500 rounded border border-slate-800/80 bg-slate-900/40"
        style={{ height }}
      >
        Waiting for telemetry stream...
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = yDomain ? yDomain[0] : Math.min(...values);
  const maxVal = yDomain ? yDomain[1] : Math.max(...values, minVal + 1);
  const range = maxVal - minVal || 1;

  const width = 600; // SVG viewBox coordinate width
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - ((d.value - minVal) / range) * chartHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const areaD =
    points.length > 0
      ? `M ${paddingX},${paddingY + chartHeight} L ${points.join(' L ')} L ${
          paddingX + chartWidth
        },${paddingY + chartHeight} Z`
      : '';

  const latestVal = data[data.length - 1]?.value ?? 0;
  const avgVal = +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">{title}</span>
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-slate-500">
              Avg: <span className="text-slate-300">{avgVal}{unit}</span>
            </span>
            <span className="font-semibold text-white">
              Current: <span style={{ color }}>{latestVal}{unit}</span>
            </span>
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
      >
        {/* Horizontal gridlines */}
        <line
          x1={paddingX}
          y1={paddingY}
          x2={width - paddingX}
          y2={paddingY}
          stroke="#1E293B"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={paddingY + chartHeight / 2}
          x2={width - paddingX}
          y2={paddingY + chartHeight / 2}
          stroke="#1E293B"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={paddingY + chartHeight}
          x2={width - paddingX}
          y2={paddingY + chartHeight}
          stroke="#334155"
        />

        {/* Min/Max Y labels */}
        <text
          x={paddingX - 6}
          y={paddingY + 4}
          fill="#64748B"
          fontSize="10"
          textAnchor="end"
          fontFamily="monospace"
        >
          {maxVal.toFixed(0)}
        </text>
        <text
          x={paddingX - 6}
          y={paddingY + chartHeight}
          fill="#64748B"
          fontSize="10"
          textAnchor="end"
          fontFamily="monospace"
        >
          {minVal.toFixed(0)}
        </text>

        {/* Gradient fill */}
        <path d={areaD} fill={fillColor} />

        {/* Stroke line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current point beacon */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(',')[0]}
            cy={points[points.length - 1].split(',')[1]}
            r="4"
            fill={color}
            stroke="#080C14"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
};
