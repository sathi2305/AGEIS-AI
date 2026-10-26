import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  FileSearch,
  HelpCircle,
  Layers,
  Network,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Incident, RootCauseHypothesis, ServiceId } from '../../../shared/types.js';

interface InvestigationScreenProps {
  incidents: Incident[];
  currentIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
  onNavigateToRecovery: (inc: Incident) => void;
  onRerunInvestigation: (incId: string) => void;
}

export const InvestigationScreen: React.FC<InvestigationScreenProps> = ({
  incidents,
  currentIncident,
  onSelectIncident,
  onNavigateToRecovery,
  onRerunInvestigation,
}) => {
  const activeOrRecent = incidents.length > 0 ? (currentIncident || incidents[0]) : null;

  if (!activeOrRecent) {
    return (
      <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <FileSearch className="w-12 h-12 text-slate-500 mx-auto" />
        <h3 className="text-base font-semibold text-white">No Incidents Available for Investigation</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The system is currently operating in nominal state with no active failures. Trigger a chaos scenario in the Chaos Lab to generate an incident and explore the root-cause reasoning engine.
        </p>
      </div>
    );
  }

  const investigation = activeOrRecent.investigation;

  return (
    <div className="space-y-6">
      {/* Investigation Workspace Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              Root-Cause Investigation Workspace
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {activeOrRecent.id}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic causal correlation across dependency topology, sliding-window metric deltas, and stdout traces
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Incident Selector */}
          <select
            value={activeOrRecent.id}
            onChange={(e) => {
              const found = incidents.find((i) => i.id === e.target.value);
              if (found) onSelectIncident(found);
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {incidents.map((i) => (
              <option key={i.id} value={i.id}>
                [{i.id}] {i.severity} · {i.targetService} ({i.state})
              </option>
            ))}
          </select>

          <button
            onClick={() => onRerunInvestigation(activeOrRecent.id)}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-run Scoring
          </button>
        </div>
      </div>

      {investigation ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Primary Root Cause & Formula Breakdown */}
          <div className="lg:col-span-7 space-y-5">
            {/* Primary Hypothesis Card */}
            <div className="p-5 rounded-xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 to-slate-900/90 shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      RANK #1 ROOT CAUSE HYPOTHESIS
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Target: {investigation.primaryRootCause.serviceId}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-2">
                    {investigation.primaryRootCause.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {investigation.primaryRootCause.mechanism}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-extrabold font-mono text-cyan-400 tabular-nums">
                    {investigation.primaryRootCause.confidence}%
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    Confidence Score
                  </span>
                </div>
              </div>

              {/* Confidence Score Breakdown Formula */}
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Documented Scoring Algorithm Breakdown:</span>
                  <span className="font-mono text-[11px] text-cyan-400">
                    S = w_origin + w_delta + w_log - w_hop
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono tabular-nums">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Root Bonus</span>
                    <span className="text-white font-semibold">
                      +{investigation.primaryRootCause.scoreBreakdown.originWeight}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Metric Delta</span>
                    <span className="text-white font-semibold">
                      +{investigation.primaryRootCause.scoreBreakdown.metricDeviation}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Log Signature</span>
                    <span className="text-white font-semibold">
                      +{investigation.primaryRootCause.scoreBreakdown.logSignatureMatch}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Cascade Penalty</span>
                    <span className="text-amber-400 font-semibold">
                      -{investigation.primaryRootCause.scoreBreakdown.cascadeHopPenalty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explanation Text */}
              <p className="text-xs text-slate-300 leading-relaxed font-sans bg-indigo-950/20 p-3 rounded border border-indigo-900/40">
                {investigation.confidenceExplanation}
              </p>

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Recommended Action: <strong className="text-white">{investigation.primaryRootCause.recommendedActionType}</strong>
                </span>
                <button
                  onClick={() => onNavigateToRecovery(activeOrRecent)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-900/40"
                >
                  Proceed to Recovery Planning
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alternative Hypotheses */}
            {investigation.alternativeHypotheses.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Alternative Causal Hypotheses Evaluated ({investigation.alternativeHypotheses.length})
                </h4>
                <div className="space-y-2">
                  {investigation.alternativeHypotheses.map((alt) => (
                    <div
                      key={alt.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 font-bold">
                            #{alt.rank}
                          </span>
                          <span className="text-xs font-semibold text-white">{alt.title}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({alt.serviceId})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{alt.mechanism}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-slate-300">
                          {alt.confidence}%
                        </span>
                        <span className="text-[10px] text-slate-500 block">Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Ranked Evidence Cards & Downstream Cascade */}
          <div className="lg:col-span-5 space-y-5">
            {/* Ranked Evidence Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Ranked Evidence Artifacts ({investigation.primaryRootCause.evidenceList.length})</span>
                <span className="text-[11px] text-slate-500">Live Telemetry Proof</span>
              </h4>

              <div className="space-y-2.5">
                {investigation.primaryRootCause.evidenceList.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{ev.metric}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          ev.significance === 'PRIMARY'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {ev.significance}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {ev.description}
                    </p>

                    <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-800/60">
                      <span className="text-slate-500">
                        Baseline: <span className="text-slate-300">{ev.baselineValue}</span>
                      </span>
                      <span className="text-slate-500">
                        Observed:{' '}
                        <span className="text-rose-400 font-bold">{ev.observedValue}</span>
                      </span>
                    </div>

                    {/* Deviation score progress */}
                    <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${ev.deviationScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Failure Cascade Flow */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                Impacted Dependency Cascade Path
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Failure originated at <strong>{investigation.primaryRootCause.serviceId}</strong> and propagated upward across the call graph:
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-mono">
                {investigation.affectedDependencyChain.map((svc, idx) => (
                  <React.Fragment key={svc}>
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-200 rounded">
                      {svc}
                    </span>
                    {idx < investigation.affectedDependencyChain.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Uncertainty & Missing Evidence Notes */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Uncertainty & Observation Limitations
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {investigation.uncertaintyNotes}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/60">
          <p className="text-xs text-slate-400">
            Investigation report pending or not yet generated for this incident.
          </p>
        </div>
      )}
    </div>
  );
};
