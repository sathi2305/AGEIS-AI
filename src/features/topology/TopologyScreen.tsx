import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { ServiceId, ServiceNode } from '../../../shared/types.js';
import { HealthTickerRibbon } from './HealthTickerRibbon.js';
import { ServiceDetailDrawer } from './ServiceDetailDrawer.js';
import { TopologyGraph } from './TopologyGraph.js';

interface TopologyScreenProps {
  nodes: ServiceNode[];
  selectedServiceId: ServiceId | null;
  onSelectService: (id: ServiceId | null) => void;
  onRefresh: () => void;
}

export const TopologyScreen: React.FC<TopologyScreenProps> = ({
  nodes,
  selectedServiceId,
  onSelectService,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filterHealth, setFilterHealth] = useState<string>('all');
  const [highlightCascade, setHighlightCascade] = useState<boolean>(true);

  const selectedNode = nodes.find((n) => n.id === selectedServiceId) || null;

  const filteredNodes = nodes.filter((n) => {
    if (search && !n.name.toLowerCase().includes(search.toLowerCase()) && !n.id.includes(search)) {
      return false;
    }
    if (filterHealth !== 'all' && n.health !== filterHealth) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Topology Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            Distributed Architecture Dependency Graph
          </h2>
          <p className="text-xs text-slate-400">
            Directed service graph with dynamic traffic flow and real-time failure propagation
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Cascade Toggle */}
          <button
            onClick={() => setHighlightCascade(!highlightCascade)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              highlightCascade
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            Cascade Highlighting: {highlightCascade ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Graph Viewport */}
      <TopologyGraph
        nodes={nodes}
        selectedServiceId={selectedServiceId}
        onSelectService={(id) => onSelectService(id)}
        highlightCascade={highlightCascade}
      />

      {/* Services Table Summary */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Registered Microservices ({nodes.length})
          </span>
          <span className="text-xs text-slate-500">Click any row to inspect container diagnostics</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">Service</th>
                <th className="px-4 py-2.5">Health</th>
                <th className="px-4 py-2.5">Throughput</th>
                <th className="px-4 py-2.5">p95 Latency</th>
                <th className="px-4 py-2.5">Error Rate</th>
                <th className="px-4 py-2.5">CPU / Mem</th>
                <th className="px-4 py-2.5">Restarts</th>
                <th className="px-4 py-2.5">Direct Dependencies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredNodes.map((node) => (
                <tr
                  key={node.id}
                  onClick={() => onSelectService(node.id)}
                  className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    selectedServiceId === node.id ? 'bg-cyan-950/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-sans font-medium text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    {node.name}
                    <span className="text-slate-500 text-[11px] font-mono">({node.id})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        node.health === 'healthy'
                          ? 'text-emerald-400'
                          : node.health === 'degraded'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {node.health.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-200">{node.rps} rps</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={node.latencyP95 > 350 ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
                      {node.latencyP95}ms
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={node.errorRate > 5 ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
                      {node.errorRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-400">
                    {node.cpuUsage}% / {node.memoryUsage}%
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-400">{node.restarts}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {node.dependencies.length > 0 ? node.dependencies.join(', ') : 'Leaf (None)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Health Percentage Ticker Ribbon */}
      <HealthTickerRibbon
        nodes={nodes}
        selectedServiceId={selectedServiceId}
        onSelectService={(id) => onSelectService(id)}
      />

      {/* Service Detail Drawer */}
      <ServiceDetailDrawer
        node={selectedNode}
        onClose={() => onSelectService(null)}
      />
    </div>
  );
};

