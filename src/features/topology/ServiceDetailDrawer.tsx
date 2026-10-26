import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Layers,
  Lock,
  MessageSquare,
  Power,
  RefreshCw,
  Server,
  Shield,
  ShoppingCart,
  Sliders,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { ServiceHealth, ServiceId, ServiceNode } from '../../../shared/types.js';

interface ServiceDetailDrawerProps {
  node: ServiceNode | null;
  onClose: () => void;
  onAction?: (actionType: string) => void;
}

export const ServiceDetailDrawer: React.FC<ServiceDetailDrawerProps> = ({
  node,
  onClose,
  onAction,
}) => {
  if (!node) return null;

  const getServiceIcon = (id: ServiceId) => {
    switch (id) {
      case 'api-gateway':
        return <Layers className="w-5 h-5 text-cyan-400" />;
      case 'auth-service':
        return <Lock className="w-5 h-5 text-indigo-400" />;
      case 'order-service':
        return <ShoppingCart className="w-5 h-5 text-blue-400" />;
      case 'payment-service':
        return <Zap className="w-5 h-5 text-emerald-400" />;
      case 'inventory-service':
        return <Server className="w-5 h-5 text-amber-400" />;
      case 'message-queue':
        return <MessageSquare className="w-5 h-5 text-purple-400" />;
      case 'database':
        return <Database className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          {getServiceIcon(node.id)}
          <div>
            <h3 className="text-sm font-semibold text-white">{node.name}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono">{node.id}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{node.version}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status card */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                node.health === 'healthy'
                  ? 'bg-emerald-500'
                  : node.health === 'degraded'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold uppercase text-slate-200">
              Health Status: {node.health}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Restarts: {node.restarts}
          </span>
        </div>

        {/* Live Metrics Grid */}
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2">Live Node Telemetry</h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
            <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800/80">
              <span className="text-slate-500 block text-[11px]">Request Throughput</span>
              <span className="text-sm font-semibold text-white">{node.rps} rps</span>
            </div>
            <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800/80">
              <span className="text-slate-500 block text-[11px]">Error Rate</span>
              <span
                className={`text-sm font-semibold ${
                  node.errorRate > 5 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {node.errorRate}%
              </span>
            </div>
            <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800/80">
              <span className="text-slate-500 block text-[11px]">p95 Latency</span>
              <span
                className={`text-sm font-semibold ${
                  node.latencyP95 > 350 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {node.latencyP95}ms
              </span>
            </div>
            <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800/80">
              <span className="text-slate-500 block text-[11px]">CPU / RAM Load</span>
              <span className="text-sm font-semibold text-slate-200">
                {node.cpuUsage}% / {node.memoryUsage}%
              </span>
            </div>

            {node.activeConnections !== undefined && (
              <div className="col-span-2 p-2.5 bg-slate-950/40 rounded border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px]">Database Connection Pool</span>
                  <span
                    className={`font-semibold ${
                      node.activeConnections >= 90 ? 'text-rose-400' : 'text-slate-200'
                    }`}
                  >
                    {node.activeConnections} / {node.config.maxConnections} max
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded mt-2 overflow-hidden">
                  <div
                    className={`h-full ${
                      node.activeConnections >= 90 ? 'bg-rose-500' : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (node.activeConnections / node.config.maxConnections) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {node.queueDepth !== undefined && (
              <div className="col-span-2 p-2.5 bg-slate-950/40 rounded border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px]">Queue Depth (Backpressure)</span>
                  <span
                    className={`font-semibold ${
                      node.queueDepth > 500 ? 'text-rose-400' : 'text-slate-200'
                    }`}
                  >
                    {node.queueDepth} messages
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Runtime Configuration */}
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2">Runtime SLA Policy & Limits</h4>
          <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/80 text-xs font-mono space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Timeout Threshold:</span>
              <span>{node.config.timeoutMs}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rate Limit Bucket:</span>
              <span>{node.config.rateLimitRps} rps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Circuit Breaker:</span>
              <span
                className={
                  node.config.circuitBreakerOpen ? 'text-amber-400 font-semibold' : 'text-emerald-400'
                }
              >
                {node.config.circuitBreakerOpen ? 'TRIPPED (OPEN)' : 'CLOSED (NORMAL)'}
              </span>
            </div>
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2">Direct Dependencies</h4>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {node.dependencies.length > 0 ? (
              node.dependencies.map((dep) => (
                <span
                  key={dep}
                  className="px-2 py-1 bg-slate-800 text-slate-300 rounded font-mono text-[11px]"
                >
                  → {dep}
                </span>
              ))
            ) : (
              <span className="text-slate-500 text-xs">No downstream dependencies (Leaf Node)</span>
            )}
          </div>
        </div>

        {/* Last Error Trace */}
        {node.lastErrorLog && (
          <div>
            <h4 className="text-xs font-medium text-rose-400 mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Observed Failure Log
            </h4>
            <div className="p-3 bg-rose-950/20 border border-rose-900/60 rounded-lg text-xs font-mono text-rose-300 whitespace-pre-wrap leading-relaxed">
              {node.lastErrorLog}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <span className="text-xs text-slate-500">AEGIS-X Runtime Managed</span>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
};
