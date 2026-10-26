import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Filter,
  Layers,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Incident, PolicySettings, ServiceId } from '../../../shared/types.js';

interface ApprovalsScreenProps {
  incidents: Incident[];
  settings: PolicySettings;
  onApproveAndExecute: (incidentId: string) => Promise<any>;
  onRejectPlan: (incidentId: string, reason?: string) => Promise<any>;
  onRunDryRun: (incidentId: string) => Promise<any>;
  onSelectIncident: (inc: Incident) => void;
  onNavigateToRecovery: (inc: Incident) => void;
  onRefresh: () => void;
}

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({
  incidents,
  settings,
  onApproveAndExecute,
  onRejectPlan,
  onRunDryRun,
  onSelectIncident,
  onNavigateToRecovery,
  onRefresh,
}) => {
  const [filterState, setFilterState] = useState<'PENDING' | 'RESOLVED' | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter for incidents requiring approval or with planned recovery
  const pendingApprovals = incidents.filter(
    (inc) => inc.state === 'AWAITING_APPROVAL' || (inc.recoveryPlan && inc.state === 'RECOVERY_PLANNED')
  );

  const resolvedApprovals = incidents.filter(
    (inc) => inc.state === 'EXECUTING' || inc.state === 'VERIFYING' || inc.state === 'RECOVERED' || inc.state === 'CANCELLED'
  );

  const displayedList =
    filterState === 'PENDING'
      ? pendingApprovals
      : filterState === 'RESOLVED'
      ? resolvedApprovals
      : incidents.filter((i) => i.recoveryPlan);

  const filtered = displayedList.filter(
    (inc) =>
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.id.toLowerCase().includes(search.toLowerCase()) ||
      inc.targetService.toLowerCase().includes(search.toLowerCase()) ||
      (inc.recoveryPlan?.actionType || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await onApproveAndExecute(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason) return;
    setProcessingId(id);
    try {
      await onRejectPlan(id, rejectReason);
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-[#0D1422]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/80 rounded-lg text-cyan-400 border border-cyan-800/80">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Human-in-the-Loop Recovery Approval Inbox
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic policy gating. High-risk and structural recovery plans require SRE operator authorization.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Policy Mode:</span>
            <span className="font-mono text-cyan-400 font-semibold">
              {settings.requireApprovalAlways
                ? 'STRICT (Always)'
                : `THRESHOLD (${settings.autoApprovalThreshold})`}
            </span>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-lg border border-slate-800 w-fit">
          <button
            onClick={() => setFilterState('PENDING')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterState === 'PENDING'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending Gating ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setFilterState('RESOLVED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterState === 'RESOLVED'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Approved / Executed ({resolvedApprovals.length})
          </button>
          <button
            onClick={() => setFilterState('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterState === 'ALL'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Plans
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search proposals by ID, service, action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Proposals List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-[#070B14]/40">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-semibold text-slate-200">No Pending Approvals</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterState === 'PENDING'
              ? 'All active recovery plans have satisfied safety constraints or were resolved. The cluster operates within automated policy bounds.'
              : 'No recovery records matching the current search criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((inc) => {
            const plan = inc.recoveryPlan;
            const risk = plan?.riskScore;
            const isPending = inc.state === 'AWAITING_APPROVAL' || inc.state === 'RECOVERY_PLANNED';
            const isCritical = inc.severity === 'CRITICAL';

            const riskBg =
              risk?.level === 'HIGH'
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/80'
                : risk?.level === 'MEDIUM'
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/80'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80';

            return (
              <div
                key={inc.id}
                className={`p-5 rounded-xl border transition-all ${
                  isPending
                    ? 'border-amber-900/60 bg-[#0D1422] shadow-lg shadow-amber-950/10'
                    : 'border-slate-800 bg-[#0D1422]/60'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left Column: Metadata & Incident Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-cyan-400 font-semibold">[{inc.id}]</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300 font-medium">{inc.targetService}</span>
                      <span className="text-slate-600">·</span>
                      <span
                        className={`font-semibold ${
                          isCritical ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-slate-400">
                        {new Date(inc.detectedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white tracking-wide">
                      {inc.title}
                    </h3>

                    {plan && (
                      <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800/80 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Proposed Action:</span>
                            <span className="font-mono font-semibold text-cyan-300">
                              {plan.actionType}
                            </span>
                          </div>
                          {risk && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Risk Assessment:</span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${riskBg}`}>
                                {risk.level} ({risk.score}/100)
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          {plan.description}
                        </p>

                        {/* Preconditions */}
                        {plan.preconditions && plan.preconditions.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/60">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1">
                              Verified Safety Preconditions:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {plan.preconditions.map((prec, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-mono"
                                >
                                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                  {prec}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
                    {/* View Details / RCA */}
                    <button
                      onClick={() => {
                        onSelectIncident(inc);
                        onNavigateToRecovery(inc);
                      }}
                      className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review In Center</span>
                    </button>

                    {/* Dry Run */}
                    {isPending && (
                      <button
                        onClick={async () => {
                          setProcessingId(inc.id);
                          try {
                            await onRunDryRun(inc.id);
                          } finally {
                            setProcessingId(null);
                          }
                        }}
                        disabled={processingId === inc.id}
                        className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-800/80 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Dry Run</span>
                      </button>
                    )}

                    {/* Reject */}
                    {isPending && (
                      <button
                        onClick={() => {
                          setRejectingId(inc.id);
                          setRejectReason('Operator policy discretion / alternative runbook required');
                        }}
                        disabled={processingId === inc.id}
                        className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {/* Approve & Execute */}
                    {isPending && (
                      <button
                        onClick={() => handleApprove(inc.id)}
                        disabled={processingId === inc.id}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/70 hover:bg-emerald-800 border border-emerald-700/80 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-sm shadow-emerald-950 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Authorize & Execute</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Reject Dialog inline */}
                {rejectingId === inc.id && (
                  <div className="mt-4 p-3 rounded-lg bg-rose-950/30 border border-rose-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs text-rose-300 font-semibold">
                      <span>Provide Rejection Reason for Audit Trail:</span>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#070B14] border border-rose-900/80 rounded text-slate-200 placeholder-slate-500 focus:outline-none"
                      placeholder="e.g. Action risk too high, preferring manual service restart..."
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(inc.id)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-rose-800 hover:bg-rose-700 rounded"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
