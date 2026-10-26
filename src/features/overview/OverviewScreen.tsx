import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileSearch,
  Filter,
  Flame,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  Incident,
  IncidentEvent,
  IncidentSeverity,
  ReliabilityAnalytics,
  ServiceId,
  ServiceNode,
  SimulatorState,
  TelemetryPoint,
} from '../../../shared/types.js';
import { SvgChart } from '../../components/SvgChart.js';
import { TopologyGraph } from '../topology/TopologyGraph.js';

interface OverviewScreenProps {
  nodes: ServiceNode[];
  incidents: Incident[];
  telemetry: TelemetryPoint[];
  analytics: ReliabilityAnalytics | null;
  simulatorState?: SimulatorState | null;
  lastUpdated?: number;
  backendConnected?: boolean;
  onTriggerEmergencyStop?: () => Promise<any>;
  onResetEmergencyStop?: () => Promise<any>;
  onNavigate: (tab: string) => void;
  onSelectIncident: (inc: Incident) => void;
  onSelectService: (id: ServiceId) => void;
  onRunDemoScenario: () => void;
}

interface FeedItem {
  id: string;
  timestamp: number;
  type: string;
  author: string;
  summary: string;
  details?: string;
  incidentId?: string;
  incidentTitle?: string;
  severity?: IncidentSeverity;
  data?: any;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  nodes,
  incidents,
  telemetry,
  analytics,
  simulatorState,
  lastUpdated,
  backendConnected = true,
  onTriggerEmergencyStop,
  onResetEmergencyStop,
  onNavigate,
  onSelectIncident,
  onSelectService,
  onRunDemoScenario,
}) => {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const [feedPaused, setFeedPaused] = useState(false);
  const [feedSeverityFilter, setFeedSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [feedSearch, setFeedSearch] = useState('');
  const [inspectedEvent, setInspectedEvent] = useState<FeedItem | null>(null);

  const activeIncidents = incidents.filter(
    (i) => i.state !== 'RECOVERED' && i.state !== 'CANCELLED'
  );
  const healthyCount = nodes.filter((n) => n.health === 'healthy').length;
  const degradedCount = nodes.filter((n) => n.health === 'degraded').length;
  const criticalCount = nodes.filter((n) => n.health === 'critical' || n.health === 'offline').length;
  const totalServices = nodes.length || 7;

  // Aggregate telemetry for charts
  const timeMap = new Map<number, { rps: number; errorRate: number; count: number }>();
  telemetry.forEach((pt) => {
    const bucket = Math.floor(pt.timestamp / 2000) * 2000;
    const existing = timeMap.get(bucket) || { rps: 0, errorRate: 0, count: 0 };
    existing.rps += pt.rps;
    existing.errorRate += pt.errorRate;
    existing.count += 1;
    timeMap.set(bucket, existing);
  });

  const sortedTimestamps = Array.from(timeMap.keys()).sort((a, b) => a - b).slice(-30);
  const throughputData = sortedTimestamps.map((t) => ({
    timestamp: t,
    value: timeMap.get(t)!.rps,
  }));
  const errorRateData = sortedTimestamps.map((t) => {
    const item = timeMap.get(t)!;
    return {
      timestamp: t,
      value: +(item.errorRate / (item.count || 1)).toFixed(2),
    };
  });

  const isEmergencyActive = !!simulatorState?.emergencyStop;

  // Compile combined events stream for the Operations Feed
  const combinedEvents = useMemo<FeedItem[]>(() => {
    const list: FeedItem[] = [];
    incidents.forEach((inc) => {
      inc.timeline?.forEach((evt) => {
        list.push({
          id: evt.id,
          timestamp: evt.timestamp,
          type: evt.type,
          author: evt.author,
          summary: evt.summary,
          details: evt.details,
          incidentId: inc.id,
          incidentTitle: inc.title,
          severity: inc.severity,
        });
      });
    });

    // Sort descending by timestamp
    list.sort((a, b) => b.timestamp - a.timestamp);

    // Fallback baseline events if empty
    if (list.length === 0) {
      const baseNow = lastUpdated || Date.now();
      return [
        {
          id: 'evt_init_1',
          timestamp: baseNow - 45000,
          type: 'ANOMALY_DETECTED',
          author: 'SYSTEM',
          summary: 'Continuous telemetry ingestion established across 7 microservices',
          severity: 'LOW',
        },
        {
          id: 'evt_init_2',
          timestamp: baseNow - 20000,
          type: 'STATUS_CHANGED',
          author: 'SYSTEM',
          summary: 'Autonomous guardian policy activated in active monitoring mode',
          severity: 'LOW',
        },
      ];
    }

    return list;
  }, [incidents, lastUpdated]);

  const filteredEvents = useMemo(() => {
    return combinedEvents.filter((evt) => {
      if (feedSeverityFilter !== 'ALL' && evt.severity !== feedSeverityFilter) {
        return false;
      }
      if (feedSearch) {
        const q = feedSearch.toLowerCase();
        const text = `${evt.summary} ${evt.type} ${evt.author} ${evt.incidentTitle || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [combinedEvents, feedSeverityFilter, feedSearch]);

  // 7-day incident frequency heatmap data from analytics state (with fallback computation)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = Date.now();
  const dayMs = 86400000;

  const heatmapDays =
    analytics?.sevenDayFrequency && analytics.sevenDayFrequency.length === 7
      ? analytics.sevenDayFrequency
      : Array.from({ length: 7 }).map((_, idx) => {
          const i = 6 - idx;
          const d = new Date(now - i * dayMs);
          const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
          const end = start + dayMs;
          const matching = incidents.filter(
            (inc) => inc.detectedAt >= start && inc.detectedAt < end
          );
          return {
            dayLabel: i === 0 ? 'Today' : daysOfWeek[d.getDay()],
            dateStr: `${months[d.getMonth()]} ${d.getDate()}`,
            count: matching.length,
            critical: matching.filter((inc) => inc.severity === 'CRITICAL').length,
            high: matching.filter((inc) => inc.severity === 'HIGH').length,
            medium: matching.filter((inc) => inc.severity === 'MEDIUM').length,
            low: matching.filter((inc) => inc.severity === 'LOW').length,
          };
        });

  const handleConfirmEmergencyStop = async () => {
    if (!onTriggerEmergencyStop) return;
    setIsEmergencyLoading(true);
    try {
      await onTriggerEmergencyStop();
      setShowEmergencyModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEmergencyLoading(false);
    }
  };

  const handleDisengageEmergencyStop = async () => {
    if (!onResetEmergencyStop) return;
    setIsEmergencyLoading(true);
    try {
      await onResetEmergencyStop();
    } catch (err) {
      console.error(err);
    } finally {
      setIsEmergencyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          EXECUTIVE HERO SECTION
          ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0A1222] via-[#0E1A30] to-[#0A1222] shadow-2xl relative overflow-hidden">
        {/* Subtle radial glow background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-sm">
                AEGIS-X v3.0
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase bg-slate-900/90 text-slate-300 border border-slate-700/60">
                Simulator Profile: E-Commerce Production Replica
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-900/90 border border-slate-700/60">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
                  }`}
                />
                <span className={backendConnected ? 'text-emerald-300' : 'text-rose-300'}>
                  {backendConnected ? 'Live Telemetry Active' : 'Backend Disconnected'}
                </span>
                {lastUpdated && (
                  <span className="text-slate-500 text-[9px] border-l border-slate-700/60 pl-1.5 ml-0.5">
                    {Math.max(1, Math.round((Date.now() - lastUpdated) / 1000))}s ago
                  </span>
                )}
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Autonomous Reliability Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
                Deterministic fault detection, real-time dependency blast-radius reasoning, and human-in-the-loop automated incident remediation for high-scale distributed architectures.
              </p>
            </div>
          </div>

          {/* Action Button Suite */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onRunDemoScenario}
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all shadow-lg shadow-cyan-950/40 flex items-center gap-2 group"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200 group-hover:rotate-12 transition-transform" />
              <span>Start Guided Demo</span>
            </button>

            <button
              onClick={() => onNavigate('incidents')}
              className="px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-xl transition-colors flex items-center gap-2"
            >
              <FileSearch className="w-3.5 h-3.5 text-slate-400" />
              <span>View Active Incidents</span>
              {activeIncidents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {activeIncidents.length}
                </span>
              )}
            </button>

            {/* Emergency Stop Control with danger treatment */}
            {isEmergencyActive ? (
              <button
                onClick={handleDisengageEmergencyStop}
                disabled={isEmergencyLoading}
                className="px-4 py-2 text-xs font-bold text-rose-200 bg-rose-950/90 hover:bg-rose-900 border-2 border-rose-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/60 animate-pulse"
              >
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>Resume Simulator Traffic</span>
              </button>
            ) : (
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="px-4 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/70 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                title="Immediately halt simulated traffic and clear active faults"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>Emergency Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Emergency Stop Active Warning Banner */}
        {isEmergencyActive && (
          <div className="mt-4 p-3 rounded-xl border border-rose-600/80 bg-rose-950/60 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
              <span className="font-semibold tracking-wide">
                EMERGENCY STOP ACTIVE: Ingress traffic halted · Chaos scenarios suspended · Fail-safe active
              </span>
            </div>
            <button
              onClick={handleDisengageEmergencyStop}
              className="px-3 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors"
            >
              Disengage Now
            </button>
          </div>
        )}
      </div>

      {/* Emergency Stop Confirmation Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl border border-rose-700/80 bg-[#0B101D] shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-950/80 rounded-xl text-rose-400 border border-rose-800/60">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Confirm Emergency Circuit Trip
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  You are about to engage the AEGIS-X Emergency Stop. This will immediately halt simulated customer ingress, clear active chaos injections, and lock service topologies into fail-safe isolation.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Target Environment:</span>
                <span className="text-slate-200 font-mono">Isolated Simulator Sandbox</span>
              </div>
              <div className="flex justify-between">
                <span>Active Faults:</span>
                <span className="text-slate-200 font-mono">{simulatorState?.activeFaults?.length || 0} active</span>
              </div>
              <div className="flex justify-between">
                <span>Monitored Services:</span>
                <span className="text-slate-200 font-mono">{totalServices} nodes</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowEmergencyModal(false)}
                disabled={isEmergencyLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmergencyStop}
                disabled={isEmergencyLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950/50"
              >
                {isEmergencyLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertOctagon className="w-3.5 h-3.5" />}
                Confirm Emergency Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ANIMATED METRIC KPI CARDS
          ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Monitored Services */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition-colors group relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Services</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {totalServices}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">100% mesh</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Full telemetry coverage</p>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Healthy Nodes */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition-colors group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Healthy</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                healthyCount === totalServices ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {healthyCount}/{totalServices}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {Math.round((healthyCount / totalServices) * 100)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {criticalCount > 0 ? `${criticalCount} critical` : degradedCount > 0 ? `${degradedCount} degraded` : 'All nominal'}
          </p>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${healthyCount === totalServices ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${Math.round((healthyCount / totalServices) * 100)}%` }}
            />
          </div>
        </div>

        {/* Active Incidents */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition-colors group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Active Incidents</span>
            <ShieldAlert className={`w-3.5 h-3.5 ${activeIncidents.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                activeIncidents.length > 0 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {activeIncidents.length}
            </span>
            <span className="text-[10px] text-slate-500">
              {activeIncidents.length === 0 ? 'Nominal' : 'Action needed'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {activeIncidents.length === 0 ? '0 SLA breaches' : 'Investigation active'}
          </p>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${activeIncidents.length > 0 ? 'bg-rose-500' : 'bg-slate-700'}`}
              style={{ width: activeIncidents.length > 0 ? '100%' : '0%' }}
            />
          </div>
        </div>

        {/* Mean Detection Time (MTTD) */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition-colors group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">MTTD</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-cyan-400">
              {analytics?.meanTimeToDetectSec ?? 2.4}s
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">-98% vs SLA</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Anomaly gradient window</p>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: '92%' }} />
          </div>
        </div>

        {/* Mean Recovery Time (MTTR) */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition-colors group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">MTTR</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-indigo-300">
              {analytics?.meanTimeToRecoverSec ?? 14}s
            </span>
            <span className="text-[10px] text-slate-500">vs 19m manual</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Autonomous orchestration</p>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }} />
          </div>
        </div>

        {/* Recovery Verification Rate */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition-colors group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Recovery Rate</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
              {analytics?.recoverySuccessRatePct ?? 100}%
            </span>
            <span className="text-[10px] text-slate-500">Verified</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Post-mitigation check</p>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          ACTIVE INCIDENT PRIORITY PANEL
          ========================================================================= */}
      {activeIncidents.length > 0 ? (
        <div className="p-5 rounded-2xl border border-rose-800/70 bg-gradient-to-br from-rose-950/30 via-[#0E1524] to-[#0A101C] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-900/60 rounded-xl text-rose-300 border border-rose-700/60">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Priority Active Incident Queue ({activeIncidents.length})
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                    High Priority
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Autonomous investigation running · Human approval or mitigation execution available
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs font-semibold text-rose-300 hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <span>View All Incidents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Incidents Table */}
          <div className="overflow-x-auto rounded-xl border border-rose-900/40 bg-slate-950/60">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Severity / ID</th>
                  <th className="px-4 py-2.5">Title & Summary</th>
                  <th className="px-4 py-2.5">Target Service</th>
                  <th className="px-4 py-2.5">Blast Radius</th>
                  <th className="px-4 py-2.5">State</th>
                  <th className="px-4 py-2.5 text-right">Available Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-rose-950/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : inc.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}
                        >
                          {inc.severity}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">[{inc.id}]</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <div className="font-semibold text-white">{inc.title}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-sm">{inc.summary}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-300">
                      {inc.targetService}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className="text-rose-400 font-semibold">
                        {(inc.impactedServices?.length || 0) + 1} services
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                        {inc.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            onSelectIncident(inc);
                            onNavigate('investigation');
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                        >
                          RCA Details
                        </button>
                        <button
                          onClick={() => {
                            onSelectIncident(inc);
                            onNavigate('recovery');
                          }}
                          className="px-3 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          Recover
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-emerald-900/60 bg-gradient-to-r from-emerald-950/20 via-[#0B1520] to-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-300 block">
                Autonomous Guardian Nominal · Zero SLA Breaches Detected
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All 7 microservices running within latency budgets. Ready for continuous automated resilience drills.
              </p>
            </div>
          </div>
          <button
            onClick={onRunDemoScenario}
            className="px-3 py-1.5 text-xs font-medium text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Inject Chaos Scenario
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN VISUALIZATION GRID: INTERACTIVE TOPOLOGY + OBSERVABILITY METRICS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Topology Canvas */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Live Service Dependency Graph
              </h2>
              <p className="text-xs text-slate-400">
                Interactive real-time graph · Click any node to inspect container telemetry and dependencies
              </p>
            </div>
            <button
              onClick={() => onNavigate('topology')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
            >
              Full Screen Canvas
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <TopologyGraph
            nodes={nodes}
            selectedServiceId={null}
            onSelectService={onSelectService}
          />
        </div>

        {/* Right: Observability Metrics & Quick Chaos Demo */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Observability Pulse
            </h2>
            <p className="text-xs text-slate-400">Continuous 1.5s telemetry sliding window</p>
          </div>

          <SvgChart
            data={throughputData}
            title="Cluster Ingress Throughput (RPS)"
            color="#38BDF8"
            fillColor="rgba(56, 189, 248, 0.08)"
            height={125}
            unit=" rps"
          />

          <SvgChart
            data={errorRateData}
            title="Mesh Total Error Rate (%)"
            color="#F43F5E"
            fillColor="rgba(244, 63, 94, 0.08)"
            height={125}
            unit="%"
          />

          {/* Quick Guided Demo Callout */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Autonomous Recovery Verification
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inject a deterministic failure to observe AEGIS-X detect the anomaly, rank the causal root cause, plan a safe mitigation, and verify recovery with fresh telemetry.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onRunDemoScenario}
                className="flex-1 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors text-center"
              >
                1-Click Chaos Demo
              </button>
              <button
                onClick={() => onNavigate('chaos-lab')}
                className="px-3 py-2 text-xs font-medium text-cyan-400 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 rounded-lg transition-colors"
              >
                Chaos Lab
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          7-DAY INCIDENT FREQUENCY HEATMAP
          ========================================================================= */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              7-Day Incident Frequency Heatmap
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Daily distribution of detected anomalies and SLA threshold breaches across rolling calendar window
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              Total 7-Day Incidents:{' '}
              <strong className="text-white tabular-nums">
                {heatmapDays.reduce((acc, d) => acc + d.count, 0)}
              </strong>
            </span>
          </div>
        </div>

        {/* 7-Day Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {heatmapDays.map((day, idx) => {
            const isToday = day.dayLabel === 'Today';
            let cellStyle = 'bg-slate-950/60 border-slate-800/80 text-slate-400';
            let dotColor = 'bg-slate-700';
            let statusLabel = 'Nominal (0)';
            let countColor = 'text-slate-500';

            if (day.count >= 4) {
              cellStyle = 'bg-rose-950/40 border-rose-800/80 text-rose-200 shadow-sm shadow-rose-950/40';
              dotColor = 'bg-rose-500';
              statusLabel = 'Elevated';
              countColor = 'text-rose-400';
            } else if (day.count >= 2) {
              cellStyle = 'bg-amber-950/40 border-amber-800/80 text-amber-200 shadow-sm shadow-amber-950/40';
              dotColor = 'bg-amber-500';
              statusLabel = 'Moderate';
              countColor = 'text-amber-400';
            } else if (day.count === 1) {
              cellStyle = 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200 shadow-sm shadow-emerald-950/40';
              dotColor = 'bg-emerald-500';
              statusLabel = 'Low';
              countColor = 'text-emerald-400';
            }

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border transition-all duration-150 flex flex-col justify-between space-y-2 ${cellStyle} ${
                  isToday ? 'ring-1 ring-cyan-500/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isToday ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {day.dayLabel}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{day.dateStr}</span>
                </div>

                <div className="flex items-baseline justify-between my-0.5">
                  <span className={`text-2xl font-bold font-mono tabular-nums ${countColor}`}>
                    {day.count}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {day.count === 1 ? 'incident' : 'incidents'}
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    <span className="text-slate-400">{statusLabel}</span>
                  </div>

                  {day.count > 0 && (
                    <div className="flex items-center gap-1">
                      {day.critical > 0 && (
                        <span className="text-rose-400 font-bold" title="Critical">
                          {day.critical}C
                        </span>
                      )}
                      {day.high > 0 && (
                        <span className="text-amber-400 font-bold" title="High">
                          {day.high}H
                        </span>
                      )}
                      {day.medium > 0 && (
                        <span className="text-yellow-400" title="Medium">
                          {day.medium}M
                        </span>
                      )}
                      {day.low > 0 && (
                        <span className="text-cyan-400" title="Low">
                          {day.low}L
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Heatmap Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="text-slate-500">Frequency Scale:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" />
              <span>0 (Nominal)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-800" />
              <span>1 (Low)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-950 border border-amber-800" />
              <span>2-3 (Moderate)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-950 border border-rose-800" />
              <span>4+ (Elevated)</span>
            </div>
          </div>
          <div className="text-slate-500 font-sans">
            Source: AEGIS-X Ingested Telemetry & Incident Ledger
          </div>
        </div>
      </div>

      {/* =========================================================================
          LIVE OPERATIONS & TELEMETRY FEED (CHRONOLOGICAL INCIDENT EVENTS)
          ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Operations & Telemetry Stream
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological operational events: fault injections, alerts, investigations, mitigations, and verifications
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Presentation Pause Toggle */}
            <button
              onClick={() => setFeedPaused(!feedPaused)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                feedPaused
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
              title="Pauses UI stream updates without altering backend monitoring"
            >
              {feedPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{feedPaused ? 'Resume Presentation' : 'Pause Stream'}</span>
            </button>

            {/* Severity Filter */}
            <select
              value={feedSeverityFilter}
              onChange={(e) => setFeedSeverityFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
            </select>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter events..."
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
              />
            </div>
          </div>
        </div>

        {/* Stream List */}
        <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/50">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              No operational events match current filter criteria.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const date = new Date(evt.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const isCrit = evt.severity === 'CRITICAL';
              const isHigh = evt.severity === 'HIGH';

              return (
                <div
                  key={evt.id}
                  onClick={() => setInspectedEvent(evt)}
                  className="p-3 hover:bg-slate-900/50 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {timeStr}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                        isCrit
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {evt.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-300 truncate">
                      {evt.summary}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {evt.incidentId && (
                      <span className="text-[10px] font-mono text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded">
                        [{evt.incidentId}]
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Payload
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Event Payload Inspector Modal */}
      {inspectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-slate-700 bg-[#0B101D] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Event Payload Inspector</h3>
              </div>
              <button
                onClick={() => setInspectedEvent(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Event ID:</span>
                  <span className="text-slate-300">{inspectedEvent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-300">
                    {new Date(inspectedEvent.timestamp).toISOString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Event Type:</span>
                  <span className="text-cyan-300">{inspectedEvent.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Origin / Author:</span>
                  <span className="text-slate-300">{inspectedEvent.author}</span>
                </div>
                {(inspectedEvent.data || inspectedEvent.details) && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 block mb-1">Data Payload:</span>
                    <pre className="text-[10px] text-cyan-400 overflow-x-auto p-2 bg-slate-900 rounded">
                      {JSON.stringify(inspectedEvent.data || { details: inspectedEvent.details }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                {inspectedEvent.summary}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectedEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
