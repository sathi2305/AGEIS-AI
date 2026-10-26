import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,

  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import { Incident, RecoveryPlan } from '../../../shared/types.js';

interface RecoveryScreenProps {
  incidents: Incident[];
  currentIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
  onRunDryRun: (incId: string) => Promise<any>;
  onApproveAndExecute: (incId: string) => Promise<any>;
  onRejectPlan: (incId: string, reason: string) => Promise<any>;
  onRefresh: () => void;
}

export const RecoveryScreen: React.FC<RecoveryScreenProps> = ({
  incidents,
  currentIncident,
  onSelectIncident,
  onRunDryRun,
  onApproveAndExecute,
  onRejectPlan,
  onRefresh,
}) => {
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [selectedPlanTab, setSelectedPlanTab] = useState<'PRIMARY' | 'ALTERNATIVE'>('PRIMARY');

  const activeOrRecent = incidents.length > 0 ? (currentIncident || incidents[0]) : null;

  if (!activeOrRecent) {
    return (
      <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-base font-semibold text-white">No Active Recovery Required</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          All 7 microservices in the cluster are operating at nominal capacity. Go to the Chaos Lab to inject a fault and observe the closed-loop recovery orchestrator.
        </p>
      </div>
    );
  }

  const plan =
    activeOrRecent.planComparison && selectedPlanTab === 'ALTERNATIVE'
      ? activeOrRecent.planComparison.alternativePlan
      : activeOrRecent.recoveryPlan;


  const handleDryRun = async () => {
    try {
      const res = await onRunDryRun(activeOrRecent.id);
      setDryRunResult(res);
    } catch (err: any) {
      alert(`Dry run failed: ${err.message}`);
    }
  };

  const handleConfirmApproval = async () => {
    setShowApprovalModal(false);
    setIsExecuting(true);
    try {
      await onApproveAndExecute(activeOrRecent.id);
    } catch (err: any) {
      alert(`Execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConfirmReject = async () => {
    setShowRejectModal(false);
    try {
      await onRejectPlan(activeOrRecent.id, rejectReason || 'Operator manual veto');
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">
              Autonomous Recovery Operations Center
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {activeOrRecent.id}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic remediation engine with safety governance, dry-run simulation, and fresh-telemetry verification
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
        </div>
      </div>

      {/* Post-Recovery Telemetry Watch Window Banner */}
      {(activeOrRecent.watchWindow || activeOrRecent.state === 'RECOVERED') && (
        <div className="p-4 rounded-xl border border-emerald-800/80 bg-emerald-950/30 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-900/60 text-emerald-400 border border-emerald-700/60 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white flex items-center gap-2">
                <span>Autonomous Post-Recovery Telemetry Watch Window</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h4>
              <p className="text-emerald-300/80 text-[11px] mt-0.5">
                Active 10s regression observation window · 0 Latent Faults · Closed-loop telemetry stable
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="px-2.5 py-1 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700 text-[11px] font-bold tracking-wider uppercase">
              STATUS: SUSTAINED NOMINAL
            </span>
          </div>
        </div>
      )}

      {/* Candidate Plan Comparison Tabs */}
      {activeOrRecent.planComparison && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Remediation Options:
            </span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
              <button
                onClick={() => setSelectedPlanTab('PRIMARY')}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedPlanTab === 'PRIMARY'
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Primary: {activeOrRecent.planComparison.primaryPlan.actionType} (Recommended)
              </button>
              <button
                onClick={() => setSelectedPlanTab('ALTERNATIVE')}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedPlanTab === 'ALTERNATIVE'
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Alternative: {activeOrRecent.planComparison.alternativePlan.actionType}
              </button>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Comparing 2 deterministic strategies
          </span>
        </div>
      )}

      {plan ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Proposed Plan & Safety Checks */}
          <div className="lg:col-span-7 space-y-5">
            {/* Proposed Recovery Action Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold">
                      {plan.actionType}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Target: <strong className="text-white">{plan.targetService}</strong>
                    </span>
                    {selectedPlanTab === 'PRIMARY' ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ORCHESTRATOR CHOICE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                        CONSERVATIVE ALTERNATIVE
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-white mt-2">{plan.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{plan.description}</p>
                </div>
                <div className="text-right font-mono text-xs text-slate-400">
                  <span>Est. Time: </span>
                  <span className="text-white font-semibold">{plan.estimatedRecoveryTimeSec}s</span>
                </div>
              </div>

              {/* Tradeoff Summary */}
              {activeOrRecent.planComparison && (
                <div className="p-3 bg-cyan-950/30 rounded-lg border border-cyan-800/50 text-xs space-y-1">
                  <span className="font-semibold text-cyan-300 block">Strategy Tradeoff Analysis:</span>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    {activeOrRecent.planComparison.tradeoffSummary}
                  </p>
                </div>
              )}

              {/* Recovery Operational Risk Score */}
              {plan.riskScore && (
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                      Operational Risk Assessment
                    </span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] border ${
                        plan.riskScore.level === 'CRITICAL'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                          : plan.riskScore.level === 'HIGH'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                          : plan.riskScore.level === 'MEDIUM'
                          ? 'bg-yellow-950/80 text-yellow-300 border-yellow-800/80'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                      }`}
                    >
                      RISK: {plan.riskScore.level} ({plan.riskScore.score}/100)
                    </span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {plan.riskScore.factors.map((f, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-slate-400 gap-1">
                        <span>• {f.name}:</span>
                        <span className="text-slate-300 font-sans text-[11px]">{f.impact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expected Impact */}
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs space-y-1">
                <span className="font-semibold text-slate-300 block">Projected System Impact:</span>
                <p className="text-slate-400 leading-relaxed font-sans">{plan.expectedImpact}</p>
              </div>

              {/* Rollback Strategy */}
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 block">Fallback & Rollback Strategy:</span>
                  <span className="text-[10px] font-mono text-emerald-400">ROLLBACK READY</span>
                </div>
                <p className="text-slate-400 leading-relaxed font-sans">{plan.rollbackPlan}</p>
              </div>


              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDryRun}
                  className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Run Dry-Run Simulation
                </button>

                {activeOrRecent.state !== 'RECOVERED' && activeOrRecent.state !== 'CANCELLED' && (
                  <>
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      disabled={isExecuting}
                      className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-900/40 disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {isExecuting ? 'Executing & Verifying...' : 'Approve & Execute Action'}
                    </button>

                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/50 rounded-lg transition-colors"
                    >
                      Reject Plan
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Dry Run Output */}
            {dryRunResult && (
              <div className="p-4 rounded-xl border border-cyan-800/60 bg-cyan-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    Dry-Run Pre-Flight Validation Passed
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">ZERO_MUTATIONS</span>
                </div>
                <p className="text-xs text-slate-300">{dryRunResult.message}</p>
                <div className="space-y-1 font-mono text-[11px] text-slate-400 pt-1">
                  {dryRunResult.details?.map((d: string, i: number) => (
                    <div key={i}>✓ {d}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Policy Check Matrix */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Safety Governance & Precondition Gate ({plan.safetyChecks.length} checks)
              </h4>
              <div className="space-y-2">
                {plan.safetyChecks.map((check, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        {check.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        {check.name}
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{check.reason}</p>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        check.passed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {check.passed ? 'PASSED' : 'BLOCKED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Execution Record & Closed-Loop Verification */}
          <div className="lg:col-span-5 space-y-5">
            {/* Verification Status Card */}
            <div
              className={`p-5 rounded-xl border ${
                activeOrRecent.verificationReport
                  ? activeOrRecent.verificationReport.passed
                    ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 to-slate-900/90'
                    : 'border-rose-500/50 bg-gradient-to-br from-rose-950/30 to-slate-900/90'
                  : 'border-slate-800 bg-slate-900/70'
              } shadow-lg space-y-4`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Closed-Loop Telemetry Verification
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    activeOrRecent.verificationReport?.passed
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                      : activeOrRecent.verificationReport
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {activeOrRecent.verificationReport?.outcome || activeOrRecent.state}
                </span>
              </div>

              {activeOrRecent.verificationReport ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {activeOrRecent.verificationReport.summary}
                  </p>

                  <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Post-Action Error Rate:</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          activeOrRecent.verificationReport.actuals.errorRatePct <= 2.0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {activeOrRecent.verificationReport.actuals.errorRatePct}% (Threshold: ≤ 2.0%)
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">p95 Latency:</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          activeOrRecent.verificationReport.actuals.latencyP95Ms <= 150
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {activeOrRecent.verificationReport.actuals.latencyP95Ms}ms (Threshold: ≤ 150ms)
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Container Health Heartbeat:</span>
                      <span
                        className={`font-semibold ${
                          activeOrRecent.verificationReport.actuals.health === 'healthy'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {activeOrRecent.verificationReport.actuals.health.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans italic">
                    {activeOrRecent.verificationReport.recommendation}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto animate-spin" />
                  <p>Awaiting plan execution to collect fresh verification telemetry...</p>
                </div>
              )}
            </div>

            {/* Execution Audit Log */}
            {activeOrRecent.executionRecord && (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Execution Audit Trail
                </h4>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1">
                  <div>Status: {activeOrRecent.executionRecord.success ? 'SUCCESS' : 'FAILURE'}</div>
                  <div>Message: {activeOrRecent.executionRecord.resultMessage}</div>
                  <div className="pt-1 text-[11px] text-slate-400">
                    {activeOrRecent.executionRecord.logs?.map((l, i) => (
                      <div key={i}>• {l}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/60">
          <p className="text-xs text-slate-400">No recovery plan formulated for this incident.</p>
        </div>
      )}

      {/* Confirmation Modal for Consequential Action */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-950 rounded-lg text-cyan-400 border border-cyan-800">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Authorize Consequential Recovery Action
                </h3>
                <span className="text-xs text-slate-400">Safety Interlock Gate</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              You are about to authorize the autonomous execution of{' '}
              <strong className="text-cyan-400">{plan?.actionType}</strong> targeting{' '}
              <strong className="text-white">{plan?.targetService}</strong>.
            </p>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-400">
              <div>Incident: {activeOrRecent.id}</div>
              <div>Severity: {activeOrRecent.severity}</div>
              <div>Retry Margins: {activeOrRecent.retryCount} / 3</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
              >
                Sign & Authorize Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Reject Recovery Plan</h3>
            <p className="text-xs text-slate-400">
              Provide an engineering rationale for rejecting this plan. The incident will transition to CANCELLED.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Action conflicts with planned scheduled maintenance window..."
              className="w-full h-20 p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
              >
                Confirm Veto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
