import {
  BlastRadiusAnalysis,
  Incident,
  IncidentEvent,
  IncidentSeverity,
  LinkedAlert,
  ServiceId,
  ServiceNode,
} from '../../shared/types.js';

import { InvestigationEngine } from '../investigation/InvestigationEngine.js';
import { StorageManager } from '../persistence/Storage.js';
import { RecoveryOrchestrator } from '../recovery/RecoveryOrchestrator.js';
import { DistributedSimulator } from '../simulator/DistributedSimulator.js';

export class AnomalyDetector {
  private activeIncidentIds: Set<string> = new Set();
  private investigationEngine: InvestigationEngine;
  private recoveryOrchestrator: RecoveryOrchestrator;

  constructor(
    private simulator: DistributedSimulator,
    private storage: StorageManager
  ) {
    this.investigationEngine = new InvestigationEngine(this.simulator);
    this.recoveryOrchestrator = new RecoveryOrchestrator(this.simulator, this.storage);
  }

  public check(telemetryNodes: ServiceNode[]): Incident | null {
    // If emergency stop is on, do not create new recovery cycles
    if (this.simulator.getState().emergencyStop) {
      return null;
    }

    const settings = this.storage.getSettings();
    const existingIncidents = this.storage.getIncidents();
    const activeUnresolved = existingIncidents.filter(
      (i) => i.state !== 'RECOVERED' && i.state !== 'CANCELLED' && i.state !== 'ESCALATED'
    );

    // If an unresolved incident is already being handled, skip creating duplicates
    if (activeUnresolved.length > 0) {
      return null;
    }

    // Scan all nodes for anomalies and rank candidate triggers
    const candidateBreaches: {
      node: ServiceNode;
      triggerMetric: string;
      triggerValue: string;
      threshold: string;
      severity: IncidentSeverity;
      score: number;
    }[] = [];

    for (const node of telemetryNodes) {
      if (node.health === 'offline') {
        candidateBreaches.push({
          node,
          triggerMetric: 'Service Health Check',
          triggerValue: 'OFFLINE (Zero Heartbeat)',
          threshold: 'HEALTHY',
          severity: 'CRITICAL',
          score: 100,
        });
      } else if (node.activeConnections && node.activeConnections >= 95) {
        candidateBreaches.push({
          node,
          triggerMetric: 'DB Connection Pool Saturation',
          triggerValue: `${node.activeConnections}/100`,
          threshold: '< 80/100',
          severity: 'CRITICAL',
          score: 95,
        });
      } else if (node.errorRate >= 50) {
        candidateBreaches.push({
          node,
          triggerMetric: 'Error Rate',
          triggerValue: `${node.errorRate}%`,
          threshold: `< ${settings.errorThresholdPct}%`,
          severity: 'CRITICAL',
          score: 90,
        });
      } else if (node.health === 'critical' || node.latencyP95 >= 2500) {
        candidateBreaches.push({
          node,
          triggerMetric: 'p95 Latency',
          triggerValue: `${node.latencyP95}ms`,
          threshold: `< ${settings.latencyThresholdMs}ms`,
          severity: 'CRITICAL',
          score: 85,
        });
      } else if (node.errorRate >= 20 || node.latencyP95 >= 1000 || (node.queueDepth && node.queueDepth > 1000)) {
        candidateBreaches.push({
          node,
          triggerMetric: node.errorRate >= 20 ? 'Error Rate' : 'p95 Latency',
          triggerValue: node.errorRate >= 20 ? `${node.errorRate}%` : `${node.latencyP95}ms`,
          threshold: `< ${settings.errorThresholdPct}%`,
          severity: 'HIGH',
          score: 60,
        });
      } else if (node.errorRate >= settings.errorThresholdPct || node.latencyP95 >= settings.latencyThresholdMs) {
        candidateBreaches.push({
          node,
          triggerMetric: node.errorRate >= settings.errorThresholdPct ? 'Error Rate' : 'p95 Latency',
          triggerValue: `${node.errorRate}%`,
          threshold: `< ${settings.errorThresholdPct}%`,
          severity: 'MEDIUM',
          score: 40,
        });
      }
    }

    if (candidateBreaches.length > 0) {
      // Pick the most severe, highest score breach
      candidateBreaches.sort((a, b) => b.score - a.score);
      const topBreach = candidateBreaches[0];
      const { node, triggerMetric, triggerValue, threshold, severity } = topBreach;

      // Compute deterministic blast-radius analysis from directed dependency tree
      const blastRadius = this.computeBlastRadius(node.id, telemetryNodes);

      // Group and correlate related breaches within the observation window into linked alerts
      const linkedAlerts: LinkedAlert[] = [];
      for (let i = 1; i < candidateBreaches.length; i++) {
        const b = candidateBreaches[i];
        let reason = 'Correlated cascading degradation within temporal sliding window';
        if (blastRadius.directAffectedServices.includes(b.node.id)) {
          reason = `Direct downstream dependent of ${node.name} experiencing cascading backpressure`;
        } else if (blastRadius.indirectAffectedServices.includes(b.node.id)) {
          reason = `Transitive downstream consumer of ${node.name} experiencing timeout cascade`;
        }

        linkedAlerts.push({
          id: `alert_${b.node.id}_${Date.now()}_${i}`,
          timestamp: Date.now(),
          serviceId: b.node.id,
          metric: b.triggerMetric,
          observedValue: b.triggerValue,
          threshold: b.threshold,
          severity: b.severity,
          correlationReason: reason,
        });
      }

      // Create full incident record
      const incidentId = `INC-${Date.now().toString().slice(-6)}`;
      const now = Date.now();

      const timeline: IncidentEvent[] = [
        {
          id: `evt_det_${now}`,
          timestamp: now,
          type: 'DETECTION',
          summary: `Automated anomaly detected on ${node.name}: ${triggerMetric} breached threshold (${triggerValue} vs threshold ${threshold})`,
          details: `Threshold rule breached during sliding window observation. Severity graded as ${severity}. Blast radius evaluated as ${blastRadius.blastRadiusScore} (${blastRadius.directAffectedServices.length} direct, ${blastRadius.indirectAffectedServices.length} indirect downstream).`,
          author: 'SYSTEM_TELEMETRY',
        },
      ];

      if (linkedAlerts.length > 0) {
        timeline.push({
          id: `evt_corr_${now}`,
          timestamp: now,
          type: 'DETECTION',
          summary: `Incident correlation engine grouped ${linkedAlerts.length} related alert(s) into this incident`,
          details: `Suppressed duplicate standalone tickets: ${linkedAlerts.map((a) => `${a.serviceId} (${a.metric})`).join(', ')}`,
          author: 'AEGIS_CORRELATION_ENGINE',
        });
      }

      const incident: Incident = {
        id: incidentId,
        title: `${severity}: ${node.name} Degradation (${triggerMetric})`,
        severity,
        state: 'DETECTED',
        targetService: node.id,
        impactedServices: telemetryNodes.filter((n) => n.health !== 'healthy').map((n) => n.id),
        detectedAt: now,
        summary: `Continuous telemetry observation caught ${node.name} breaching reliability SLA. Triggered by ${triggerMetric} = ${triggerValue}.`,
        triggerMetric,
        triggerValue,
        threshold,
        timeline,
        retryCount: 0,
        autoRecoveryEligible: severity === 'LOW' || severity === 'MEDIUM',
        blastRadius,
        linkedAlerts,
      };

      // Transition to INVESTIGATING
      incident.state = 'INVESTIGATING';

        incident.timeline.push({
          id: `evt_inv_${Date.now()}`,
          timestamp: Date.now(),
          type: 'INVESTIGATION',
          summary: `Investigation started: Analyzing causal topological tree and metric deviations`,
          author: 'AEGIS_ORCHESTRATOR',
        });

        // Run deterministic root-cause investigation
        const investigation = this.investigationEngine.investigate({
          incidentId,
          targetServiceId: node.id,
          triggerMetric,
          triggerValue,
        });
        incident.investigation = investigation;

        // Transition to RECOVERY_PLANNED
        incident.state = 'RECOVERY_PLANNED';
        const plan = this.recoveryOrchestrator.createRecoveryPlan(incident, investigation);
        incident.recoveryPlan = plan;

        incident.timeline.push({
          id: `evt_plan_${Date.now()}`,
          timestamp: Date.now(),
          type: 'PLANNING',
          summary: `Formulated mitigation plan: ${plan.title} [Target: ${plan.targetService}]`,
          details: `Action: ${plan.actionType}. Expected impact: ${plan.expectedImpact}`,
          author: 'AEGIS_ORCHESTRATOR',
        });

        // Check if approval is needed
        if (plan.requiresHumanApproval) {
          incident.state = 'AWAITING_APPROVAL';
          incident.timeline.push({
            id: `evt_appr_wait_${Date.now()}`,
            timestamp: Date.now(),
            type: 'STATE_CHANGE',
            summary: `Awaiting human operator approval (Severity: ${incident.severity})`,
            details: `Consequential action requires explicit operator sign-off according to active safety governance policy.`,
            author: 'AEGIS_ORCHESTRATOR',
          });
        }

        this.storage.saveIncident(incident);
        return incident;
    }

    return null;
  }

  private computeBlastRadius(targetService: ServiceId, allNodes: ServiceNode[]): BlastRadiusAnalysis {
    // 1. Direct dependents: nodes whose dependencies include targetService
    const direct = allNodes
      .filter((n) => n.dependencies.includes(targetService))
      .map((n) => n.id);

    // 2. Indirect dependents: traverse downstream dependency graph upwards towards ingress
    const indirectSet = new Set<ServiceId>();
    const queue = [...direct];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const node of allNodes) {
        if (node.dependencies.includes(curr) && node.id !== targetService && !direct.includes(node.id)) {
          if (!indirectSet.has(node.id)) {
            indirectSet.add(node.id);
            queue.push(node.id);
          }
        }
      }
    }
    const indirect = Array.from(indirectSet);

    // 3. Propagation paths from root cause to affected ingress
    const propagationPaths: string[] = [];
    if (direct.length === 0) {
      propagationPaths.push(`${targetService} (Ingress / Edge Tier)`);
    } else {
      for (const d of direct) {
        const parents = allNodes.filter((n) => n.dependencies.includes(d));
        if (parents.length > 0) {
          for (const p of parents) {
            propagationPaths.push(`${targetService} ➔ ${d} ➔ ${p.id}`);
          }
        } else {
          propagationPaths.push(`${targetService} ➔ ${d}`);
        }
      }
    }

    // 4. Estimated throughput impact in simulated requests per second
    const allAffectedIds = [targetService, ...direct, ...indirect];
    const estimatedRpsImpact = allNodes
      .filter((n) => allAffectedIds.includes(n.id))
      .reduce((sum, n) => sum + (n.rps || 0), 0);

    // 5. Count of dependent nodes currently experiencing non-nominal health
    const measuredDownstreamFailures = allNodes.filter(
      (n) => (direct.includes(n.id) || indirect.includes(n.id)) && n.health !== 'healthy'
    ).length;

    // 6. Blast radius severity grading
    let blastRadiusScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (targetService === 'database' || (direct.length + indirect.length) >= 3) {
      blastRadiusScore = 'CRITICAL';
    } else if (targetService === 'order-service' || targetService === 'payment-service' || direct.length >= 2) {
      blastRadiusScore = 'HIGH';
    } else if (targetService === 'auth-service' || targetService === 'message-queue' || direct.length >= 1) {
      blastRadiusScore = 'MEDIUM';
    }

    return {
      directAffectedServices: direct,
      indirectAffectedServices: indirect,
      estimatedRpsImpact,
      blastRadiusScore,
      propagationPaths,
      measuredDownstreamFailures,
    };
  }
}

