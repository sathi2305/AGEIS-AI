import express, { Request, Response } from 'express';
import { ChaosScenarioConfig, ServiceId } from '../../shared/types.js';
import { AnomalyDetector } from '../detection/AnomalyDetector.js';
import { InvestigationEngine } from '../investigation/InvestigationEngine.js';
import { storage } from '../persistence/Storage.js';
import { RecoveryOrchestrator } from '../recovery/RecoveryOrchestrator.js';
import { simulator } from '../simulator/DistributedSimulator.js';

export const apiRouter = express.Router();

const anomalyDetector = new AnomalyDetector(simulator, storage);
const investigationEngine = new InvestigationEngine(simulator);
const recoveryOrchestrator = new RecoveryOrchestrator(simulator, storage);

// Standard predefined chaos scenarios
export const PREDEFINED_SCENARIOS: ChaosScenarioConfig[] = [
  {
    id: 'crash',
    name: 'Service Hard Crash',
    category: 'CRASH',
    targetService: 'payment-service',
    title: 'Payment Service SIGSEGV Hard Crash',
    description: 'Simulates fatal worker panic and unhandled exception, taking payment-service completely offline.',
    parameters: { intensity: 8 },
    expectedObservableEffects: [
      'Payment service health drops to OFFLINE',
      'Error rate jumps to 100% on payment service',
      'Upstream Order Service suffers timeout cascade',
      'API Gateway reports 502 Bad Gateway on checkout endpoints',
    ],
  },
  {
    id: 'db_saturation',
    name: 'PostgreSQL Pool Exhaustion',
    category: 'SATURATION',
    targetService: 'database',
    title: 'PostgreSQL Connection Pool 100% Saturated',
    description: 'Simulates connection leak and slow transactions exhausting 100/100 pool capacity.',
    parameters: { intensity: 7 },
    expectedObservableEffects: [
      'Database active connections peg at 100/100 max',
      'p95 query latency climbs to 3400ms+',
      'Payment and Inventory services encounter connection timeouts (504)',
      'Global system availability drops sharply',
    ],
  },
  {
    id: 'latency_spike',
    name: 'Downstream Latency Regression',
    category: 'LATENCY',
    targetService: 'inventory-service',
    title: 'Inventory Service Latency Spike (Regression)',
    description: 'Simulates unindexed full table scans causing severe thread congestion.',
    parameters: { intensity: 6 },
    expectedObservableEffects: [
      'Inventory latency spikes above 2000ms',
      'CPU utilization increases to 85%+',
      'Upstream Order Service thread pool queues fill up',
    ],
  },
  {
    id: 'queue_backlog',
    name: 'Message Queue Backpressure',
    category: 'BACKLOG',
    targetService: 'message-queue',
    title: 'Message Queue Dead-Letter Buildup',
    description: 'Simulates poison pills and consumer thread stalling causing massive queue buildup.',
    parameters: { intensity: 7 },
    expectedObservableEffects: [
      'Queue depth spikes from 18 to 2000+ items',
      'Event processing latency degrades to 600ms+',
      'Worker error rates rise',
    ],
  },
  {
    id: 'config_regression',
    name: 'Authentication Key Mismatch',
    category: 'CONFIG',
    targetService: 'auth-service',
    title: 'Invalid JWT Verification Key Rollout',
    description: 'Simulates configuration push with mismatched cryptographic public key.',
    parameters: { intensity: 9 },
    expectedObservableEffects: [
      'Auth service error rate jumps to 85%+',
      'API Gateway rejects incoming user tokens as unauthorized (401)',
      'Client requests blocked across all protected services',
    ],
  },
  {
    id: 'dependency_outage',
    name: 'Network Route Disconnection',
    category: 'OUTAGE',
    targetService: 'auth-service',
    title: 'Auth Route TCP Socket Severed',
    description: 'Simulates network partition or upstream socket reset.',
    parameters: { intensity: 8 },
    expectedObservableEffects: [
      'Gateway fails to contact Auth Service with connection refused',
      'Cascading 503 errors propagate to frontend clients',
    ],
  },
  {
    id: 'transient_errors',
    name: 'Intermittent Transport Drops',
    category: 'TRANSIENT',
    targetService: 'order-service',
    title: 'Intermittent Packet Drops & TCP Resets',
    description: 'Simulates noisy neighbor network degradation and intermittent 503s.',
    parameters: { intensity: 5 },
    expectedObservableEffects: [
      'Order service experiences 15-25% sporadic error blips',
      'Latency variance increases significantly',
    ],
  },
];

// 1. Simulator Status & Topology
apiRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    state: simulator.getState(),
    settings: storage.getSettings(),
    activeIncidentsCount: storage.getIncidents().filter((i) => i.state !== 'RECOVERED' && i.state !== 'CANCELLED').length,
    timestamp: Date.now(),
  });
});

apiRouter.get('/topology', (req: Request, res: Response) => {
  res.json({
    nodes: simulator.getTopology(),
    timestamp: Date.now(),
  });
});

apiRouter.get('/telemetry', (req: Request, res: Response) => {
  const serviceId = req.query.serviceId as ServiceId | undefined;
  const windowSec = req.query.window ? parseInt(req.query.window as string, 10) : 180;
  const data = simulator.getTelemetryHistory(serviceId, windowSec);
  res.json({ points: data, count: data.length });
});

// 2. Incident Management
apiRouter.get('/incidents', (req: Request, res: Response) => {
  res.json({ incidents: storage.getIncidents() });
});

apiRouter.get('/incidents/:id', (req: Request, res: Response) => {
  const inc = storage.getIncident(req.params.id);
  if (!inc) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json({ incident: inc });
});

apiRouter.post('/incidents/:id/investigate', (req: Request, res: Response) => {
  const inc = storage.getIncident(req.params.id);
  if (!inc) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  const report = investigationEngine.investigate({
    incidentId: inc.id,
    targetServiceId: inc.targetService,
    triggerMetric: inc.triggerMetric,
    triggerValue: inc.triggerValue,
  });
  inc.investigation = report;
  storage.saveIncident(inc);
  res.json({ report });
});

apiRouter.post('/incidents/:id/dry-run', (req: Request, res: Response) => {
  const inc = storage.getIncident(req.params.id);
  if (!inc) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  try {
    const result = recoveryOrchestrator.runDryRun(inc);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/incidents/:id/approve', async (req: Request, res: Response) => {
  const inc = storage.getIncident(req.params.id);
  if (!inc) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  try {
    recoveryOrchestrator.approvePlan(inc, 'HUMAN_OPERATOR');
    const updated = await recoveryOrchestrator.executeAndVerify(inc);
    res.json({ incident: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/incidents/:id/reject', (req: Request, res: Response) => {
  const inc = storage.getIncident(req.params.id);
  if (!inc) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  const reason = req.body.reason || 'Rejected by human operator';
  recoveryOrchestrator.rejectPlan(inc, reason);
  res.json({ incident: inc });
});

apiRouter.post('/incidents/:id/split', (req: Request, res: Response) => {
  const result = storage.splitIncident(req.params.id);
  if (!result) {
    return res.status(400).json({ error: 'Incident cannot be split (no linked alerts found)' });
  }
  res.json({ success: true, original: result.original, created: result.created });
});

apiRouter.post('/incidents/:id/execute', async (req: Request, res: Response) => {
  const inc = storage.getIncident(req.params.id);
  if (!inc) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  try {
    const updated = await recoveryOrchestrator.executeAndVerify(inc, true);
    res.json({ incident: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// 3. Chaos & Fault Injection
apiRouter.get('/scenarios', (req: Request, res: Response) => {
  res.json({ scenarios: PREDEFINED_SCENARIOS });
});

apiRouter.post('/chaos/inject', (req: Request, res: Response) => {
  const { scenarioId, scenarioName, targetService, intensity, parameters } = req.body;
  if (!targetService || !scenarioId) {
    return res.status(400).json({ error: 'scenarioId and targetService are required' });
  }
  try {
    const faultId = simulator.injectFault({
      scenarioId,
      scenarioName: scenarioName || scenarioId,
      targetService,
      intensity: intensity || 5,
      parameters,
    });
    // Immediately execute a simulation tick to reflect state changes
    simulator.tick();
    // Run anomaly detector
    const detected = anomalyDetector.check(simulator.getTopology());
    res.json({ success: true, faultId, detectedIncident: detected });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/chaos/clear', (req: Request, res: Response) => {
  const { faultId } = req.body;
  if (faultId) {
    simulator.clearFault(faultId);
  } else {
    simulator.clearAllFaults();
  }
  simulator.tick();
  res.json({ success: true });
});

// 4. Simulator Controls & Safety Interlocks
apiRouter.post('/simulator/control', (req: Request, res: Response) => {
  const { running, speed } = req.body;
  if (running !== undefined) simulator.setRunning(Boolean(running));
  if (speed !== undefined) simulator.setSpeed(Number(speed));
  res.json({ state: simulator.getState() });
});

apiRouter.post('/simulator/reset', (req: Request, res: Response) => {
  simulator.resetToHealthy();
  res.json({ success: true, state: simulator.getState() });
});

apiRouter.post('/simulator/emergency-stop', (req: Request, res: Response) => {
  simulator.triggerEmergencyStop();
  res.json({ success: true, state: simulator.getState() });
});

apiRouter.post('/simulator/emergency-stop/reset', (req: Request, res: Response) => {
  simulator.resetEmergencyStop();
  res.json({ success: true, state: simulator.getState() });
});

apiRouter.post('/simulator/tick', (req: Request, res: Response) => {
  const points = simulator.tick();
  const detected = anomalyDetector.check(simulator.getTopology());
  res.json({ points, detectedIncident: detected });
});

// 5. Analytics & Settings
apiRouter.get('/analytics', (req: Request, res: Response) => {
  res.json({ analytics: storage.calculateAnalytics() });
});

apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json({ settings: storage.getSettings() });
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const updated = storage.updateSettings(req.body);
  res.json({ settings: updated });
});

apiRouter.post('/history/reset', (req: Request, res: Response) => {
  storage.resetAllHistory();
  res.json({ success: true });
});

export { anomalyDetector, recoveryOrchestrator };
