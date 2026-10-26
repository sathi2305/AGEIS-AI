import React, { useState } from 'react';
import {
  Activity,
  ArrowDownUp,
  BarChart3,
  Clock,
  Database,
  Filter,
  Layers,
  Radio,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';
import { ServiceId, ServiceNode, TelemetryPoint } from '../../../shared/types.js';
import { SvgChart } from '../../components/SvgChart.js';

interface TelemetryScreenProps {
  telemetry: TelemetryPoint[];
  nodes: ServiceNode[];
  onRefresh: () => void;
}

export const TelemetryScreen: React.FC<TelemetryScreenProps> = ({
  telemetry,
  nodes,
  onRefresh,
}) => {
  const [selectedService, setSelectedService] = useState<ServiceId | 'all'>('all');
  const [timeWindowSec, setTimeWindowSec] = useState<number>(180);

  // Filter telemetry points
  const cutoff = Date.now() - timeWindowSec * 1000;
  const filteredPoints = telemetry.filter((p) => {
    if (p.timestamp < cutoff) return false;
    if (selectedService !== 'all' && p.serviceId !== selectedService) return false;
    return true;
  });

  // Group by timestamp buckets (2-second buckets)
  const timeBuckets = new Map<
    number,
    {
      rps: number;
      errorSum: number;
      latencySum: number;
      cpuSum: number;
      queueSum: number;
      connSum: number;
      count: number;
    }
  >();

  filteredPoints.forEach((p) => {
    const bucket = Math.floor(p.timestamp / 2000) * 2000;
    const existing = timeBuckets.get(bucket) || {
      rps: 0,
      errorSum: 0,
      latencySum: 0,
      cpuSum: 0,
      queueSum: 0,
      connSum: 0,
      count: 0,
    };
    existing.rps += p.rps;
    existing.errorSum += p.errorRate;
    existing.latencySum += p.latencyP95;
    existing.cpuSum += p.cpuUsage;
    existing.queueSum += p.queueDepth || 0;
    existing.connSum += p.activeConnections || 0;
    existing.count += 1;
    timeBuckets.set(bucket, existing);
  });

  const sortedTimes = Array.from(timeBuckets.keys()).sort((a, b) => a - b);

  const rpsData = sortedTimes.map((t) => ({
    timestamp: t,
    value: timeBuckets.get(t)!.rps,
  }));

  const errorData = sortedTimes.map((t) => {
    const b = timeBuckets.get(t)!;
    return {
      timestamp: t,
      value: +(b.errorSum / (b.count || 1)).toFixed(2),
    };
  });

  const latencyData = sortedTimes.map((t) => {
    const b = timeBuckets.get(t)!;
    return {
      timestamp: t,
      value: Math.round(b.latencySum / (b.count || 1)),
    };
  });

  const cpuData = sortedTimes.map((t) => {
    const b = timeBuckets.get(t)!;
    return {
      timestamp: t,
      value: Math.round(b.cpuSum / (b.count || 1)),
    };
  });

  const queueData = sortedTimes.map((t) => ({
    timestamp: t,
    value: timeBuckets.get(t)!.queueSum,
  }));

  const connData = sortedTimes.map((t) => ({
    timestamp: t,
    value: timeBuckets.get(t)!.connSum,
  }));

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Distributed Telemetry Stream
          </h2>
          <p className="text-xs text-slate-400">
            Real-time sliding window metrics ingested directly from local simulator
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Service Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-slate-500">Service:</span>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as any)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Services (Cluster Aggregate)</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Window */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
            {[60, 180, 300, 900].map((sec) => (
              <button
                key={sec}
                onClick={() => setTimeWindowSec(sec)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  timeWindowSec === sec
                    ? 'bg-cyan-900/80 text-cyan-200 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SvgChart
          data={rpsData}
          title="Ingress Throughput (RPS)"
          color="#38BDF8"
          fillColor="rgba(56, 189, 248, 0.08)"
          height={170}
          unit=" rps"
        />

        <SvgChart
          data={errorData}
          title="Observed Error Rate (%)"
          color="#F43F5E"
          fillColor="rgba(244, 63, 94, 0.08)"
          height={170}
          unit="%"
        />

        <SvgChart
          data={latencyData}
          title="p95 Response Time Latency (ms)"
          color="#A855F7"
          fillColor="rgba(168, 85, 247, 0.08)"
          height={170}
          unit="ms"
        />

        <SvgChart
          data={cpuData}
          title="CPU Utilization (%)"
          color="#F59E0B"
          fillColor="rgba(245, 158, 11, 0.08)"
          height={170}
          unit="%"
        />

        {selectedService === 'all' || selectedService === 'message-queue' ? (
          <SvgChart
            data={queueData}
            title="Message Queue Depth (DLQ Backlog)"
            color="#EC4899"
            fillColor="rgba(236, 72, 153, 0.08)"
            height={170}
            unit=" items"
          />
        ) : null}

        {selectedService === 'all' || selectedService === 'database' ? (
          <SvgChart
            data={connData}
            title="PostgreSQL Active Pool Connections"
            color="#10B981"
            fillColor="rgba(16, 185, 129, 0.08)"
            height={170}
            unit=" / 100"
          />
        ) : null}
      </div>

      {/* Raw Points Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Recent Telemetry Snapshots ({filteredPoints.slice(-10).length})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Window: {timeWindowSec}s · Filter: {selectedService}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">RPS</th>
                <th className="px-4 py-2">Error %</th>
                <th className="px-4 py-2">p95 Latency</th>
                <th className="px-4 py-2">CPU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPoints
                .slice(-10)
                .reverse()
                .map((pt, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2 text-slate-400">
                      {new Date(pt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-white font-sans">{pt.serviceId}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          pt.health === 'healthy'
                            ? 'text-emerald-400'
                            : pt.health === 'degraded'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {pt.health}
                      </span>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-slate-200">{pt.rps}</td>
                    <td className="px-4 py-2 tabular-nums">
                      <span className={pt.errorRate > 5 ? 'text-rose-400' : 'text-slate-300'}>
                        {pt.errorRate}%
                      </span>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-slate-200">{pt.latencyP95}ms</td>
                    <td className="px-4 py-2 tabular-nums text-slate-400">{pt.cpuUsage}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
