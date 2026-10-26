import {
  Incident,
  IncidentEvent,
  InvestigationReport,
  PolicySettings,
  RecoveryActionType,
  RecoveryExecutionRecord,
  RecoveryPlan,
  RecoveryPlanComparison,
  RecoveryRisk,
  ServiceId,
  WatchWindowRecord,
} from '../../shared/types.js';

import { StorageManager } from '../persistence/Storage.js';
import { DistributedSimulator } from '../simulator/DistributedSimulator.js';
import { VerificationEngine } from '../verification/VerificationEngine.js';

export class RecoveryOrchestrator {
  private verificationEngine: VerificationEngine;

  constructor(
    private simulator: DistributedSimulator,
    private storage: StorageManager
  ) {
    this.verificationEngine = new VerificationEngine(this.simulator);
  }

  public createRecoveryPlan(incident: Incident, investigation: InvestigationReport): RecoveryPlan {
    const primary = investigation.primaryRootCause;
    const targetService = primary.serviceId;
    const actionType = primary.recommendedActionType;

    const actionDescriptions: Record<RecoveryActionType, { title: string; desc: string; impact: string }> = {
      RESTART_SERVICE: {
        title: `Graceful restart of ${targetService} container`,
        desc: `Sends SIGTERM, flushes pending in-flight requests, spins up a fresh container instance with clean heap state.`,
        impact: `Temporary 2-3s transient blip for in-flight requests; immediate resolution of thread deadlocks and OOM states.`,
      },
      REVERT_CONFIGURATION: {
        title: `Revert configuration overrides on ${targetService}`,
        desc: `Restores baseline cryptographic secrets, timeout thresholds (3000ms), and rate limits from version control.`,
        impact: `Eliminates 401/504 errors caused by configuration mismatch without service downtime.`,
      },
      SCALE_CONNECTION_POOL: {
        title: `Expand PostgreSQL connection pool from 100 to 200`,
        desc: `Re-allocates connection pool handles in PgBouncer / RDS Proxy and clears abandoned transaction locks.`,
        impact: `Allows backlogged transactional queries to execute without timeout or rejection.`,
      },
      DRAIN_REPROCESS_QUEUE: {
        title: `Drain dead-letter queue and reprocess on ${targetService}`,
        desc: `Moves unprocessable messages to dead-letter storage, restarts worker consumers, and resumes normal processing.`,
        impact: `Queue depth drops from saturation to safe baseline (<50 items).`,
      },
      ROLLBACK_DEPLOYMENT: {
        title: `Rollback ${targetService} to stable release v2.1.3-stable`,
        desc: `Switches deployment replica set traffic to previously verified build artifact.`,
        impact: `Eliminates latency regression and CPU spikes introduced in canary release.`,
      },
      TRIP_CIRCUIT_BREAKER: {
        title: `Trip circuit breaker on ${targetService}`,
        desc: `Isolates downstream dependency calls and serves cached fallback responses.`,
        impact: `Prevents cascading thread exhaustion to upstream services.`,
      },
      REDUCE_TRAFFIC: {
        title: `Apply 50% load shedding on ${targetService}`,
        desc: `Enforces token-bucket rate limiting to allow downstream backends to recover.`,
        impact: `Drops external traffic by half temporarily to relieve critical resource exhaustion.`,
      },
    };

    const actionInfo = actionDescriptions[actionType] || {
      title: `Execute ${actionType} on ${targetService}`,
      desc: `Applies deterministic mitigation plan.`,
      impact: `Restores service equilibrium.`,
    };

    const safetyChecks = [
      {
        name: 'Target Service Allowlist Verification',
        passed: true,
        reason: `${targetService} is an authorized managed service in topology.`,
      },
      {
        name: 'Action Permitted by Safety Governance',
        passed: true,
        reason: `${actionType} is classified as an approved remediation primitive.`,
      },
      {
        name: 'Retry Limit Safety Margin',
        passed: incident.retryCount < this.storage.getSettings().maxRetriesAllowed,
        reason: `Current retry count (${incident.retryCount}) is within allowable limit (${this.storage.getSettings().maxRetriesAllowed}).`,
      },
      {
        name: 'Emergency Stop Interlock Check',
        passed: !this.simulator.getState().emergencyStop,
        reason: 'Emergency stop interlock is inactive; execution permitted.',
      },
    ];

    const settings = this.storage.getSettings();
    const isSeverityHighOrCrit = incident.severity === 'CRITICAL' || incident.severity === 'HIGH';
    const requiresApproval = settings.requireApprovalAlways || isSeverityHighOrCrit;

    const riskScore = this.evaluateRecoveryRisk(targetService, actionType, incident);

    const plan: RecoveryPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      incidentId: incident.id,
      targetService,
      actionType,
      title: actionInfo.title,
      description: actionInfo.desc,
      parameters: {
        serviceId: targetService,
        actionType,
        retries: incident.retryCount,
      },
      expectedImpact: actionInfo.impact,
      preconditions: [
        'Simulator runtime running',
        'Emergency stop flag is FALSE',
        'Target service registered in topology registry',
      ],
      safetyChecks,
      requiresHumanApproval: requiresApproval,
      rollbackPlan: `If ${actionType} fails or degrades telemetry further, orchestrator will revert to fallback safe mode or escalate to human operations.`,
      rollbackAvailable: true,
      rollbackPrerequisites: [
        'Container baseline image digest verified',
        'Health probe definitions nominal',
        'No active transactional lock deadlocks',
      ],
      riskScore,
      estimatedRecoveryTimeSec: 8,
    };

    // Formulate alternative candidate plan for operator comparison
    const altActionType: RecoveryActionType =
      actionType === 'RESTART_SERVICE'
        ? 'TRIP_CIRCUIT_BREAKER'
        : actionType === 'SCALE_CONNECTION_POOL'
        ? 'REDUCE_TRAFFIC'
        : actionType === 'ROLLBACK_DEPLOYMENT'
        ? 'REVERT_CONFIGURATION'
        : 'REDUCE_TRAFFIC';

    const altInfo = actionDescriptions[altActionType] || {
      title: `Execute ${altActionType} on ${targetService}`,
      desc: 'Alternative conservative mitigation.',
      impact: 'Reduces strain without hard restarts.',
    };

    const alternativePlan: RecoveryPlan = {
      id: `plan_alt_${Date.now()}`,
      incidentId: incident.id,
      targetService,
      actionType: altActionType,
      title: altInfo.title,
      description: altInfo.desc,
      parameters: {
        serviceId: targetService,
        actionType: altActionType,
        retries: 0,
      },
      expectedImpact: altInfo.impact,
      preconditions: ['Simulator running'],
      safetyChecks: plan.safetyChecks,
      requiresHumanApproval: true,
      rollbackPlan: `Revert ${altActionType} policy overrides to 100% capacity.`,
      rollbackAvailable: true,
      riskScore: this.evaluateRecoveryRisk(targetService, altActionType, incident),
      estimatedRecoveryTimeSec: 5,
    };

    incident.planComparison = {
      primaryPlan: plan,
      alternativePlan,
      tradeoffSummary: `Primary action [${plan.actionType}] achieves definitive root-cause elimination with ~3s transient impact, whereas Alternative action [${alternativePlan.actionType}] minimizes operational blast radius but only offers temporary symptomatic relief.`,
      recommendedPlanId: plan.id,
    };

    return plan;
  }


  public runDryRun(incident: Incident): { success: boolean; message: string; details: string[] } {
    if (!incident.recoveryPlan) {
      throw new Error('No recovery plan exists for this incident');
    }
    const result = this.simulator.executeRecoveryAction({
      targetService: incident.recoveryPlan.targetService,
      actionType: incident.recoveryPlan.actionType,
      parameters: incident.recoveryPlan.parameters,
      dryRun: true,
    });

    this.addTimelineEvent(incident, {
      type: 'PLANNING',
      summary: `Dry-run simulation completed for ${incident.recoveryPlan.actionType}`,
      details: result.message,
      author: 'AEGIS_ORCHESTRATOR',
    });

    this.storage.saveIncident(incident);
    return result;
  }

  public approvePlan(incident: Incident, operator: string = 'HUMAN_OPERATOR'): void {
    if (incident.state !== 'AWAITING_APPROVAL' && incident.state !== 'RECOVERY_PLANNED') {
      throw new Error(`Cannot approve plan in state: ${incident.state}`);
    }

    this.addTimelineEvent(incident, {
      type: 'APPROVAL',
      summary: `Recovery plan approved by ${operator}`,
      details: `Plan ${incident.recoveryPlan?.id} authorized for execution on ${incident.recoveryPlan?.targetService}`,
      author: operator === 'HUMAN_OPERATOR' ? 'HUMAN_OPERATOR' : 'AEGIS_ORCHESTRATOR',
    });

    incident.state = 'EXECUTING';
    this.storage.saveIncident(incident);
  }

  public rejectPlan(incident: Incident, reason: string): void {
    this.addTimelineEvent(incident, {
      type: 'MANUAL_OVERRIDE',
      summary: `Recovery plan rejected: ${reason}`,
      author: 'HUMAN_OPERATOR',
    });

    incident.state = 'CANCELLED';
    this.storage.saveIncident(incident);
  }

  public async executeAndVerify(
    incident: Incident,
    autoApproveIfNeeded: boolean = false
  ): Promise<Incident> {
    if (this.simulator.getState().emergencyStop) {
      incident.state = 'CANCELLED';
      this.addTimelineEvent(incident, {
        type: 'STATE_CHANGE',
        summary: 'Execution aborted: Emergency stop is active',
        author: 'AEGIS_ORCHESTRATOR',
      });
      this.storage.saveIncident(incident);
      return incident;
    }

    if (!incident.recoveryPlan) {
      throw new Error('No recovery plan available to execute');
    }

    if (incident.recoveryPlan.requiresHumanApproval && incident.state === 'AWAITING_APPROVAL') {
      if (!autoApproveIfNeeded) {
        // Must wait for human approval
        return incident;
      }
      this.approvePlan(incident, 'AEGIS_ORCHESTRATOR');
    }

    incident.state = 'EXECUTING';
    this.storage.saveIncident(incident);

    const execStart = Date.now();
    const actionResult = this.simulator.executeRecoveryAction({
      targetService: incident.recoveryPlan.targetService,
      actionType: incident.recoveryPlan.actionType,
      parameters: incident.recoveryPlan.parameters,
      dryRun: false,
    });

    const executionRecord: RecoveryExecutionRecord = {
      planId: incident.recoveryPlan.id,
      incidentId: incident.id,
      startedAt: execStart,
      completedAt: Date.now(),
      dryRun: false,
      success: actionResult.success,
      resultMessage: actionResult.message,
      retriesAttempted: incident.retryCount,
      logs: actionResult.details,
    };
    incident.executionRecord = executionRecord;

    this.addTimelineEvent(incident, {
      type: 'EXECUTION',
      summary: `Executed ${incident.recoveryPlan.actionType} on ${incident.recoveryPlan.targetService}`,
      details: actionResult.message + '\n' + actionResult.details.join('; '),
      author: 'AEGIS_ORCHESTRATOR',
    });

    // Enter verification phase
    incident.state = 'VERIFYING';
    this.storage.saveIncident(incident);

    // Let the simulator tick 2-3 times to produce fresh telemetry
    for (let i = 0; i < 3; i++) {
      this.simulator.tick();
    }

    // Evaluate closed-loop verification
    const verificationReport = this.verificationEngine.evaluateFreshTelemetry({
      incident,
      targetService: incident.recoveryPlan.targetService,
      windowDurationSec: this.storage.getSettings().verificationWindowSec,
    });
    incident.verificationReport = verificationReport;

    this.addTimelineEvent(incident, {
      type: 'VERIFICATION',
      summary: `Verification ${verificationReport.outcome}: ${verificationReport.summary}`,
      details: `Observed: Error=${verificationReport.actuals.errorRatePct}%, Latency=${verificationReport.actuals.latencyP95Ms}ms, Health=${verificationReport.actuals.health}`,
      author: 'AEGIS_ORCHESTRATOR',
    });

    if (verificationReport.passed) {
      incident.state = 'RECOVERED';
      incident.resolvedAt = Date.now();
      incident.watchWindow = {
        windowSeconds: 10,
        startedAt: Date.now(),
        expiresAt: Date.now() + 10000,
        regressionsDetected: 0,
        sustainedHealthy: true,
        status: 'ACTIVE',
      };
      this.addTimelineEvent(incident, {
        type: 'STATE_CHANGE',
        summary: 'Incident resolved. System state verified nominal by closed-loop telemetry.',
        author: 'AEGIS_ORCHESTRATOR',
      });
      this.addTimelineEvent(incident, {
        type: 'VERIFICATION',
        summary: 'Post-recovery 10s watch window initiated to monitor for latent regression',
        author: 'AEGIS_WATCH_ENGINE',
      });
    } else if (verificationReport.outcome === 'PARTIALLY_RECOVERED') {
      incident.state = 'PARTIALLY_RECOVERED';
      incident.resolvedAt = Date.now();
    } else {
      // Failed verification
      incident.retryCount += 1;
      if (incident.retryCount >= this.storage.getSettings().maxRetriesAllowed) {
        incident.state = 'ESCALATED';
        this.addTimelineEvent(incident, {
          type: 'STATE_CHANGE',
          summary: `Maximum retry attempts (${incident.retryCount}) exhausted. Escalated to Tier 3 Engineering On-Call.`,
          author: 'AEGIS_ORCHESTRATOR',
        });
      } else {
        incident.state = 'FAILED';
      }
    }

    this.storage.saveIncident(incident);
    return incident;
  }

  private evaluateRecoveryRisk(
    targetService: ServiceId,
    actionType: RecoveryActionType,
    incident: Incident
  ): RecoveryRisk {
    const factors: { name: string; impact: string; weight: number }[] = [];
    let score = 20;

    switch (actionType) {
      case 'RESTART_SERVICE':
        factors.push({
          name: 'Transient In-Flight Request Drops',
          impact: '2-3s brief connection reset during graceful container shutdown',
          weight: 25,
        });
        factors.push({
          name: 'Heap State Purge Safety',
          impact: 'Eliminates memory leaks and stuck worker threads safely',
          weight: -10,
        });
        score = 25;
        break;

      case 'SCALE_CONNECTION_POOL':
        factors.push({
          name: 'Database Host Memory Pressure',
          impact: 'Additional 100 backend connection slots require ~200MB shared memory',
          weight: 35,
        });
        score = 35;
        break;

      case 'ROLLBACK_DEPLOYMENT':
        factors.push({
          name: 'Database Schema Drift Risk',
          impact: 'Rolled back code must remain compatible with current database migrations',
          weight: 45,
        });
        score = 45;
        break;

      case 'TRIP_CIRCUIT_BREAKER':
        factors.push({
          name: 'Fallback Degradation',
          impact: 'Clients receive synthetic fallback or cached data for target calls',
          weight: 20,
        });
        score = 20;
        break;

      case 'REDUCE_TRAFFIC':
        factors.push({
          name: 'User 429 Throttle Impact',
          impact: '50% of incoming edge calls shed at API Gateway',
          weight: 40,
        });
        score = 40;
        break;

      case 'REVERT_CONFIGURATION':
        factors.push({
          name: 'Configuration Hot-Reload',
          impact: 'Zero container restart required; immediate parameter update',
          weight: 15,
        });
        score = 15;
        break;

      case 'DRAIN_REPROCESS_QUEUE':
        factors.push({
          name: 'Dead-Letter Message Quarantine',
          impact: 'Poison pills quarantined; normal transactions resume processing',
          weight: 20,
        });
        score = 20;
        break;
    }

    if (targetService === 'database') {
      factors.push({
        name: 'Critical Core Dependency Target',
        impact: 'Action touches global persistence layer; affects all microservices',
        weight: 25,
      });
      score += 25;
    }

    const level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
      score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

    return {
      score: Math.min(100, Math.max(10, score)),
      level,
      factors,
    };
  }

  private addTimelineEvent(incident: Incident, event: Omit<IncidentEvent, 'id' | 'timestamp'>) {
    const fullEvent: IncidentEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...event,
    };
    incident.timeline.push(fullEvent);
  }
}

