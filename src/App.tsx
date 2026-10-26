import React, { useEffect, useState } from 'react';
import {
  ChaosScenarioConfig,
  Incident,
  PolicySettings,
  ReliabilityAnalytics,
  ServiceId,
  ServiceNode,
  SimulatorState,
  TelemetryPoint,
} from '../shared/types.js';
import { CommandPalette } from './components/CommandPalette.js';
import { EmergencyStopModal } from './components/EmergencyStopModal.js';
import { GuidedDemoModal } from './components/GuidedDemoModal.js';
import { Header } from './components/Header.js';
import { NavTab, Sidebar } from './components/Sidebar.js';

import { AnalyticsScreen } from './features/analytics/AnalyticsScreen.js';
import { ApprovalsScreen } from './features/approvals/ApprovalsScreen.js';
import { AuditScreen } from './features/audit/AuditScreen.js';
import { ChaosLabScreen } from './features/chaos-lab/ChaosLabScreen.js';
import { HistoryScreen } from './features/history/HistoryScreen.js';
import { IncidentsScreen } from './features/incidents/IncidentsScreen.js';
import { InvestigationScreen } from './features/investigation/InvestigationScreen.js';
import { OverviewScreen } from './features/overview/OverviewScreen.js';
import { RecoveryScreen } from './features/recovery/RecoveryScreen.js';
import { RunbooksScreen } from './features/runbooks/RunbooksScreen.js';
import { SettingsScreen } from './features/settings/SettingsScreen.js';
import { TelemetryScreen } from './features/telemetry/TelemetryScreen.js';
import { TimelineScreen } from './features/timeline/TimelineScreen.js';
import { TopologyScreen } from './features/topology/TopologyScreen.js';
import { api } from './services/api.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Core application state
  const [nodes, setNodes] = useState<ServiceNode[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [analytics, setAnalytics] = useState<ReliabilityAnalytics | null>(null);
  const [scenarios, setScenarios] = useState<ChaosScenarioConfig[]>([]);
  const [settings, setSettings] = useState<PolicySettings>({
    autoApprovalThreshold: 'MEDIUM',
    requireApprovalAlways: false,
    maxRetriesAllowed: 3,
    verificationWindowSec: 6,
    errorThresholdPct: 5,
    latencyThresholdMs: 350,
    circuitBreakerThresholdPct: 25,
    simulatorSpeed: 1,
    telemetryRetentionMinutes: 30,
  });

  const [simulatorState, setSimulatorState] = useState<SimulatorState>({
    running: true,
    tickCount: 0,
    speed: 1,
    activeFaults: [],
    emergencyStop: false,
  });

  // Selected item states
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId | null>(null);

  // Modals
  const [showEmergencyStopModal, setShowEmergencyStopModal] = useState<boolean>(false);
  const [showGuidedDemoModal, setShowGuidedDemoModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const [statusRes, topoRes, telRes, incRes, analRes, scenRes, setRes] =
          await Promise.all([
            api.getStatus(),
            api.getTopology(),
            api.getTelemetry(undefined, 180),
            api.getIncidents(),
            api.getAnalytics(),
            api.getScenarios(),
            api.getSettings(),
          ]);

        setSimulatorState(statusRes.state);
        setNodes(topoRes.nodes);
        setTelemetry(telRes.points);
        setIncidents(incRes.incidents);
        setAnalytics(analRes.analytics);
        setScenarios(scenRes.scenarios);
        setSettings(setRes.settings);

        if (incRes.incidents.length > 0) {
          setSelectedIncident(incRes.incidents[0]);
        }
      } catch (err) {
        console.error('Initial data fetch error:', err);
      }
    };

    init();
  }, []);

  // Connection & telemetry freshness
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Polling loop every 1.5 seconds to refresh telemetry and state
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [statusRes, topoRes, telRes, incRes, analRes] = await Promise.all([
          api.getStatus(),
          api.getTopology(),
          api.getTelemetry(undefined, 180),
          api.getIncidents(),
          api.getAnalytics(),
        ]);

        setSimulatorState(statusRes.state);
        setNodes(topoRes.nodes);
        setTelemetry(telRes.points);
        setIncidents(incRes.incidents);
        setAnalytics(analRes.analytics);
        setBackendConnected(true);
        setLastUpdated(Date.now());

        // Update selected incident if its state changed
        setSelectedIncident((prev) => {
          if (!prev) return incRes.incidents[0] || null;
          const updated = incRes.incidents.find((i) => i.id === prev.id);
          return updated || prev;
        });
      } catch (err) {
        setBackendConnected(false);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Actions
  const handleTogglePlayPause = async () => {
    try {
      const res = await api.controlSimulator(!simulatorState.running);
      setSimulatorState(res.state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSimulator = async () => {
    try {
      await api.resetSimulator();
      const topoRes = await api.getTopology();
      setNodes(topoRes.nodes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerEmergencyStop = async () => {
    const res = await api.emergencyStop();
    if (res.state) setSimulatorState(res.state);
    return res;
  };

  const handleResetEmergencyStop = async () => {
    const res = await api.resetEmergencyStop();
    if (res.state) setSimulatorState(res.state);
    return res;
  };

  const handleInjectFault = async (data: {
    scenarioId: string;
    scenarioName: string;
    targetService: ServiceId;
    intensity: number;
  }) => {
    const res = await api.injectFault(data);
    const [statusRes, topoRes, incRes] = await Promise.all([
      api.getStatus(),
      api.getTopology(),
      api.getIncidents(),
    ]);
    setSimulatorState(statusRes.state);
    setNodes(topoRes.nodes);
    setIncidents(incRes.incidents);
    if (res.detectedIncident) {
      setSelectedIncident(res.detectedIncident);
    }
    return res;
  };

  const handleClearFault = async (faultId?: string) => {
    const res = await api.clearFault(faultId);
    const [statusRes, topoRes] = await Promise.all([
      api.getStatus(),
      api.getTopology(),
    ]);
    setSimulatorState(statusRes.state);
    setNodes(topoRes.nodes);
    return res;
  };

  const handleRunDryRun = async (incId: string) => {
    return api.runDryRun(incId);
  };

  const handleApproveAndExecute = async (incId: string) => {
    const res = await api.approveIncident(incId);
    setSelectedIncident(res.incident);
    const [incRes, analRes] = await Promise.all([api.getIncidents(), api.getAnalytics()]);
    setIncidents(incRes.incidents);
    setAnalytics(analRes.analytics);
    return res;
  };

  const handleRejectPlan = async (incId: string, reason?: string) => {
    const res = await api.rejectIncident(incId, reason);
    setSelectedIncident(res.incident);
    const incRes = await api.getIncidents();
    setIncidents(incRes.incidents);
    return res;
  };

  const handleUpdateSettings = async (newSettings: Partial<PolicySettings>) => {
    const res = await api.updateSettings(newSettings);
    setSettings(res.settings);
    return res;
  };

  const handleResetHistory = async () => {
    await api.resetHistory();
    setIncidents([]);
    setSelectedIncident(null);
  };

  const handleReplayIncident = async (inc: Incident) => {
    // Deterministic replay: Inject matching fault and open recovery view
    const matchingScenario = scenarios.find(
      (s) => s.targetService === inc.targetService
    ) || scenarios[0];

    await handleInjectFault({
      scenarioId: matchingScenario?.id || 'crash',
      scenarioName: `Replay: ${inc.title}`,
      targetService: inc.targetService,
      intensity: 7,
    });
    setCurrentTab('recovery');
  };

  const handleRunDemoScenario = async () => {
    await handleInjectFault({
      scenarioId: 'crash',
      scenarioName: 'Payment Service Hard Crash',
      targetService: 'payment-service',
      intensity: 8,
    });
    setCurrentTab('incidents');
  };

  const activeIncidentsCount = incidents.filter(
    (i) => i.state !== 'RECOVERED' && i.state !== 'CANCELLED'
  ).length;

  const pendingApprovalsCount = incidents.filter(
    (i) => i.state === 'AWAITING_APPROVAL' || (i.recoveryPlan && i.state === 'RECOVERY_PLANNED')
  ).length;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-200 flex flex-col bg-grid-pattern">
      {/* Top Bar Contract Header & Status Strip */}
      <Header
        simulatorState={simulatorState}
        activeIncidentsCount={activeIncidentsCount}
        pendingApprovalsCount={pendingApprovalsCount}
        totalServicesCount={nodes.length}
        healthyServicesCount={nodes.filter((n) => n.health === 'healthy').length}
        currentTab={currentTab}
        backendConnected={backendConnected}
        lastUpdated={lastUpdated}
        recentIncidents={incidents}
        onTogglePlayPause={handleTogglePlayPause}
        onOpenEmergencyStop={() => setShowEmergencyStopModal(true)}
        onOpenGuidedDemo={() => setShowGuidedDemoModal(true)}
        onResetSimulator={handleResetSimulator}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
        onSelectIncident={(inc) => setSelectedIncident(inc)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Rail */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          activeIncidentsCount={activeIncidentsCount}
          pendingApprovalsCount={pendingApprovalsCount}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {currentTab === 'overview' && (
            <OverviewScreen
              nodes={nodes}
              incidents={incidents}
              telemetry={telemetry}
              analytics={analytics}
              simulatorState={simulatorState}
              lastUpdated={lastUpdated}
              backendConnected={backendConnected}
              onTriggerEmergencyStop={handleTriggerEmergencyStop}
              onResetEmergencyStop={handleResetEmergencyStop}
              onNavigate={(tab) => setCurrentTab(tab as NavTab)}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onSelectService={(id) => {
                setSelectedServiceId(id);
                setCurrentTab('topology');
              }}
              onRunDemoScenario={handleRunDemoScenario}
            />
          )}

          {currentTab === 'topology' && (
            <TopologyScreen
              nodes={nodes}
              selectedServiceId={selectedServiceId}
              onSelectService={(id) => setSelectedServiceId(id)}
              onRefresh={async () => {
                const res = await api.getTopology();
                setNodes(res.nodes);
              }}
            />
          )}

          {currentTab === 'telemetry' && (
            <TelemetryScreen
              telemetry={telemetry}
              nodes={nodes}
              onRefresh={async () => {
                const res = await api.getTelemetry(undefined, 180);
                setTelemetry(res.points);
              }}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentsScreen
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onNavigateToRecovery={(inc) => {
                setSelectedIncident(inc);
                setCurrentTab('recovery');
              }}
              onNavigateToInvestigation={(inc) => {
                setSelectedIncident(inc);
                setCurrentTab('investigation');
              }}
              onRefresh={async () => {
                const res = await api.getIncidents();
                setIncidents(res.incidents);
              }}
            />
          )}

          {currentTab === 'investigation' && (
            <InvestigationScreen
              incidents={incidents}
              currentIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onNavigateToRecovery={(inc) => {
                setSelectedIncident(inc);
                setCurrentTab('recovery');
              }}
              onRerunInvestigation={async (id) => {
                const res = await fetch(`/api/incidents/${id}/investigate`, { method: 'POST' });
                const data = await res.json();
                if (data.report && selectedIncident) {
                  setSelectedIncident({ ...selectedIncident, investigation: data.report });
                }
              }}
            />
          )}

          {currentTab === 'recovery' && (
            <RecoveryScreen
              incidents={incidents}
              currentIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onRunDryRun={handleRunDryRun}
              onApproveAndExecute={handleApproveAndExecute}
              onRejectPlan={handleRejectPlan}
              onRefresh={async () => {
                const res = await api.getIncidents();
                setIncidents(res.incidents);
              }}
            />
          )}

          {currentTab === 'approvals' && (
            <ApprovalsScreen
              incidents={incidents}
              settings={settings}
              onApproveAndExecute={handleApproveAndExecute}
              onRejectPlan={handleRejectPlan}
              onRunDryRun={handleRunDryRun}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onNavigateToRecovery={(inc) => {
                setSelectedIncident(inc);
                setCurrentTab('recovery');
              }}
              onRefresh={async () => {
                const res = await api.getIncidents();
                setIncidents(res.incidents);
              }}
            />
          )}

          {currentTab === 'chaos-lab' && (
            <ChaosLabScreen
              scenarios={scenarios}
              simulatorState={simulatorState}
              onInjectFault={handleInjectFault}
              onClearFault={handleClearFault}
              onResetSimulator={handleResetSimulator}
              onRunGuidedDemo={() => setShowGuidedDemoModal(true)}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsScreen
              analytics={analytics}
              onRefresh={async () => {
                const res = await api.getAnalytics();
                setAnalytics(res.analytics);
              }}
            />
          )}

          {currentTab === 'timeline' && (
            <TimelineScreen
              incidents={incidents}
              simulatorState={simulatorState}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onNavigateToRecovery={(inc) => {
                setSelectedIncident(inc);
                setCurrentTab('recovery');
              }}
              onRefresh={async () => {
                const res = await api.getIncidents();
                setIncidents(res.incidents);
              }}
            />
          )}

          {currentTab === 'runbooks' && (
            <RunbooksScreen
              scenarios={scenarios}
              incidents={incidents}
              onInjectFault={handleInjectFault}
              onNavigateToRecovery={() => setCurrentTab('recovery')}
            />
          )}

          {currentTab === 'audit' && (
            <AuditScreen
              incidents={incidents}
              onReplayIncident={handleReplayIncident}
              onResetHistory={handleResetHistory}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onNavigateToRecovery={(inc) => {
                setSelectedIncident(inc);
                setCurrentTab('recovery');
              }}
              onRefresh={async () => {
                const res = await api.getIncidents();
                setIncidents(res.incidents);
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsScreen
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
        </main>
      </div>

      {/* Emergency Stop Modal */}
      {showEmergencyStopModal && (
        <EmergencyStopModal
          simulatorState={simulatorState}
          onClose={() => setShowEmergencyStopModal(false)}
          onTriggerStop={handleTriggerEmergencyStop}
          onResetStop={handleResetEmergencyStop}
        />
      )}

      {/* 13-Step Guided Evaluation Demo Stepper */}
      {showGuidedDemoModal && (
        <GuidedDemoModal
          onClose={() => setShowGuidedDemoModal(false)}
          onNavigate={(tab) => setCurrentTab(tab as NavTab)}
          onInjectFailure={async (scId, svcId) => {
            return handleInjectFault({
              scenarioId: scId,
              scenarioName: 'Payment Service Crash (Demo)',
              targetService: svcId as ServiceId,
              intensity: 8,
            });
          }}
          onApproveAndExecuteLatest={async () => {
            if (selectedIncident) {
              return handleApproveAndExecute(selectedIncident.id);
            }
          }}
          onResetToHealthy={async () => {
            return handleResetSimulator();
          }}
          latestIncident={selectedIncident}
        />
      )}

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette

        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={(tab) => setCurrentTab(tab)}
        incidents={incidents}
        scenarios={scenarios}
        onSelectIncident={(inc) => setSelectedIncident(inc)}
        onInjectFault={handleInjectFault}
        onResetSimulator={handleResetSimulator}
        onOpenEmergencyStop={() => setShowEmergencyStopModal(true)}
        onOpenGuidedDemo={() => setShowGuidedDemoModal(true)}
      />
    </div>
  );
}

