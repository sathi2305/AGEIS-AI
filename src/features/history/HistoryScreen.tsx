import React, { useState } from 'react';
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Download,
  Play,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Incident } from '../../../shared/types.js';

interface HistoryScreenProps {
  incidents: Incident[];
  onReplayIncident: (inc: Incident) => void;
  onResetHistory: () => Promise<any>;
  onSelectIncident: (inc: Incident) => void;
  onRefresh: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  incidents,
  onReplayIncident,
  onResetHistory,
  onSelectIncident,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const filtered = incidents.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.targetService.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis_x_incidents_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-cyan-400" />
            Audit History & Deterministic Scenario Replay
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically sealed incident audit records, causal evidence, and deterministic replay runner
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            disabled={incidents.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit JSON
          </button>

          {/* Reset History */}
          <button
            onClick={() => setConfirmReset(true)}
            disabled={incidents.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search historical incidents by ID, title, or service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* History Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No incident records in history. Run a chaos scenario to generate verifiable records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">ID & Date</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Incident Title</th>
                  <th className="px-4 py-3">Target Service</th>
                  <th className="px-4 py-3">Applied Action</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3 text-right">Deterministic Replay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-cyan-400 block">{inc.id}</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(inc.detectedAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          inc.severity === 'CRITICAL'
                            ? 'text-rose-400'
                            : inc.severity === 'HIGH'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-white font-medium">{inc.title}</td>
                    <td className="px-4 py-3 text-slate-300 font-sans">{inc.targetService}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {inc.recoveryPlan?.actionType || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          inc.state === 'RECOVERED'
                            ? 'text-emerald-400'
                            : inc.state === 'CANCELLED'
                            ? 'text-slate-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {inc.state === 'RECOVERED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {inc.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReplayIncident(inc);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-cyan-900/60 text-slate-200 hover:text-cyan-200 border border-slate-700 rounded transition-colors text-xs font-sans flex items-center gap-1 ml-auto"
                      >
                        <Play className="w-3 h-3 text-cyan-400" />
                        Replay Scenario
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Reset Dialog */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Reset All Incident History?</h3>
            <p className="text-xs text-slate-400">
              This will permanently purge all recorded incident logs, investigation dossiers, and audit timelines from persistent storage.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmReset(false);
                  await onResetHistory();
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
              >
                Confirm Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
