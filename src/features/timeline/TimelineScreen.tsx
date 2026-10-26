import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSearch,
  Filter,
  Flame,
  Layers,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Incident, IncidentEvent, ServiceId, SimulatorState } from '../../../shared/types.js';

interface TimelineScreenProps {
  incidents: Incident[];
  simulatorState: SimulatorState;
  onSelectIncident: (inc: Incident) => void;
  onNavigateToRecovery: (inc: Incident) => void;
  onRefresh: () => void;
}

interface FlattenedTimelineItem {
  id: string;
  incidentId: string;
  incidentTitle: string;
  targetService: ServiceId;
  timestamp: number;
  type: string;
  author: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  data?: any;
}

export const TimelineScreen: React.FC<TimelineScreenProps> = ({
  incidents,
  simulatorState,
  onSelectIncident,
  onNavigateToRecovery,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterService, setFilterService] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Flatten all events across incidents
  const allEvents: FlattenedTimelineItem[] = [];

  incidents.forEach((inc) => {
    (inc.timeline || []).forEach((ev: IncidentEvent, idx: number) => {
      let sev: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' = 'INFO';
      if (ev.type.includes('DETECTED') || ev.type.includes('TRIGGERED') || ev.type.includes('FAILED')) {
        sev = inc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
      } else if (ev.type.includes('RECOVERED') || ev.type.includes('VERIFIED')) {
        sev = 'LOW';
      } else if (ev.type.includes('APPROVAL') || ev.type.includes('EXECUTING')) {
        sev = 'MEDIUM';
      }

      allEvents.push({
        id: `${inc.id}-${idx}-${ev.timestamp}`,
        incidentId: inc.id,
        incidentTitle: inc.title,
        targetService: inc.targetService,
        timestamp: ev.timestamp,
        type: ev.type,
        author: ev.author,
        message: ev.summary || (ev as any).message || 'Operational event recorded',
        severity: sev,
        data: (ev as any).data || (ev as any).details,
      });
    });
  });

  // Sort descending by timestamp
  allEvents.sort((a, b) => b.timestamp - a.timestamp);

  const filteredEvents = allEvents.filter((ev) => {
    if (filterType !== 'ALL' && !ev.type.toLowerCase().includes(filterType.toLowerCase())) {
      return false;
    }
    if (filterService !== 'ALL' && ev.targetService !== filterService) {
      return false;
    }
    if (
      search &&
      !ev.message.toLowerCase().includes(search.toLowerCase()) &&
      !ev.incidentId.toLowerCase().includes(search.toLowerCase()) &&
      !ev.author.toLowerCase().includes(search.toLowerCase()) &&
      !ev.targetService.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getEventIcon = (type: string) => {
    if (type.includes('DETECT') || type.includes('ALERT')) {
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    }
    if (type.includes('INVESTIGAT') || type.includes('ROOT_CAUSE')) {
      return <FileSearch className="w-4 h-4 text-cyan-400" />;
    }
    if (type.includes('APPROVAL')) {
      return <Shield className="w-4 h-4 text-amber-400" />;
    }
    if (type.includes('EXECUTE') || type.includes('DRY_RUN')) {
      return <Zap className="w-4 h-4 text-indigo-400" />;
    }
    if (type.includes('VERIF') || type.includes('RECOVER')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-[#0D1422]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-950/80 rounded-lg text-indigo-400 border border-indigo-800/80">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">
              Cluster Event Timeline & Operations Stream
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              High-resolution chronological log of simulator faults, alerts, autonomous decisions, and SRE operator interventions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            Total Logged Events: <span className="text-cyan-400 font-semibold">{allEvents.length}</span>
          </span>
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Refresh Timeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilterType('DETECT')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterType === 'DETECT'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Detections
            </button>
            <button
              onClick={() => setFilterType('INVESTIGAT')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterType === 'INVESTIGAT'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Investigations
            </button>
            <button
              onClick={() => setFilterType('EXECUTE')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterType === 'EXECUTE'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Executions
            </button>
            <button
              onClick={() => setFilterType('VERIF')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterType === 'VERIF'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Verifications
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search timeline events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-[#070B14]/40">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">No Events Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Events generated during fault injection, incident correlation, root cause scoring, and recovery verification will appear here chronologically.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 border-l border-slate-800/80 space-y-4 ml-4">
          {filteredEvents.map((ev) => {
            const matchedIncident = incidents.find((i) => i.id === ev.incidentId);

            return (
              <div key={ev.id} className="relative group">
                {/* Node indicator */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#0D1422] border-2 border-slate-700 flex items-center justify-center group-hover:border-cyan-400 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>

                <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0D1422] hover:border-slate-700 transition-colors">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-slate-900 border border-slate-800">
                        {getEventIcon(ev.type)}
                      </span>
                      <span className="font-mono text-cyan-400 font-semibold">{ev.type}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">Author:</span>
                      <span className="font-mono text-slate-300 font-medium">{ev.author}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400 font-mono">
                        {ev.targetService}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                      {matchedIncident && (
                        <button
                          onClick={() => {
                            onSelectIncident(matchedIncident);
                            onNavigateToRecovery(matchedIncident);
                          }}
                          className="px-2 py-0.5 text-[11px] text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 rounded border border-cyan-800/60 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Incident</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 mt-2 font-sans leading-relaxed">
                    {ev.message}
                  </p>

                  {/* Incident context tag */}
                  <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Incident: [{ev.incidentId}] {ev.incidentTitle}</span>
                    {ev.data && (
                      <span className="text-slate-600 truncate max-w-xs">
                        {JSON.stringify(ev.data).slice(0, 60)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
