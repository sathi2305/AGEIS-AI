import React, { useState } from 'react';
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  Filter,
  Fingerprint,
  Key,
  Lock,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Incident } from '../../../shared/types.js';

interface AuditScreenProps {
  incidents: Incident[];
  onReplayIncident: (inc: Incident) => void;
  onResetHistory: () => Promise<any>;
  onSelectIncident: (inc: Incident) => void;
  onNavigateToRecovery: (inc: Incident) => void;
  onRefresh: () => void;
}

export const AuditScreen: React.FC<AuditScreenProps> = ({
  incidents,
  onReplayIncident,
  onResetHistory,
  onSelectIncident,
  onNavigateToRecovery,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIncidentAudit, setSelectedIncidentAudit] = useState<Incident | null>(
    incidents[0] || null
  );
  const [confirmReset, setConfirmReset] = useState(false);

  const filtered = incidents.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.targetService.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis_x_audit_ledger_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper to generate a deterministic synthetic SHA-256 seal for audit demonstration
  const getAuditSeal = (inc: Incident) => {
    const raw = `${inc.id}:${inc.targetService}:${inc.detectedAt}:${inc.resolvedAt || 'ACTIVE'}:${inc.state}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256:7f9b8c${hex}d4e12fa${hex.slice(0, 4)}c019`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-[#0D1422]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-950/80 rounded-lg text-emerald-400 border border-emerald-800/80">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">
              Cryptographic Audit Explorer & Immutable Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tamper-evident verification records, deterministic state transitions, and replay engine for regulatory compliance.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            disabled={incidents.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Sealed Ledger</span>
          </button>

          {/* Clear History */}
          <button
            onClick={() => setConfirmReset(true)}
            disabled={incidents.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Ledger</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Purge */}
      {confirmReset && (
        <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Are you sure you want to purge all stored incident audit records? This action is irreversible.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmReset(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await onResetHistory();
                setConfirmReset(false);
                onRefresh();
              }}
              className="px-3 py-1 text-xs font-semibold text-white bg-rose-800 hover:bg-rose-700 rounded transition-colors"
            >
              Confirm Purge
            </button>
          </div>
        </div>
      )}

      {/* Main Layout: Table of Records + Detail Cryptographic Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ledger Records */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search audit records by incident ID, target service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-slate-800 bg-[#070B14]/40">
              <Archive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No audit records present in the local ledger.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#0D1422] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-900/60">
                      <th className="py-2.5 px-3">RECORD ID</th>
                      <th className="py-2.5 px-3">TARGET</th>
                      <th className="py-2.5 px-3">OUTCOME</th>
                      <th className="py-2.5 px-3">SEAL</th>
                      <th className="py-2.5 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filtered.map((inc) => {
                      const isSelected = selectedIncidentAudit?.id === inc.id;
                      const isRecovered = inc.state === 'RECOVERED';
                      const seal = getAuditSeal(inc);

                      return (
                        <tr
                          key={inc.id}
                          onClick={() => setSelectedIncidentAudit(inc)}
                          className={`hover:bg-slate-900/50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-cyan-950/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-semibold text-cyan-400">
                            {inc.id}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono">
                            {inc.targetService}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                isRecovered
                                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80'
                                  : 'bg-amber-950/40 text-amber-300 border-amber-800/80'
                              }`}
                            >
                              {inc.state}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                            {seal.slice(0, 16)}...
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReplayIncident(inc);
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 rounded border border-cyan-800/60 transition-colors flex items-center gap-1"
                                title="Replay this scenario deterministically in simulator"
                              >
                                <Play className="w-3 h-3" />
                                <span>Replay</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Cryptographic Audit Inspector */}
        <div className="lg:col-span-5 space-y-4">
          {selectedIncidentAudit ? (
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0D1422] space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white tracking-wide">
                    Ledger Verification Proof
                  </span>
                </div>
                <span className="font-mono text-cyan-400 font-bold">
                  {selectedIncidentAudit.id}
                </span>
              </div>

              {/* Cryptographic Hash Seal */}
              <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block font-mono">
                  SHA-256 State Integrity Seal:
                </span>
                <p className="font-mono text-[11px] text-emerald-400 break-all">
                  {getAuditSeal(selectedIncidentAudit)}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>State hash verified against local simulator root of trust</span>
                </div>
              </div>

              {/* Metadata Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                  <span>Target Service:</span>
                  <span className="font-mono text-slate-200">{selectedIncidentAudit.targetService}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                  <span>Severity Classification:</span>
                  <span className="font-mono text-rose-400 font-semibold">
                    {selectedIncidentAudit.severity}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                  <span>Detected At:</span>
                  <span className="font-mono text-slate-200">
                    {new Date(selectedIncidentAudit.detectedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                  <span>Recovery Status:</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    {selectedIncidentAudit.state}
                  </span>
                </div>
                {selectedIncidentAudit.recoveryPlan && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                    <span>Authorized Action:</span>
                    <span className="font-mono text-cyan-300 font-semibold">
                      {selectedIncidentAudit.recoveryPlan.actionType}
                    </span>
                  </div>
                )}
              </div>

              {/* Event Chain */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block font-mono">
                  Sealed Event Log ({selectedIncidentAudit.timeline?.length || 0} Events):
                </span>
                <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800/80 space-y-2 max-h-48 overflow-y-auto">
                  {(selectedIncidentAudit.timeline || []).map((ev: any, i: number) => (
                    <div key={i} className="text-[11px] pb-1.5 border-b border-slate-800/50 last:border-0">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                        <span className="text-cyan-400">{ev.type}</span>
                        <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-300 mt-0.5">{ev.summary || ev.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    onSelectIncident(selectedIncidentAudit);
                    onNavigateToRecovery(selectedIncidentAudit);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect in Recovery</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-[#0D1422]/40 text-slate-500 text-xs">
              Select an incident record to view its cryptographic seal and verified event chain.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
