import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  Sliders,
  UserCheck,
  Zap,
} from 'lucide-react';
import { PolicySettings } from '../../../shared/types.js';

interface SettingsScreenProps {
  settings: PolicySettings;
  onUpdateSettings: (newSettings: Partial<PolicySettings>) => Promise<any>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [formData, setFormData] = useState<PolicySettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Safety Governance Policies & Orchestrator Thresholds
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure autonomous boundaries, approval gates, verification windows, and anomaly sensitivity
          </p>
        </div>

        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
        >
          {saved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved Successfully' : 'Apply Policy Updates'}
        </button>
      </div>

      {/* Autonomous Approval Governance */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">
            Human-in-the-Loop & Autonomous Execution Gates
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-300 block mb-1 font-medium">
              Autonomous Auto-Remediation Ceiling
            </label>
            <select
              value={formData.autoApprovalThreshold}
              onChange={(e) =>
                setFormData({ ...formData, autoApprovalThreshold: e.target.value as any })
              }
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none"
            >
              <option value="LOW">LOW Only (Safe transient blips)</option>
              <option value="MEDIUM">MEDIUM (Pod restarts, token refreshes)</option>
              <option value="HIGH">HIGH (Aggressive auto-recovery)</option>
              <option value="CRITICAL">CRITICAL (Zero human gate - Fully Autonomous)</option>
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Incidents exceeding this severity require explicit human operator sign-off in the Recovery Center.
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={formData.requireApprovalAlways}
                onChange={(e) =>
                  setFormData({ ...formData, requireApprovalAlways: e.target.checked })
                }
                className="w-4 h-4 accent-cyan-500 rounded"
              />
              Strict Manual Mode (Always Require Human Approval)
            </label>
            <span className="text-[11px] text-slate-500 mt-1 ml-6">
              When checked, no recovery action will ever execute autonomously without human confirmation.
            </span>
          </div>
        </div>
      </div>

      {/* Detection & Anomaly Thresholds */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">
            Detection Sensitivity & Anomaly Boundaries
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-300 block mb-1 font-sans">
              Error Rate SLA Threshold (%):
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.errorThresholdPct}
              onChange={(e) =>
                setFormData({ ...formData, errorThresholdPct: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block font-sans">
              Default: 5% error triggers anomaly detection.
            </span>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-sans">
              p95 Latency SLA Threshold (ms):
            </label>
            <input
              type="number"
              min="50"
              max="5000"
              step="50"
              value={formData.latencyThresholdMs}
              onChange={(e) =>
                setFormData({ ...formData, latencyThresholdMs: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block font-sans">
              Default: 350ms triggers SLA breach alert.
            </span>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-sans">
              Circuit Breaker Trip Rate (%):
            </label>
            <input
              type="number"
              min="10"
              max="90"
              value={formData.circuitBreakerThresholdPct}
              onChange={(e) =>
                setFormData({ ...formData, circuitBreakerThresholdPct: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block font-sans">
              Default: 25% trips circuit breaker fallback.
            </span>
          </div>
        </div>
      </div>

      {/* Recovery & Verification Execution Limits */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">
            Verification Window & Retry Margins
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-300 block mb-1 font-sans">
              Closed-Loop Verification Window (Seconds):
            </label>
            <input
              type="number"
              min="3"
              max="30"
              value={formData.verificationWindowSec}
              onChange={(e) =>
                setFormData({ ...formData, verificationWindowSec: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block font-sans">
              Time the orchestrator observes fresh telemetry before certifying RECOVERED state.
            </span>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-sans">
              Maximum Bounded Retries:
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.maxRetriesAllowed}
              onChange={(e) =>
                setFormData({ ...formData, maxRetriesAllowed: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block font-sans">
              After reaching this limit, incident escalates to on-call engineering.
            </span>
          </div>
        </div>
      </div>
    </form>
  );
};
