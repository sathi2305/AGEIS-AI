import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,

  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  Network,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Split,
  Terminal,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Incident, IncidentSeverity, IncidentState } from '../../../shared/types.js';
import { api } from '../../services/api.js';


interface IncidentsScreenProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident | null) => void;
  onNavigateToRecovery: (inc: Incident) => void;
  onNavigateToInvestigation: (inc: Incident) => void;
  onRefresh: () => void;
}

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onNavigateToRecovery,
  onNavigateToInvestigation,
  onRefresh,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filtered = incidents.filter((inc) => {
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (statusFilter === 'ACTIVE' && (inc.state === 'RECOVERED' || inc.state === 'CANCELLED'))
      return false;
    if (statusFilter === 'RESOLVED' && inc.state !== 'RECOVERED') return false;
    if (
      search &&
      !inc.title.toLowerCase().includes(search.toLowerCase()) &&
      !inc.id.toLowerCase().includes(search.toLowerCase()) &&
      !inc.targetService.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="font-semibold text-rose-400">CRITICAL</span>;
      case 'HIGH':
        return <span className="font-semibold text-amber-400">HIGH</span>;
      case 'MEDIUM':
        return <span className="font-semibold text-yellow-400">MEDIUM</span>;
      case 'LOW':
        return <span className="font-semibold text-cyan-400">LOW</span>;
    }
  };

  const getStateBadge = (state: IncidentState) => {
    const isSuccess = state === 'RECOVERED';
    const isWarning =
      state === 'AWAITING_APPROVAL' ||
      state === 'INVESTIGATING' ||
      state === 'RECOVERY_PLANNED' ||
      state === 'EXECUTING' ||
      state === 'VERIFYING';
    const isDanger = state === 'FAILED' || state === 'ESCALATED';

    const color = isSuccess
      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
      : isWarning
      ? 'text-amber-300 bg-amber-950/40 border-amber-800/60'
      : isDanger
      ? 'text-rose-400 bg-rose-950/40 border-rose-800/60'
      : 'text-slate-400 bg-slate-900 border-slate-800';

    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${color}`}>
        {state}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Reliability Incident Queue ({filtered.length})
          </h2>
          <p className="text-xs text-slate-400">
            Detected anomalies, autonomous triage reports and recovery state tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by title, ID or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Severity tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  severityFilter === s
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All States</option>
            <option value="ACTIVE">Active (In Flight)</option>
            <option value="RESOLVED">Resolved Only</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Incidents Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              There are currently no active or historical incidents matching your filters. The distributed system is healthy.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Incident ID</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Summary & Trigger</th>
                  <th className="px-4 py-3">Target Service</th>
                  <th className="px-4 py-3">Detected</th>
                  <th className="px-4 py-3">Lifecycle State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      selectedIncident?.id === inc.id ? 'bg-cyan-950/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-cyan-400">{inc.id}</td>
                    <td className="px-4 py-3">{getSeverityBadge(inc.severity)}</td>
                    <td className="px-4 py-3 font-sans">
                      <div className="font-medium text-white">{inc.title}</div>
                      <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                        Trigger: {inc.triggerMetric} = {inc.triggerValue} (Threshold: {inc.threshold})
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-sans">{inc.targetService}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(inc.detectedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">{getStateBadge(inc.state)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident(inc);
                          onNavigateToRecovery(inc);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-cyan-900/60 text-slate-200 hover:text-cyan-200 border border-slate-700 hover:border-cyan-700 rounded transition-colors text-xs font-sans font-medium"
                      >
                        Recovery Center →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Detail Drawer */}
      {selectedIncident && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{selectedIncident.id}</h3>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(selectedIncident.detectedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">{selectedIncident.title}</div>
              </div>
            </div>
            <button
              onClick={() => onSelectIncident(null)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Quick status bar */}
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Status:</span>
                {getStateBadge(selectedIncident.state)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Severity:</span>
                {getSeverityBadge(selectedIncident.severity)}
              </div>
            </div>

            {/* Root-cause Summary Card */}
            {selectedIncident.investigation && (
              <div className="p-3.5 rounded-lg border border-indigo-900/60 bg-indigo-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Investigated Root Cause (#1 Ranked)
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {selectedIncident.investigation.primaryRootCause.confidence}% Confidence
                  </span>
                </div>
                <p className="text-xs text-white font-medium">
                  {selectedIncident.investigation.primaryRootCause.title}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedIncident.investigation.primaryRootCause.mechanism}
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => onNavigateToInvestigation(selectedIncident)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                  >
                    View Full Investigation Workspace →
                  </button>
                </div>
              </div>
            )}

            {/* Downstream Blast Radius Analysis */}
            {selectedIncident.blastRadius && (
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-cyan-400" />
                    Downstream Blast Radius Analysis
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                      selectedIncident.blastRadius.blastRadiusScore === 'CRITICAL'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                        : selectedIncident.blastRadius.blastRadiusScore === 'HIGH'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                        : 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80'
                    }`}
                  >
                    {selectedIncident.blastRadius.blastRadiusScore} RADIUS
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Direct Dependents</span>
                    <span className="font-semibold text-slate-200">
                      {selectedIncident.blastRadius.directAffectedServices.length > 0
                        ? selectedIncident.blastRadius.directAffectedServices.join(', ')
                        : 'None (Leaf)'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Est. RPS Impact</span>
                    <span className="font-semibold text-rose-400 tabular-nums">
                      {selectedIncident.blastRadius.estimatedRpsImpact} req/s
                    </span>
                  </div>
                </div>
                {selectedIncident.blastRadius.propagationPaths.length > 0 && (
                  <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                    <span className="text-slate-500 block text-[10px] uppercase">Propagation Paths:</span>
                    {selectedIncident.blastRadius.propagationPaths.map((p, i) => (
                      <div key={i} className="text-cyan-300/80 truncate">
                        ⚡ {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Correlated Linked Alerts Cluster */}
            {selectedIncident.linkedAlerts && selectedIncident.linkedAlerts.length > 0 && (
              <div className="p-3.5 rounded-lg border border-purple-900/60 bg-purple-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    Correlated Alerts ({selectedIncident.linkedAlerts.length} grouped)
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await api.splitIncident(selectedIncident.id);
                        onRefresh();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-purple-300 hover:text-white bg-purple-900/40 hover:bg-purple-800 border border-purple-700 transition-colors flex items-center gap-1"
                    title="Split grouped alerts into distinct incident records"
                  >
                    <Split className="w-3 h-3" />
                    Split Incident
                  </button>
                </div>
                <p className="text-[11px] text-slate-300">
                  Incident correlation engine deduplicated cascading alerts into this primary ticket to avoid alert fatigue.
                </p>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {selectedIncident.linkedAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-2 bg-slate-950/80 rounded border border-purple-900/40 flex justify-between items-start gap-2"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {alert.serviceId}: {alert.metric}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {alert.correlationReason}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-rose-400 shrink-0 tabular-nums">
                        {alert.observedValue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Proposed Recovery Plan */}
            {selectedIncident.recoveryPlan && (
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Formulated Recovery Action
                  </span>
                  <span className="text-xs font-mono text-cyan-400">
                    {selectedIncident.recoveryPlan.actionType}
                  </span>
                </div>
                <p className="text-xs text-white font-medium">
                  {selectedIncident.recoveryPlan.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {selectedIncident.recoveryPlan.description}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => onNavigateToRecovery(selectedIncident)}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    Open in Recovery Center
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Verification Report */}
            {selectedIncident.verificationReport && (
              <div
                className={`p-3.5 rounded-lg border ${
                  selectedIncident.verificationReport.passed
                    ? 'border-emerald-900/60 bg-emerald-950/20'
                    : 'border-rose-900/60 bg-rose-950/20'
                } space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Fresh Telemetry Verification
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      selectedIncident.verificationReport.passed
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {selectedIncident.verificationReport.outcome}
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  {selectedIncident.verificationReport.summary}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1 text-slate-300">
                  <div>
                    Error: {selectedIncident.verificationReport.actuals.errorRatePct}%
                  </div>
                  <div>
                    Lat: {selectedIncident.verificationReport.actuals.latencyP95Ms}ms
                  </div>
                  <div>
                    Health: {selectedIncident.verificationReport.actuals.health}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Events */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Lifecycle Audit Timeline ({selectedIncident.timeline.length} events)
              </h4>
              <div className="space-y-3 pl-3 border-l-2 border-slate-800">
                {selectedIncident.timeline.map((evt) => (
                  <div key={evt.id} className="relative space-y-1">
                    <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-500 ring-4 ring-slate-900" />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{evt.type}</span>
                      <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium">{evt.summary}</p>
                    {evt.details && (
                      <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                        {evt.details}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-500 block">
                      Author: {evt.author}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs text-slate-500">AEGIS-X Verified Incident Record</span>
            <button
              onClick={() => onSelectIncident(null)}
              className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
