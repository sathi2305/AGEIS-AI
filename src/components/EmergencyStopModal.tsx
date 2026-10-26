import React from 'react';
import { AlertOctagon, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { SimulatorState } from '../../shared/types.js';

interface EmergencyStopModalProps {
  simulatorState: SimulatorState;
  onClose: () => void;
  onTriggerStop: () => Promise<any>;
  onResetStop: () => Promise<any>;
}

export const EmergencyStopModal: React.FC<EmergencyStopModalProps> = ({
  simulatorState,
  onClose,
  onTriggerStop,
  onResetStop,
}) => {
  const isStopped = simulatorState.emergencyStop;

  const handleAction = async () => {
    if (isStopped) {
      await onResetStop();
    } else {
      await onTriggerStop();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-rose-900/80 rounded-xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-950 rounded-lg text-rose-400 border border-rose-800">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isStopped ? 'Reset Emergency Interlock' : 'Confirm Emergency Stop (E-STOP)'}
              </h3>
              <span className="text-xs text-rose-400 font-mono">SAFETY HARNESS DIRECTIVE</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {isStopped ? (
            <>
              Emergency Stop is currently <strong className="text-rose-400">ENGAGED</strong>.
              All active fault injections have been purged and traffic is locked in safe mode. Resetting the interlock will return the cluster to nominal routing state.
            </>
          ) : (
            <>
              You are about to trip the physical <strong className="text-rose-400">Emergency Stop Interlock</strong>. This action will:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                <li>Immediately purge all active chaos injections.</li>
                <li>Trip all circuit breakers across the 7 microservices.</li>
                <li>Throttle ingress traffic to minimum safety thresholds (50 RPS).</li>
                <li>Halt and reject any in-flight or proposed autonomous recovery plans.</li>
              </ul>
            </>
          )}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAction}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-lg ${
              isStopped
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950 animate-pulse'
            }`}
          >
            {isStopped ? <RotateCcw className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
            {isStopped ? 'Disengage Interlock' : 'TRIP EMERGENCY STOP'}
          </button>
        </div>
      </div>
    </div>
  );
};
