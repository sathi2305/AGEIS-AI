import {
  Incident,
  ServiceId,
  VerificationCriteria,
  VerificationReport,
} from '../../shared/types.js';
import { DistributedSimulator } from '../simulator/DistributedSimulator.js';

export class VerificationEngine {
  constructor(private simulator: DistributedSimulator) {}

  public evaluateFreshTelemetry(params: {
    incident: Incident;
    targetService: ServiceId;
    windowDurationSec?: number;
  }): VerificationReport {
    const windowSec = params.windowDurationSec || 6;
    const history = this.simulator.getTelemetryHistory(params.targetService, windowSec);
    const targetNode = this.simulator.getService(params.targetService);

    // Evaluate telemetry points produced after execution started
    const postActionPoints = params.incident.executionRecord?.startedAt
      ? history.filter((p) => p.timestamp >= params.incident.executionRecord!.startedAt)
      : history.slice(-Math.max(1, Math.min(3, history.length)));

    const recentPoints = postActionPoints.length > 0
      ? postActionPoints
      : targetNode
      ? [
          {
            errorRate: targetNode.errorRate,
            latencyP95: targetNode.latencyP95,
            health: targetNode.health,
            queueDepth: targetNode.queueDepth || 0,
            timestamp: Date.now(),
            serviceId: params.targetService,
            rps: targetNode.rps,
            cpuUsage: targetNode.cpuUsage,
            activeConnections: targetNode.activeConnections || 0,
          },
        ]
      : [];

    const avgError =
      recentPoints.length > 0
        ? recentPoints.reduce((acc, p) => acc + p.errorRate, 0) / recentPoints.length
        : targetNode?.errorRate || 0;

    const avgLatency =
      recentPoints.length > 0
        ? recentPoints.reduce((acc, p) => acc + p.latencyP95, 0) / recentPoints.length
        : targetNode?.latencyP95 || 40;

    const currentHealth = targetNode?.health || 'healthy';
    const queueDepth = targetNode?.queueDepth;

    const criteria: VerificationCriteria = {
      maxErrorRatePct: 2.0,
      maxLatencyP95Ms: 150,
      requiredHealth: ['healthy'],
      maxQueueDepth: 100,
      observationWindowSec: windowSec,
    };

    const errorPassed = avgError <= criteria.maxErrorRatePct;
    const latencyPassed = avgLatency <= criteria.maxLatencyP95Ms;
    const healthPassed = criteria.requiredHealth.includes(currentHealth);
    const queuePassed = queueDepth !== undefined ? queueDepth <= (criteria.maxQueueDepth || 100) : true;

    const allPassed = errorPassed && latencyPassed && healthPassed && queuePassed;
    const partiallyPassed = (errorPassed || healthPassed) && !allPassed;

    let outcome: 'RECOVERED' | 'PARTIALLY_RECOVERED' | 'FAILED' = 'FAILED';
    if (allPassed) {
      outcome = 'RECOVERED';
    } else if (partiallyPassed) {
      outcome = 'PARTIALLY_RECOVERED';
    }

    const summary = allPassed
      ? `Fresh telemetry verification PASSED across all criteria over ${windowSec}s observation window.`
      : partiallyPassed
      ? `Partial recovery detected. Service health restored, but latency (${Math.round(avgLatency)}ms) or error rate (${avgError.toFixed(1)}%) remains elevated.`
      : `Verification FAILED. Telemetry remains degraded (Error: ${avgError.toFixed(1)}%, Latency: ${Math.round(avgLatency)}ms, Health: ${currentHealth}).`;

    const recommendation = allPassed
      ? 'Incident resolved successfully. Closed-loop recovery complete. Archive telemetry snapshot and update baseline.'
      : 'Action was ineffective or incomplete. Propose secondary recovery plan or escalate to platform team.';

    return {
      incidentId: params.incident.id,
      evaluatedAt: Date.now(),
      windowDurationSec: windowSec,
      criteria,
      actuals: {
        errorRatePct: +avgError.toFixed(2),
        latencyP95Ms: Math.round(avgLatency),
        health: currentHealth,
        queueDepth,
      },
      passed: allPassed,
      outcome,
      summary,
      recommendation,
    };
  }
}
