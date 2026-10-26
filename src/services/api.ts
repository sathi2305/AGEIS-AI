import {
  ChaosScenarioConfig,
  Incident,
  InvestigationReport,
  PolicySettings,
  ReliabilityAnalytics,
  ServiceId,
  ServiceNode,
  SimulatorState,
  TelemetryPoint,
} from '../../shared/types.js';

const API_BASE = '/api';

export const api = {
  async getStatus(): Promise<{
    state: SimulatorState;
    settings: PolicySettings;
    activeIncidentsCount: number;
    timestamp: number;
  }> {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  },

  async getTopology(): Promise<{ nodes: ServiceNode[]; timestamp: number }> {
    const res = await fetch(`${API_BASE}/topology`);
    if (!res.ok) throw new Error('Failed to fetch topology');
    return res.json();
  },

  async getTelemetry(serviceId?: ServiceId, windowSec: number = 180): Promise<{ points: TelemetryPoint[]; count: number }> {
    const url = new URL(`${window.location.origin}${API_BASE}/telemetry`);
    if (serviceId) url.searchParams.set('serviceId', serviceId);
    url.searchParams.set('window', windowSec.toString());
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch telemetry');
    return res.json();
  },

  async getIncidents(): Promise<{ incidents: Incident[] }> {
    const res = await fetch(`${API_BASE}/incidents`);
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },

  async getIncident(id: string): Promise<{ incident: Incident }> {
    const res = await fetch(`${API_BASE}/incidents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch incident');
    return res.json();
  },

  async runDryRun(id: string): Promise<{ success: boolean; message: string; details: string[] }> {
    const res = await fetch(`${API_BASE}/incidents/${id}/dry-run`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Dry run failed');
    }
    return res.json();
  },

  async approveIncident(id: string): Promise<{ incident: Incident }> {
    const res = await fetch(`${API_BASE}/incidents/${id}/approve`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Approval failed');
    }
    return res.json();
  },

  async rejectIncident(id: string, reason?: string): Promise<{ incident: Incident }> {
    const res = await fetch(`${API_BASE}/incidents/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Rejection failed');
    }
    return res.json();
  },

  async executeIncident(id: string): Promise<{ incident: Incident }> {
    const res = await fetch(`${API_BASE}/incidents/${id}/execute`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Execution failed');
    }
    return res.json();
  },

  async splitIncident(id: string): Promise<{ success: boolean; original: Incident; created: Incident[] }> {
    const res = await fetch(`${API_BASE}/incidents/${id}/split`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to split incident');
    }
    return res.json();
  },

  async getScenarios(): Promise<{ scenarios: ChaosScenarioConfig[] }> {

    const res = await fetch(`${API_BASE}/scenarios`);
    if (!res.ok) throw new Error('Failed to fetch scenarios');
    return res.json();
  },

  async injectFault(data: {
    scenarioId: string;
    scenarioName: string;
    targetService: ServiceId;
    intensity: number;
    parameters?: Record<string, any>;
  }): Promise<{ success: boolean; faultId: string; detectedIncident?: Incident }> {
    const res = await fetch(`${API_BASE}/chaos/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to inject fault');
    }
    return res.json();
  },

  async clearFault(faultId?: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/chaos/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faultId }),
    });
    if (!res.ok) throw new Error('Failed to clear fault');
    return res.json();
  },

  async controlSimulator(running?: boolean, speed?: number): Promise<{ state: SimulatorState }> {
    const res = await fetch(`${API_BASE}/simulator/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ running, speed }),
    });
    if (!res.ok) throw new Error('Failed to update simulator control');
    return res.json();
  },

  async resetSimulator(): Promise<{ success: boolean; state: SimulatorState }> {
    const res = await fetch(`${API_BASE}/simulator/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset simulator');
    return res.json();
  },

  async emergencyStop(): Promise<{ success: boolean; state: SimulatorState }> {
    const res = await fetch(`${API_BASE}/simulator/emergency-stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger emergency stop');
    return res.json();
  },

  async resetEmergencyStop(): Promise<{ success: boolean; state: SimulatorState }> {
    const res = await fetch(`${API_BASE}/simulator/emergency-stop/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset emergency stop');
    return res.json();
  },

  async getAnalytics(): Promise<{ analytics: ReliabilityAnalytics }> {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getSettings(): Promise<{ settings: PolicySettings }> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<PolicySettings>): Promise<{ settings: PolicySettings }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async resetHistory(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/history/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset history');
    return res.json();
  },
};
