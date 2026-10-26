import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Flame,
  Layers,
  Lock,
  MessageSquare,
  Play,
  RotateCcw,
  Server,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  StopCircle,
  Terminal,
  Zap,
} from 'lucide-react';
import { ChaosScenarioConfig, ServiceId, SimulatorState } from '../../../shared/types.js';

interface ChaosLabScreenProps {
  scenarios: ChaosScenarioConfig[];
  simulatorState: SimulatorState;
  onInjectFault: (data: {
    scenarioId: string;
    scenarioName: string;
    targetService: ServiceId;
    intensity: number;
  }) => Promise<any>;
  onClearFault: (faultId?: string) => Promise<any>;
  onResetSimulator: () => Promise<any>;
  onRunGuidedDemo: () => void;
}

export const ChaosLabScreen: React.FC<ChaosLabScreenProps> = ({
  scenarios,
  simulatorState,
  onInjectFault,
  onClearFault,
  onResetSimulator,
  onRunGuidedDemo,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<ChaosScenarioConfig | null>(
    scenarios[0] || null
  );
  const [intensity, setIntensity] = useState<number>(7);
  const [targetOverride, setTargetOverride] = useState<ServiceId | ''>('');
  const [injecting, setInjecting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeFaults = simulatorState.activeFaults;

  const handleInject = async (sc: ChaosScenarioConfig) => {
    setInjecting(true);
    setFeedback(null);
    try {
      const res = await onInjectFault({
        scenarioId: sc.id,
        scenarioName: sc.name,
        targetService: (targetOverride as ServiceId) || sc.targetService,
        intensity,
      });
      setFeedback(`Injected ${sc.name} successfully. Detection engine triggered.`);
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setInjecting(false);
    }
  };

  const getScenarioIcon = (cat: string) => {
    switch (cat) {
      case 'CRASH':
        return <StopCircle className="w-5 h-5 text-rose-400" />;
      case 'SATURATION':
        return <Database className="w-5 h-5 text-amber-400" />;
      case 'LATENCY':
        return <Activity className="w-5 h-5 text-purple-400" />;
      case 'BACKLOG':
        return <MessageSquare className="w-5 h-5 text-pink-400" />;
      case 'CONFIG':
        return <Lock className="w-5 h-5 text-blue-400" />;
      case 'OUTAGE':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      default:
        return <Flame className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            Chaos Engineering & Fault Injection Laboratory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Test resilience limits with deterministic fault injection against the 7 simulated microservices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRunGuidedDemo}
            className="px-4 py-2 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-950/50"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Guided Demo Sequence
          </button>

          <button
            onClick={() => onClearFault()}
            disabled={activeFaults.length === 0}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-40"
          >
            Clear Active Faults ({activeFaults.length})
          </button>

          <button
            onClick={onResetSimulator}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset System
          </button>
        </div>
      </div>

      {/* Active Faults Alert Strip */}
      {activeFaults.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Active Simulated Injections ({activeFaults.length})
            </span>
            <button
              onClick={() => onClearFault()}
              className="text-xs text-rose-300 hover:text-white underline"
            >
              Neutralize All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {activeFaults.map((f) => (
              <div
                key={f.id}
                className="p-2.5 bg-slate-950/80 rounded border border-rose-900/60 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{f.scenarioName}</span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Target: {f.targetService} (Intensity: {f.intensity}/10)
                  </span>
                </div>
                <button
                  onClick={() => onClearFault(f.id)}
                  className="px-2 py-1 text-[11px] bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded"
                >
                  Stop
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback banner */}
      {feedback && (
        <div className="p-3 bg-cyan-950/60 border border-cyan-800 rounded-lg text-xs text-cyan-200 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc) => {
          const isSelected = selectedScenario?.id === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenario(sc)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-cyan-500 bg-slate-900/90 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80'
              } flex flex-col justify-between space-y-4`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getScenarioIcon(sc.category)}
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {sc.category}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">{sc.targetService}</span>
                </div>

                <h3 className="text-sm font-semibold text-white">{sc.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{sc.description}</p>
              </div>

              {/* Observable effects */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Expected System Effects:
                </span>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  {sc.expectedObservableEffects.slice(0, 2).map((eff, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400">•</span>
                      <span>{eff}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInject(sc);
                  }}
                  disabled={injecting}
                  className="w-full py-2 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-200 hover:border-rose-800/80 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Inject Fault
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Scenario Customization Panel */}
      {selectedScenario && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                Parameter Customization
              </span>
              <h3 className="text-base font-semibold text-white mt-1">
                Configure {selectedScenario.name}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Default Target: {selectedScenario.targetService}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Fault Intensity: <strong className="text-white">{intensity} / 10</strong>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Higher intensity causes steeper cascade slopes and rapid resource depletion.
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Target Microservice</label>
              <select
                value={targetOverride || selectedScenario.targetService}
                onChange={(e) => setTargetOverride(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
              >
                <option value="payment-service">payment-service</option>
                <option value="database">database</option>
                <option value="inventory-service">inventory-service</option>
                <option value="auth-service">auth-service</option>
                <option value="order-service">order-service</option>
                <option value="message-queue">message-queue</option>
                <option value="api-gateway">api-gateway</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => handleInject(selectedScenario)}
              disabled={injecting}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/50"
            >
              <Flame className="w-4 h-4" />
              Launch Chaos Attack
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
