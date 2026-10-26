import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Layers,
  Lock,
  MessageSquare,
  Minus,
  Pause,
  Play,
  RotateCcw,
  Server,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { ServiceHealthScore, ServiceId, ServiceNode } from '../../../shared/types.js';

interface HealthTickerRibbonProps {
  nodes: ServiceNode[];
  onSelectService: (id: ServiceId) => void;
  selectedServiceId?: ServiceId | null;
}

export const HealthTickerRibbon: React.FC<HealthTickerRibbonProps> = ({
  nodes,
  onSelectService,
  selectedServiceId,
}) => {
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [tickerSpeed, setTickerSpeed] = useState<'normal' | 'fast'>('normal');

  // Keep ref of previous scores to calculate real-time percentage delta
  const previousScoresRef = useRef<Map<ServiceId, number>>(new Map());

  const getServiceIcon = (id: ServiceId) => {
    switch (id) {
      case 'api-gateway':
        return <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'auth-service':
        return <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'order-service':
        return <ShoppingCart className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'payment-service':
        return <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'inventory-service':
        return <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'message-queue':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    }
  };

  // Compute live health percentage and change delta for each service
  const healthScores: ServiceHealthScore[] = nodes.map((node) => {
    let healthPct = 100;
    if (node.health === 'offline') {
      healthPct = 0;
    } else {
      const errorPenalty = node.errorRate * 1.5;
      const latencyPenalty = Math.max(0, (node.latencyP95 - 40) / 15);
      healthPct = Math.max(0, Math.min(100, +(100 - errorPenalty - latencyPenalty).toFixed(1)));
    }

    const prev = previousScoresRef.current.get(node.id) ?? healthPct;
    const delta = +(healthPct - prev).toFixed(1);

    const trend: 'up' | 'down' | 'steady' =
      delta > 0.1 ? 'up' : delta < -0.1 ? 'down' : 'steady';

    return {
      serviceId: node.id,
      name: node.name,
      health: node.health,
      healthPct,
      changeDeltaPct: delta,
      trend,
      errorRate: node.errorRate,
      latencyP95: node.latencyP95,
      rps: node.rps,
    };
  });

  // Update previous scores ref when health changes meaningfully
  useEffect(() => {
    healthScores.forEach((s) => {
      previousScoresRef.current.set(s.serviceId, s.healthPct);
    });
  }, [nodes]);

  // Overall cluster aggregate health percentage
  const clusterAvgHealthPct = healthScores.length > 0
    ? +(healthScores.reduce((acc, s) => acc + s.healthPct, 0) / healthScores.length).toFixed(1)
    : 100;

  // Duplicate items array to create seamless infinite scrolling loop
  const displayItems = [...healthScores, ...healthScores, ...healthScores];

  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-950/90 backdrop-blur overflow-hidden shadow-lg select-none">
      {/* Ticker Header / Control Bar */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Health Telemetry Ribbon</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Cluster Index:</span>
            <span
              className={`font-bold tabular-nums ${
                clusterAvgHealthPct >= 95
                  ? 'text-emerald-400'
                  : clusterAvgHealthPct >= 75
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {clusterAvgHealthPct}%
            </span>
          </div>
        </div>

        {/* Ticker Play/Pause and Speed Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTickerSpeed((s) => (s === 'normal' ? 'fast' : 'normal'))}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              tickerSpeed === 'fast'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-800 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle ticker animation speed"
          >
            {tickerSpeed === 'fast' ? '2X SPEED' : '1X SPEED'}
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isPaused ? 'Resume scrolling' : 'Pause scrolling'}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Scrolling Strip Container */}
      <div
        className="relative w-full overflow-hidden py-2.5 px-2 group cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Subtle Edge Fade Gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

        {/* Marquee Track */}
        <div
          className={`flex items-center gap-3 whitespace-nowrap will-change-transform ${
            isPaused ? '' : tickerSpeed === 'fast' ? 'animate-marquee-fast' : 'animate-marquee'
          }`}
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {displayItems.map((item, idx) => {
            const isSelected = selectedServiceId === item.serviceId;
            const isCritical = item.health === 'critical' || item.health === 'offline';
            const isDegraded = item.health === 'degraded';

            return (
              <div
                key={`${item.serviceId}-${idx}`}
                onClick={() => onSelectService(item.serviceId)}
                className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-xs shrink-0 ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-950/50'
                    : isCritical
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-200 hover:border-rose-600'
                    : isDegraded
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-200 hover:border-amber-600'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                {getServiceIcon(item.serviceId)}

                <span className="font-semibold text-white tracking-tight">{item.name}</span>

                <span className="text-slate-600 font-mono text-[10px]">·</span>

                {/* Live Health Percentage */}
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.healthPct >= 95
                      ? 'text-emerald-400'
                      : item.healthPct >= 75
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {item.healthPct}%
                </span>

                {/* Percentage Change Delta */}
                <div
                  className={`flex items-center font-mono text-[11px] tabular-nums ${
                    item.changeDeltaPct > 0
                      ? 'text-emerald-400'
                      : item.changeDeltaPct < 0
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {item.changeDeltaPct > 0 ? (
                    <ArrowUpRight className="w-3 h-3 inline mr-0.5" />
                  ) : item.changeDeltaPct < 0 ? (
                    <ArrowDownRight className="w-3 h-3 inline mr-0.5" />
                  ) : (
                    <span className="mr-0.5">•</span>
                  )}
                  <span>
                    {item.changeDeltaPct > 0 ? `+${item.changeDeltaPct}%` : `${item.changeDeltaPct}%`}
                  </span>
                </div>

                {/* Status Indicator */}
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                    item.health === 'healthy'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                      : item.health === 'degraded'
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {item.health}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
