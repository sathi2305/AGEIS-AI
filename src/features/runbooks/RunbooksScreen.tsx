import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode,
  Flame,
  Layers,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ChaosScenarioConfig, Incident, ServiceId } from '../../../shared/types.js';

interface RunbooksScreenProps {
  scenarios: ChaosScenarioConfig[];
  incidents: Incident[];
  onInjectFault: (data: {
    scenarioId: string;
    scenarioName: string;
    targetService: ServiceId;
    intensity: number;
  }) => Promise<any>;
  onNavigateToRecovery: () => void;
}

interface RunbookItem {
  id: string;
  code: string;
  title: string;
  targetService: ServiceId;
  category: 'AVAILABILITY' | 'PERFORMANCE' | 'RESOURCE' | 'DATA';
  estimatedMttrSec: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  automationStatus: 'FULLY_AUTOMATED' | 'HUMAN_APPROVAL_GATED';
  symptoms: string[];
  preconditions: string[];
  remediationSteps: string[];
  verificationCriteria: string[];
  rollbackProcedure: string;
  matchingScenarioId?: string;
}

const RUNBOOKS: RunbookItem[] = [
  {
    id: 'rb-001',
    code: 'RB-PAY-01',
    title: 'Payment Gateway Pod Eviction & Replica Failover',
    targetService: 'payment-service',
    category: 'AVAILABILITY',
    estimatedMttrSec: 15,
    riskLevel: 'MEDIUM',
    automationStatus: 'HUMAN_APPROVAL_GATED',
    symptoms: [
      '500 Internal Server Error rate > 25%',
      'Downstream order-service transactions blocked in pending state',
      'Telemetry probe timeout > 1,500ms',
    ],
    preconditions: [
      'Database ledger connection is responsive',
      'No active database transaction migration in progress',
      'At least 1 standby node has available memory quota',
    ],
    remediationSteps: [
      'Drain inbound HTTP requests from degraded payment-service instance',
      'Spin up warm replica with verified healthy health check endpoint',
      'Switch service mesh virtual router to route 100% traffic to healthy replica',
      'Terminate degraded container and capture core dump for diagnostics',
    ],
    verificationCriteria: [
      'Error rate drops below 1% for 3 consecutive evaluation cycles',
      'P95 latency recovers below 200ms',
      'Simulated payment charge transactions succeed with 200 OK',
    ],
    rollbackProcedure:
      'If failover replica fails health probe within 10s, activate Circuit Breaker mock stub to return HTTP 429 with retry-after header to preserve ledger consistency.',
    matchingScenarioId: 'scenario-payment-crash',
  },
  {
    id: 'rb-002',
    code: 'RB-DB-02',
    title: 'Cascading Database Connection Pool Saturation',
    targetService: 'database',
    category: 'RESOURCE',
    estimatedMttrSec: 20,
    riskLevel: 'HIGH',
    automationStatus: 'HUMAN_APPROVAL_GATED',
    symptoms: [
      'Database connection pool utilization > 95%',
      'P99 latency across payment-service and inventory-service > 800ms',
      'Transaction timeout errors in server logs',
    ],
    preconditions: [
      'Database replica replication lag < 1.5 seconds',
      'No deadlocks detected in active transaction table',
    ],
    remediationSteps: [
      'Terminate idle connections older than 30 seconds',
      'Dynamically scale max pool connections from 50 to 100 on primary node',
      'Route read-only queries to database replica',
    ],
    verificationCriteria: [
      'Active connection pool utilization drops below 60%',
      'P99 database transaction latency returns to nominal (<120ms)',
    ],
    rollbackProcedure:
      'Immediately revert max connection pool ceiling to baseline (50) and engage rate limiting at API Gateway.',
    matchingScenarioId: 'scenario-db-pool-exhaustion',
  },
  {
    id: 'rb-003',
    code: 'RB-AUTH-03',
    title: 'Authentication Service Token Flooding & Cache Throttling',
    targetService: 'auth-service',
    category: 'PERFORMANCE',
    estimatedMttrSec: 10,
    riskLevel: 'LOW',
    automationStatus: 'FULLY_AUTOMATED',
    symptoms: [
      'Auth verification latency spike > 450ms',
      'Redis token cache memory pressure > 85%',
      'Client session validation queue depth expanding',
    ],
    preconditions: [
      'API Gateway public key verification signature remains valid',
    ],
    remediationSteps: [
      'Evict expired token sessions from Redis in-memory cache',
      'Enable client-side JWT caching for 120 seconds',
      'Apply leaky bucket rate limiting on /auth/verify endpoint',
    ],
    verificationCriteria: [
      'Auth response latency stabilizes under 80ms',
      'Cache memory pressure drops below 50%',
    ],
    rollbackProcedure:
      'Disable client-side JWT caching and reset rate limiter to permissive mode.',
    matchingScenarioId: 'scenario-auth-spike',
  },
  {
    id: 'rb-004',
    code: 'RB-INV-04',
    title: 'Inventory Service Memory Leak & Worker Restart',
    targetService: 'inventory-service',
    category: 'RESOURCE',
    estimatedMttrSec: 12,
    riskLevel: 'LOW',
    automationStatus: 'FULLY_AUTOMATED',
    symptoms: [
      'Memory consumption steadily climbing past 90% threshold',
      'Garbage collection pause duration > 300ms',
      'Container risk of imminent OOMKilled state',
    ],
    preconditions: [
      'Database inventory lock records are cleared',
      'Redundant inventory pod is active and listening on port 8084',
    ],
    remediationSteps: [
      'Trigger graceful worker process recycling',
      'Purge in-memory SKU reservation cache',
      'Rehydrate cache from authoritative database catalog',
    ],
    verificationCriteria: [
      'Process memory drops back to baseline (<150MB)',
      'GC pause times return to <20ms',
    ],
    rollbackProcedure:
      'If process restart hangs past 8s, force SIGKILL and boot fresh container image.',
    matchingScenarioId: 'scenario-inventory-oom',
  },
];

export const RunbooksScreen: React.FC<RunbooksScreenProps> = ({
  scenarios,
  incidents,
  onInjectFault,
  onNavigateToRecovery,
}) => {
  const [selectedRunbook, setSelectedRunbook] = useState<RunbookItem>(RUNBOOKS[0]);
  const [search, setSearch] = useState('');
  const [executing, setExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const filteredRunbooks = RUNBOOKS.filter(
    (rb) =>
      rb.title.toLowerCase().includes(search.toLowerCase()) ||
      rb.code.toLowerCase().includes(search.toLowerCase()) ||
      rb.targetService.toLowerCase().includes(search.toLowerCase()) ||
      rb.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSimulateFailureAndRunbook = async (rb: RunbookItem) => {
    setExecuting(true);
    setExecutionMessage(null);
    try {
      if (rb.matchingScenarioId) {
        await onInjectFault({
          scenarioId: rb.matchingScenarioId,
          scenarioName: `${rb.title} (Triggered from Runbook ${rb.code})`,
          targetService: rb.targetService,
          intensity: 8,
        });
        setExecutionMessage(
          `Fault injected into ${rb.targetService}! Incident created and matched against ${rb.code}. Navigate to Recovery Center to execute remediation.`
        );
      }
    } catch (err: any) {
      setExecutionMessage(`Execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-[#0D1422]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-violet-950/80 rounded-lg text-violet-400 border border-violet-800/80">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">
              Site Reliability Engineering (SRE) Runbook Library
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Standardized remediation procedures, pre-flight safety boundaries, and verification criteria for distributed failure modes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            Catalogued Runbooks: <span className="text-cyan-400 font-semibold">{RUNBOOKS.length}</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Runbook Selection List + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Runbooks */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search runbooks by code, title, service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-2">
            {filteredRunbooks.map((rb) => {
              const isSelected = selectedRunbook.id === rb.id;
              return (
                <div
                  key={rb.id}
                  onClick={() => setSelectedRunbook(rb)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-800/80 bg-cyan-950/30 shadow-md shadow-cyan-950/20'
                      : 'border-slate-800 bg-[#0D1422] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-cyan-400 font-semibold">{rb.code}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        rb.riskLevel === 'HIGH'
                          ? 'bg-rose-950/40 text-rose-300 border-rose-800/80'
                          : rb.riskLevel === 'MEDIUM'
                          ? 'bg-amber-950/40 text-amber-300 border-amber-800/80'
                          : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80'
                      }`}
                    >
                      {rb.riskLevel} RISK
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-white leading-snug">
                    {rb.title}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-mono">
                    <span>Target: {rb.targetService}</span>
                    <span>·</span>
                    <span>Est. MTTR: ~{rb.estimatedMttrSec}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Runbook Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-xl border border-slate-800 bg-[#0D1422] space-y-5">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-cyan-400 font-bold text-sm">
                    {selectedRunbook.code}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 font-mono">{selectedRunbook.targetService}</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300 font-semibold">{selectedRunbook.category}</span>
                </div>
                <h3 className="text-base font-semibold text-white mt-1">
                  {selectedRunbook.title}
                </h3>
              </div>

              {/* Action */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateFailureAndRunbook(selectedRunbook)}
                  disabled={executing}
                  className="px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/80 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-sm shadow-cyan-950"
                  title="Inject test failure to execute this runbook in simulator"
                >
                  <Flame className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{executing ? 'Simulating...' : 'Simulate Failure'}</span>
                </button>
              </div>
            </div>

            {/* Notification alert if triggered */}
            {executionMessage && (
              <div className="p-3 rounded-lg bg-cyan-950/50 border border-cyan-800/80 text-xs text-cyan-200 flex items-center justify-between">
                <span>{executionMessage}</span>
                <button
                  onClick={onNavigateToRecovery}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-cyan-800 hover:bg-cyan-700 rounded transition-colors flex items-center gap-1"
                >
                  <span>Go to Recovery</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Symptoms */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                1. Observable Failure Symptoms:
              </span>
              <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800/80 space-y-1">
                {selectedRunbook.symptoms.map((sym, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-rose-300 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                    <span>{sym}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preconditions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                2. Mandatory Safety Preconditions:
              </span>
              <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800/80 space-y-1">
                {selectedRunbook.preconditions.map((prec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-emerald-300 font-mono">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{prec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Remediation Steps */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                3. Automated Remediation Workflow:
              </span>
              <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800/80 space-y-2">
                {selectedRunbook.remediationSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                    <span className="font-mono text-cyan-400 font-bold text-[11px]">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Criteria & Rollback */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                  4. Verification Criteria:
                </span>
                <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800/80 space-y-1 text-xs text-slate-300">
                  {selectedRunbook.verificationCriteria.map((crit, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{crit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                  5. Rollback Procedure:
                </span>
                <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-mono">
                  {selectedRunbook.rollbackProcedure}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
