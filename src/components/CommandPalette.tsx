import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Command,
  Database,
  Flame,
  History,
  Layers,
  Lock,
  MessageSquare,
  Network,
  RotateCcw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Terminal,
  Zap,
} from 'lucide-react';
import { ChaosScenarioConfig, Incident, ServiceId } from '../../shared/types.js';
import { NavTab } from './Sidebar.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  incidents: Incident[];
  scenarios: ChaosScenarioConfig[];
  onSelectIncident: (inc: Incident) => void;
  onInjectFault: (data: {
    scenarioId: string;
    scenarioName: string;
    targetService: ServiceId;
    intensity: number;
  }) => Promise<any>;
  onResetSimulator: () => Promise<void>;
  onOpenEmergencyStop: () => void;
  onOpenGuidedDemo: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  category: 'NAVIGATION' | 'INCIDENT' | 'CHAOS' | 'SYSTEM';
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  incidents,
  scenarios,
  onSelectIncident,
  onInjectFault,
  onResetSimulator,
  onOpenEmergencyStop,
  onOpenGuidedDemo,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build items list
  const navItems: PaletteItem[] = [
    {
      id: 'nav_overview',
      title: 'Go to System Overview',
      category: 'NAVIGATION',
      shortcut: 'G O',
      icon: <Activity className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onNavigate('overview');
        onClose();
      },
    },
    {
      id: 'nav_topology',
      title: 'Go to Topology Dependency Graph',
      category: 'NAVIGATION',
      shortcut: 'G T',
      icon: <Network className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onNavigate('topology');
        onClose();
      },
    },
    {
      id: 'nav_telemetry',
      title: 'Go to Live Telemetry & Metrics',
      category: 'NAVIGATION',
      shortcut: 'G M',
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onNavigate('telemetry');
        onClose();
      },
    },
    {
      id: 'nav_incidents',
      title: 'Go to Incident Queue',
      category: 'NAVIGATION',
      shortcut: 'G I',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      action: () => {
        onNavigate('incidents');
        onClose();
      },
    },
    {
      id: 'nav_investigation',
      title: 'Go to Root-Cause Investigation',
      category: 'NAVIGATION',
      shortcut: 'G V',
      icon: <Search className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onNavigate('investigation');
        onClose();
      },
    },
    {
      id: 'nav_recovery',
      title: 'Go to Autonomous Recovery Center',
      category: 'NAVIGATION',
      shortcut: 'G R',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onNavigate('recovery');
        onClose();
      },
    },
    {
      id: 'nav_approvals',
      title: 'Go to Human Approval Inbox',
      category: 'NAVIGATION',
      shortcut: 'G P',
      icon: <CheckCircle2 className="w-4 h-4 text-amber-400" />,
      action: () => {
        onNavigate('approvals');
        onClose();
      },
    },
    {
      id: 'nav_chaos',
      title: 'Go to Chaos Engineering Lab',
      category: 'NAVIGATION',
      shortcut: 'G C',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      action: () => {
        onNavigate('chaos-lab');
        onClose();
      },
    },
    {
      id: 'nav_analytics',
      title: 'Go to Reliability Analytics (MTTD / MTTR)',
      category: 'NAVIGATION',
      shortcut: 'G A',
      icon: <BarChart3 className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onNavigate('analytics');
        onClose();
      },
    },
    {
      id: 'nav_timeline',
      title: 'Go to Event Timeline & Activity Stream',
      category: 'NAVIGATION',
      shortcut: 'G L',
      icon: <Clock className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onNavigate('timeline');
        onClose();
      },
    },
    {
      id: 'nav_runbooks',
      title: 'Go to SRE Runbook Library',
      category: 'NAVIGATION',
      shortcut: 'G B',
      icon: <Layers className="w-4 h-4 text-violet-400" />,
      action: () => {
        onNavigate('runbooks');
        onClose();
      },
    },
    {
      id: 'nav_audit',
      title: 'Go to Cryptographic Audit Explorer',
      category: 'NAVIGATION',
      shortcut: 'G H',
      icon: <History className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onNavigate('audit');
        onClose();
      },
    },
    {
      id: 'nav_settings',
      title: 'Go to Safety Policy Governance Settings',
      category: 'NAVIGATION',
      shortcut: 'G S',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      action: () => {
        onNavigate('settings');
        onClose();
      },
    },
  ];

  const systemItems: PaletteItem[] = [
    {
      id: 'sys_demo',
      title: 'Start 13-Step Guided Evaluation Stepper',
      category: 'SYSTEM',
      shortcut: 'DEMO',
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onOpenGuidedDemo();
        onClose();
      },
    },
    {
      id: 'sys_reset',
      title: 'Reset Entire Cluster to Nominal 100% Health',
      category: 'SYSTEM',
      shortcut: 'RESET',
      icon: <RotateCcw className="w-4 h-4 text-emerald-400" />,
      action: async () => {
        await onResetSimulator();
        onClose();
      },
    },
    {
      id: 'sys_emergency_stop',
      title: 'Engage Safety Emergency Stop Interlock',
      category: 'SYSTEM',
      shortcut: 'STOP',
      icon: <Lock className="w-4 h-4 text-rose-400" />,
      action: () => {
        onOpenEmergencyStop();
        onClose();
      },
    },
  ];

  const chaosItems: PaletteItem[] = scenarios.map((s) => ({
    id: `chaos_${s.id}`,
    title: `Inject Chaos: ${s.name} (${s.targetService})`,
    category: 'CHAOS',
    icon: <Flame className="w-4 h-4 text-amber-400" />,
    action: async () => {
      await onInjectFault({
        scenarioId: s.id,
        scenarioName: s.name,
        targetService: s.targetService,
        intensity: 8,
      });
      onNavigate('recovery');
      onClose();
    },
  }));

  const incidentItems: PaletteItem[] = incidents.slice(0, 8).map((inc) => ({
    id: `inc_${inc.id}`,
    title: `Inspect [${inc.id}] ${inc.title}`,
    category: 'INCIDENT',
    shortcut: inc.severity,
    icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
    action: () => {
      onSelectIncident(inc);
      onNavigate('recovery');
      onClose();
    },
  }));

  const allItems = [...navItems, ...systemItems, ...chaosItems, ...incidentItems];

  const filteredItems = allItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[580px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, navigate screens, or search incidents..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownList}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
          />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching commands or incidents found.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-cyan-950/70 text-white border border-cyan-800/60'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">{item.icon}</div>
                    <span className="font-medium">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800">
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Dismiss</span>
          </div>
          <span>AEGIS-X Command Gateway</span>
        </div>
      </div>
    </div>
  );
};
