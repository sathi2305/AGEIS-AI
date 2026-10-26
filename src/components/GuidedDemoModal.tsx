import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Incident } from '../../shared/types.js';

interface GuidedDemoModalProps {
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onInjectFailure: (scenarioId: string, serviceId: string) => Promise<any>;
  onApproveAndExecuteLatest: () => Promise<any>;
  onResetToHealthy: () => Promise<any>;
  latestIncident: Incident | null;
}

interface DemoStep {
  step: number;
  title: string;
  subtitle: string;
  explanation: string;
  targetTab: string;
  actionButton?: {
    label: string;
    action: () => Promise<void> | void;
  };
}

export const GuidedDemoModal: React.FC<GuidedDemoModalProps> = ({
  onClose,
  onNavigate,
  onInjectFailure,
  onApproveAndExecuteLatest,
  onResetToHealthy,
  latestIncident,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);

  const steps: DemoStep[] = [
    {
      step: 1,
      title: 'Inspect Healthy Distributed Topology',
      subtitle: 'Directed graph of 7 microservices',
      explanation:
        'AEGIS-X models a real 7-node microservice mesh: API Gateway, Auth, Order, Payment, Inventory, Message Queue, and PostgreSQL Database. In nominal state, all edge particles flow smoothly with sub-50ms latency.',
      targetTab: 'topology',
    },
    {
      step: 2,
      title: 'Review Baseline Observability',
      subtitle: 'Nominal sliding-window telemetry',
      explanation:
        'Baseline telemetry demonstrates < 0.2% error rate, nominal database connection usage (34/100), and steady ingress throughput without synthetic jitter.',
      targetTab: 'telemetry',
    },
    {
      step: 3,
      title: 'Inject Deterministic Failure (Payment Service Crash)',
      subtitle: 'Simulating fatal SIGSEGV worker crash',
      explanation:
        'We now trigger a real fault against Payment Service. This immediately ceases heartbeats and induces cascading timeouts on Order Service and API Gateway.',
      targetTab: 'chaos-lab',
      actionButton: {
        label: 'Inject Payment Crash Now',
        action: async () => {
          setBusy(true);
          try {
            await onInjectFailure('crash', 'payment-service');
          } finally {
            setBusy(false);
          }
        },
      },
    },
    {
      step: 4,
      title: 'Observe Live Telemetry Degradation',
      subtitle: 'Real-time spike in error rate and latency',
      explanation:
        'Notice the immediate spike on the Error Rate and p95 Latency charts. Order Service latency climbs to 4000ms+ due to downstream payment socket timeouts.',
      targetTab: 'telemetry',
    },
    {
      step: 5,
      title: 'Autonomous Anomaly Detection',
      subtitle: 'SLA rule breach caught in < 3 seconds',
      explanation:
        'The continuous sliding-window detector captures the threshold breach, grades severity as CRITICAL, and creates a formal incident record without human intervention.',
      targetTab: 'incidents',
    },
    {
      step: 6,
      title: 'Deterministic Root-Cause Investigation',
      subtitle: 'Explainable scoring algorithm & ranked evidence',
      explanation:
        'The investigation engine correlates topological call depth, metric deltas, and stdout crash signatures. Payment Service is ranked #1 with 95%+ confidence based on the documented mathematical scoring formula.',
      targetTab: 'investigation',
    },
    {
      step: 7,
      title: 'Autonomous Recovery Plan Formulation',
      subtitle: 'Safety governance checks & dry run',
      explanation:
        'AEGIS-X formulates a precise remediation plan: RESTART_SERVICE on payment-service with safety checks (allowlist, retry limit, and interlock gates).',
      targetTab: 'recovery',
    },
    {
      step: 8,
      title: 'Human-in-the-Loop Approval Gate',
      subtitle: 'High-severity safety authorization',
      explanation:
        'Because the incident is CRITICAL, policy mandates explicit operator sign-off before applying mutations to the running cluster.',
      targetTab: 'recovery',
    },
    {
      step: 9,
      title: 'Execute Recovery Remediation',
      subtitle: 'Direct local simulator container restart',
      explanation:
        'Upon operator sign-off, the orchestrator triggers the restart primitive, reinitializes the worker memory pool, and tracks execution audit logs.',
      targetTab: 'recovery',
      actionButton: {
        label: 'Sign & Execute Recovery Plan',
        action: async () => {
          setBusy(true);
          try {
            await onApproveAndExecuteLatest();
          } finally {
            setBusy(false);
          }
        },
      },
    },
    {
      step: 10,
      title: 'Closed-Loop Fresh Telemetry Verification',
      subtitle: 'Empirical post-action health validation',
      explanation:
        'An API success response alone never counts as recovery. AEGIS-X observes fresh telemetry over a 6-second window, validating Error Rate ≤ 2.0% and p95 Latency ≤ 150ms before declaring the incident RECOVERED.',
      targetTab: 'recovery',
    },
    {
      step: 11,
      title: 'Review Complete Incident Timeline',
      subtitle: 'Auditable lifecycle trail with timestamps',
      explanation:
        'Every lifecycle transition—Observation, Detection, Investigation, Planning, Approval, Execution, and Verification—is chronologically recorded and persisted.',
      targetTab: 'incidents',
    },
    {
      step: 12,
      title: 'Evaluate SRE Reliability Analytics',
      subtitle: 'MTTD, MTTR and availability calculation',
      explanation:
        'Review the empirical SRE analytics: 2.4s MTTD, 14s MTTR (a 98% reduction vs human 19m baseline), and cumulative downtime saved.',
      targetTab: 'analytics',
    },
    {
      step: 13,
      title: 'Honest Failure Detection Demonstration',
      subtitle: 'Testing ineffective recovery scenarios',
      explanation:
        'To prove integrity, if a recovery action is executed that fails to resolve the underlying fault (or if an attack persists), AEGIS-X honestly reports FAILED or ESCALATED rather than falsely claiming success.',
      targetTab: 'history',
      actionButton: {
        label: 'Reset System to Healthy',
        action: async () => {
          setBusy(true);
          try {
            await onResetToHealthy();
          } finally {
            setBusy(false);
          }
        },
      },
    },
  ];

  const currentStep = steps[currentStepIdx];

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      onNavigate(steps[nextIdx].targetTab);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      onNavigate(steps[prevIdx].targetTab);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-lg bg-slate-900/95 backdrop-blur-md border border-cyan-800/80 rounded-2xl shadow-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-950 rounded-lg text-cyan-400 border border-cyan-800">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              AEGIS-X Guided Evaluation Walkthrough
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">
              Step {currentStep.step} of {steps.length}: {currentStep.title}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
        <div
          className="bg-cyan-500 h-full transition-all duration-300"
          style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Body */}
      <div className="space-y-2 text-xs">
        <h4 className="font-semibold text-white text-sm">{currentStep.subtitle}</h4>
        <p className="text-slate-300 leading-relaxed font-sans">{currentStep.explanation}</p>
      </div>

      {/* Step Specific Action */}
      {currentStep.actionButton && (
        <div className="pt-1">
          <button
            onClick={() => currentStep.actionButton?.action()}
            disabled={busy}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {busy ? 'Executing...' : currentStep.actionButton.label}
          </button>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <button
          onClick={handlePrev}
          disabled={currentStepIdx === 0}
          className="px-3 py-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Previous
        </button>

        <span className="font-mono text-[11px] text-slate-500">
          Target View: <strong className="text-cyan-400 font-sans">{currentStep.targetTab}</strong>
        </span>

        <button
          onClick={handleNext}
          disabled={currentStepIdx === steps.length - 1}
          className="px-3 py-1.5 text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-30 font-medium"
        >
          Next Step
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
