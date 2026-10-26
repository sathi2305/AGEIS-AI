import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Key,
  Layers,
  Lock,
  MessageSquare,
  Minus,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  ShoppingCart,
  XCircle,
  Zap,
} from 'lucide-react';
import { ServiceHealth, ServiceId, ServiceNode } from '../../../shared/types.js';

interface TopologyGraphProps {
  nodes: ServiceNode[];
  selectedServiceId: ServiceId | null;
  onSelectService: (id: ServiceId) => void;
  highlightCascade?: boolean;
}

const EDGES: { from: ServiceId; to: ServiceId; label: string }[] = [
  { from: 'api-gateway', to: 'auth-service', label: 'Verify JWT' },
  { from: 'api-gateway', to: 'order-service', label: 'Dispatch Order' },
  { from: 'order-service', to: 'payment-service', label: 'Charge Card' },
  { from: 'order-service', to: 'inventory-service', label: 'Reserve SKU' },
  { from: 'order-service', to: 'message-queue', label: 'OrderPlaced Event' },
  { from: 'payment-service', to: 'database', label: 'Ledger Tx' },
  { from: 'inventory-service', to: 'database', label: 'Stock Lock' },
];

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  nodes,
  selectedServiceId,
  onSelectService,
  highlightCascade = true,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const nodeMap = new Map<ServiceId, ServiceNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

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

  const getHealthBadge = (health: ServiceHealth) => {
    switch (health) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Degraded
          </span>
        );
      case 'critical':
      case 'offline':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            {health === 'offline' ? 'Offline' : 'Critical'}
          </span>
        );
    }
  };

  return (
    <div className="relative w-full h-[580px] bg-[#0A0F1D] rounded-xl border border-slate-800/80 overflow-hidden select-none">
      {/* Controls toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-1 text-slate-300">
        <button
          onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="px-2 py-1 text-xs hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Reset View"
        >
          Reset
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 bg-slate-900/85 backdrop-blur border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Degraded / Cascade</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Critical / Root Failure</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          <span>Traffic Flow</span>
        </div>
      </div>

      {/* Interactive Canvas */}
      <svg
        className="w-full h-full"
        viewBox="0 0 940 580"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
        }}
      >
        <defs>
          {/* Arrow markers */}
          <marker
            id="arrow-normal"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
          </marker>
          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38BDF8" />
          </marker>
          <marker
            id="arrow-broken"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F43F5E" />
          </marker>
        </defs>

        {/* Directed Edges */}
        {EDGES.map((edge, idx) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;

          const isUnhealthy = fromNode.health !== 'healthy' || toNode.health !== 'healthy';
          const strokeColor = isUnhealthy
            ? toNode.health === 'critical' || toNode.health === 'offline'
              ? '#F43F5E'
              : '#F59E0B'
            : '#334155';
          const markerId = isUnhealthy ? 'url(#arrow-broken)' : 'url(#arrow-active)';

          // Calculate offset endpoints so arrows don't collide with card centers
          const dx = toNode.x - fromNode.x;
          const dy = toNode.y - fromNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const startX = fromNode.x + (dx / dist) * 65;
          const startY = fromNode.y + (dy / dist) * 35;
          const endX = toNode.x - (dx / dist) * 75;
          const endY = toNode.y - (dy / dist) * 45;

          // Curve mid-point
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;

          return (
            <g key={`edge-${idx}`}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={strokeColor}
                strokeWidth={isUnhealthy ? 2.5 : 1.5}
                strokeDasharray={isUnhealthy ? '6 4' : undefined}
                markerEnd={markerId}
              />
              {/* Animated particle pulse if healthy and traffic flowing */}
              {!isUnhealthy && (
                <circle r="2.5" fill="#38BDF8">
                  <animateMotion
                    path={`M ${startX} ${startY} L ${endX} ${endY}`}
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Service Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedServiceId === node.id;
          const isFailing = node.health === 'critical' || node.health === 'offline';
          const isDegraded = node.health === 'degraded';

          const cardBorderColor = isSelected
            ? '#38BDF8'
            : isFailing
            ? '#F43F5E'
            : isDegraded
            ? '#F59E0B'
            : '#1E293B';

          const cardBg = isSelected
            ? '#0F1D36'
            : isFailing
            ? '#201016'
            : isDegraded
            ? '#1F180A'
            : '#0D1424';

          return (
            <g
              key={node.id}
              transform={`translate(${node.x - 90}, ${node.y - 45})`}
              className="cursor-pointer transition-all duration-200"
              onClick={() => onSelectService(node.id)}
            >
              {/* Node shadow/glow if failing */}
              {(isFailing || isDegraded) && (
                <rect
                  x="-2"
                  y="-2"
                  width="184"
                  height="94"
                  rx="10"
                  fill="none"
                  stroke={isFailing ? '#F43F5E' : '#F59E0B'}
                  strokeWidth="3"
                  opacity="0.3"
                >
                  <animate
                    attributeName="opacity"
                    values="0.2;0.6;0.2"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </rect>
              )}

              {/* Node Container Card */}
              <rect
                x="0"
                y="0"
                width="180"
                height="90"
                rx="8"
                fill={cardBg}
                stroke={cardBorderColor}
                strokeWidth={isSelected ? 2 : 1}
              />

              {/* ForeignObject for HTML rich content inside SVG */}
              <foreignObject x="0" y="0" width="180" height="90">
                <div className="w-full h-full p-2.5 flex flex-col justify-between text-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      {getServiceIcon(node.id)}
                      <span className="text-xs font-semibold text-white truncate max-w-[95px]">
                        {node.name}
                      </span>
                    </div>
                    {getHealthBadge(node.health)}
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] font-mono tabular-nums text-slate-400 mt-1 border-t border-slate-800/80 pt-1.5">
                    <div>
                      <span className="text-slate-500">Latency: </span>
                      <span
                        className={
                          node.latencyP95 > 350
                            ? 'text-rose-400 font-semibold'
                            : 'text-slate-200'
                        }
                      >
                        {node.latencyP95}ms
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Error: </span>
                      <span
                        className={
                          node.errorRate > 5
                            ? 'text-rose-400 font-semibold'
                            : 'text-slate-200'
                        }
                      >
                        {node.errorRate}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">RPS: </span>
                      <span className="text-slate-200">{node.rps}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">CPU: </span>
                      <span className="text-slate-200">{node.cpuUsage}%</span>
                    </div>
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
