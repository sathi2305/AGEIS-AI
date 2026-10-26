import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  Bell,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
  User,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { Incident, SimulatorState } from '../../shared/types.js';

interface HeaderProps {
  simulatorState: SimulatorState;
  activeIncidentsCount: number;
  pendingApprovalsCount?: number;
  totalServicesCount?: number;
  healthyServicesCount?: number;
  currentTab: string;
  backendConnected: boolean;
  lastUpdated: number;
  recentIncidents?: Incident[];
  onTogglePlayPause: () => void;
  onOpenEmergencyStop: () => void;
  onOpenGuidedDemo: () => void;
  onResetSimulator: () => void;
  onOpenCommandPalette?: () => void;
  onNavigateTab?: (tab: any) => void;
  onSelectIncident?: (inc: Incident) => void;
}

export const Header: React.FC<HeaderProps> = ({
  simulatorState,
  activeIncidentsCount,
  pendingApprovalsCount = 0,
  totalServicesCount = 7,
  healthyServicesCount = 7,
  currentTab,
  backendConnected,
  lastUpdated,
  recentIncidents = [],
  onTogglePlayPause,
  onOpenEmergencyStop,
  onOpenGuidedDemo,
  onResetSimulator,
  onOpenCommandPalette,
  onNavigateTab,
  onSelectIncident,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('aegis_theme') as 'dark' | 'light') || 'dark';
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [freshnessSec, setFreshnessSec] = useState(0);

  // Sync theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aegis_theme', theme);
  }, [theme]);

  // Update freshness counter every second
  useEffect(() => {
    const updateFreshness = () => {
      const diff = Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
      setFreshnessSec(diff);
    };
    updateFreshness();
    const interval = setInterval(updateFreshness, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const getSectionFromTab = (tab: string) => {
    if (['overview', 'topology', 'telemetry'].includes(tab)) return 'Observe';
    if (['incidents', 'investigation'].includes(tab)) return 'Investigate';
    if (['recovery', 'approvals'].includes(tab)) return 'Recover';
    return 'Improve';
  };

  const formatTabName = (tab: string) => {
    switch (tab) {
      case 'overview':
        return 'Overview';
      case 'topology':
        return 'Service Topology';
      case 'telemetry':
        return 'Live Telemetry';
      case 'incidents':
        return 'Incidents';
      case 'investigation':
        return 'Root Cause Analysis';
      case 'recovery':
        return 'Recovery Center';
      case 'approvals':
        return 'Approval Inbox';
      case 'chaos-lab':
        return 'Chaos Lab';
      case 'analytics':
        return 'Experiment Analytics';
      case 'timeline':
        return 'Event Timeline';
      case 'runbooks':
        return 'Runbook Library';
      case 'audit':
        return 'Audit Explorer';
      case 'settings':
        return 'Settings';
      default:
        return tab;
    }
  };

  return (
    <>
      <header className="h-14 border-b border-slate-800 bg-[#070B14]/95 backdrop-blur sticky top-0 z-40 px-4 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark & Breadcrumb */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
              <Shield className="w-4 h-4 fill-cyan-400/20" />
            </div>
            <div className="whitespace-nowrap">
              <span className="font-bold text-sm text-white tracking-wider font-sans">
                AEGIS<span className="text-cyan-400">-X</span>
              </span>
              <span className="hidden xl:inline text-xs text-slate-400 font-normal ml-2">
                Autonomous Reliability Intelligence
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-mono pl-3 border-l border-slate-800">
            <span>Sandbox</span>
            <span>/</span>
            <span className="text-slate-400">{getSectionFromTab(currentTab)}</span>
            <span>/</span>
            <span className="text-cyan-300 font-medium">{formatTabName(currentTab)}</span>
          </div>
        </div>

        {/* Zone 2: Environment Simulator Badge & Global Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md justify-center">
          {/* Simulator Isolated Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400 whitespace-nowrap">
            <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Simulated Sandbox:</span>
            <span className="text-slate-200 font-semibold">Cluster Alpha-01 (Isolated)</span>
          </div>

          {/* Quick Search / Command Palette Launcher */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer w-full max-w-xs"
              title="Open Command Palette (Cmd+K / Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate flex-1 text-left text-slate-400">Search commands, services...</span>
              <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 shrink-0">
                ⌘K
              </span>
            </button>
          )}
        </div>

        {/* Zone 3: Telemetry Freshness, Connection, Demo, Emergency Stop, Theme & Operator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Real Backend Connection Status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono border ${
              backendConnected
                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/60'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/80'
            }`}
            title={backendConnected ? 'Backend simulator connected and responding' : 'Backend connection disconnected'}
          >
            {backendConnected ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-rose-400" />
            )}
            <span>{backendConnected ? `Live (${freshnessSec}s)` : 'Offline'}</span>
          </div>

          {/* Guided Demo Button */}
          <button
            onClick={onOpenGuidedDemo}
            className="px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/80 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm shadow-cyan-950"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Guided Demo</span>
          </button>

          {/* Play/Pause simulator */}
          <button
            onClick={onTogglePlayPause}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            title={simulatorState.running ? 'Pause Simulator' : 'Resume Simulator'}
          >
            {simulatorState.running ? (
              <Pause className="w-4 h-4 text-amber-400" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Reset Simulator to baseline */}
          <button
            onClick={onResetSimulator}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Reset Simulator to Healthy Baseline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Emergency Stop Button */}
          <button
            onClick={onOpenEmergencyStop}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              simulatorState.emergencyStop
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-950'
                : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border-rose-800/80'
            }`}
            title="Emergency Stop: Halt all automated recovery workflows"
          >
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span className="hidden md:inline font-mono">
              {simulatorState.emergencyStop ? 'STOPPED' : 'E-STOP'}
            </span>
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors relative cursor-pointer"
              title="Recent Incident Notifications"
            >
              <Bell className="w-4 h-4" />
              {activeIncidentsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[#0D1422] border border-slate-800 rounded-xl shadow-xl z-50 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-semibold text-white">
                  <span>Incident Notifications</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {recentIncidents.length === 0 ? (
                  <p className="text-slate-500 py-3 text-center">No active or recent alerts.</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {recentIncidents.slice(0, 5).map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => {
                          setShowNotifications(false);
                          if (onSelectIncident) onSelectIncident(inc);
                          if (onNavigateTab) onNavigateTab('incidents');
                        }}
                        className="p-2 rounded-lg bg-[#070B14] hover:bg-slate-900 border border-slate-800/60 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-cyan-400 font-semibold">[{inc.id}]</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-300'
                                : 'bg-amber-950 text-amber-300'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </div>
                        <p className="text-slate-300 truncate">{inc.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Selector Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {/* Operator Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 pl-2 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer text-xs"
              title="Operator Profile"
            >
              <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <User className="w-3 h-3" />
              </div>
              <span className="hidden xl:inline font-mono font-medium">SRE Lead</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0D1422] border border-slate-800 rounded-xl shadow-xl z-50 p-3 space-y-2 text-xs">
                <div className="pb-2 border-b border-slate-800">
                  <div className="font-semibold text-white">SRE On-Call Operator</div>
                  <div className="text-[11px] text-cyan-400 font-mono">Role: Autonomous Gating Lead</div>
                </div>
                <div className="space-y-1 text-slate-400 text-[11px]">
                  <div>Session: Local Sandbox Runtime</div>
                  <div>Policy Level: Standard Safety Check</div>
                  <div>Audit Attribution: ENABLED</div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onNavigateTab) onNavigateTab('settings');
                    }}
                    className="w-full py-1 text-center text-xs text-cyan-300 hover:text-white bg-slate-900 rounded border border-slate-800"
                  >
                    Governance Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Operational Status Strip (Part 2 C) */}
      <div className="h-8 border-b border-slate-800/80 bg-[#090E1A] px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Monitored:</span>
            <span className="text-slate-200 font-semibold tabular-nums">{totalServicesCount} Services</span>
          </div>

          <span className="text-slate-700">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Healthy:</span>
            <span
              className={`font-semibold tabular-nums ${
                healthyServicesCount === totalServicesCount
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {healthyServicesCount}/{totalServicesCount} Nominal
            </span>
          </div>

          <span className="text-slate-700">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Active Incidents:</span>
            <span
              className={`font-semibold tabular-nums ${
                activeIncidentsCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'
              }`}
            >
              {activeIncidentsCount}
            </span>
          </div>

          <span className="text-slate-700">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Pending Approvals:</span>
            <span
              className={`font-semibold tabular-nums ${
                pendingApprovalsCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'
              }`}
            >
              {pendingApprovalsCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Active Fault:</span>
            <span
              className={`font-semibold ${
                simulatorState.activeFaults.length > 0
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {simulatorState.activeFaults.length > 0
                ? simulatorState.activeFaults[0].scenarioName
                : 'None (Nominal)'}
            </span>
          </div>

          <span className="text-slate-700">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Telemetry Cycle:</span>
            <span className="text-cyan-400 font-semibold">1.5s Polling</span>
          </div>
        </div>
      </div>
    </>
  );
};
