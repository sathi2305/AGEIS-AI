export type ServiceId =
  | 'api-gateway'
  | 'auth-service'
  | 'order-service'
  | 'payment-service'
  | 'inventory-service'
  | 'message-queue'
  | 'database';

export type ServiceHealth = 'healthy' | 'degraded' | 'critical' | 'offline';

export interface ServiceNode {
  id: ServiceId;
  name: string;
  role: string;
  version: string;
  health: ServiceHealth;
  rps: number;
  errorRate: number; // 0 to 100 percentage
  latencyP95: number; // in ms
  cpuUsage: number; // 0 to 100 percentage
  memoryUsage: number; // 0 to 100 percentage
  queueDepth?: number;
  activeConnections?: number;
  restarts: number;
  dependencies: ServiceId[];
  x: number;
  y: number;
  config: {
    timeoutMs: number;
    maxConnections: number;
    rateLimitRps: number;
    circuitBreakerOpen: boolean;
  };
  lastErrorLog?: string;
}

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IncidentState =
  | 'MONITORING'
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'RECOVERY_PLANNED'
  | 'AWAITING_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'RECOVERED'
  | 'PARTIALLY_RECOVERED'
  | 'FAILED'
  | 'ESCALATED'
  | 'CANCELLED';

export interface TelemetryPoint {
  timestamp: number;
  serviceId: ServiceId;
  rps: number;
  errorRate: number;
  latencyP95: number;
  cpuUsage: number;
  queueDepth: number;
  activeConnections: number;
  health: ServiceHealth;
}

export interface MetricSnapshot {
  timestamp: number;
  services: Record<ServiceId, {
    health: ServiceHealth;
    rps: number;
    errorRate: number;
    latencyP95: number;
    cpuUsage: number;
    queueDepth?: number;
    activeConnections?: number;
  }>;
  systemAvailability: number;
  totalRps: number;
  avgLatency: number;
  overallErrorRate: number;
}

export interface IncidentEvent {
  id: string;
  timestamp: number;
  type: 'DETECTION' | 'INVESTIGATION' | 'PLANNING' | 'APPROVAL' | 'EXECUTION' | 'VERIFICATION' | 'STATE_CHANGE' | 'MANUAL_OVERRIDE';
  summary: string;
  details?: string;
  author: 'AEGIS_ORCHESTRATOR' | 'HUMAN_OPERATOR' | 'SYSTEM_TELEMETRY' | 'AEGIS_CORRELATION_ENGINE' | 'AEGIS_WATCH_ENGINE';
}


export interface EvidenceItem {
  id: string;
  metric: string;
  serviceId: ServiceId;
  observedValue: string;
  baselineValue: string;
  deviationScore: number; // 0 - 100
  description: string;
  significance: 'PRIMARY' | 'CONTRIBUTING' | 'CORRELATED';
}

export interface RootCauseHypothesis {
  id: string;
  rank: number;
  serviceId: ServiceId;
  title: string;
  mechanism: string;
  confidence: number; // 0 to 100 percentage
  scoreBreakdown: {
    originWeight: number;
    metricDeviation: number;
    cascadeHopPenalty: number;
    logSignatureMatch: number;
  };
  evidenceList: EvidenceItem[];
  missingEvidenceNotes?: string;
  recommendedActionType: RecoveryActionType;
}

export interface InvestigationReport {
  incidentId: string;
  timestamp: number;
  primaryRootCause: RootCauseHypothesis;
  alternativeHypotheses: RootCauseHypothesis[];
  affectedDependencyChain: ServiceId[];
  telemetryWindowDurationSec: number;
  confidenceExplanation: string;
  uncertaintyNotes: string;
  recommendedNextStep: string;
}

export type RecoveryActionType =
  | 'RESTART_SERVICE'
  | 'REVERT_CONFIGURATION'
  | 'REDUCE_TRAFFIC'
  | 'ROLLBACK_DEPLOYMENT'
  | 'DRAIN_REPROCESS_QUEUE'
  | 'TRIP_CIRCUIT_BREAKER'
  | 'SCALE_CONNECTION_POOL';

export interface RecoveryPlan {
  id: string;
  incidentId: string;
  targetService: ServiceId;
  actionType: RecoveryActionType;
  title: string;
  description: string;
  parameters: Record<string, any>;
  expectedImpact: string;
  preconditions: string[];
  safetyChecks: {
    name: string;
    passed: boolean;
    reason: string;
  }[];
  requiresHumanApproval: boolean;
  rollbackPlan: string;
  rollbackAvailable?: boolean;
  rollbackPrerequisites?: string[];
  riskScore?: RecoveryRisk;
  estimatedRecoveryTimeSec: number;
}

export interface RecoveryRisk {
  score: number; // 0 - 100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: {
    name: string;
    impact: string;
    weight: number;
  }[];
}

export interface RecoveryPlanComparison {
  primaryPlan: RecoveryPlan;
  alternativePlan: RecoveryPlan;
  tradeoffSummary: string;
  recommendedPlanId: string;
}

export interface BlastRadiusAnalysis {
  directAffectedServices: ServiceId[];
  indirectAffectedServices: ServiceId[];
  estimatedRpsImpact: number;
  blastRadiusScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  propagationPaths: string[];
  measuredDownstreamFailures: number;
}

export interface LinkedAlert {
  id: string;
  timestamp: number;
  serviceId: ServiceId;
  metric: string;
  observedValue: string;
  threshold: string;
  severity: IncidentSeverity;
  correlationReason: string;
}

export interface WatchWindowRecord {
  windowSeconds: number;
  startedAt: number;
  expiresAt: number;
  regressionsDetected: number;
  sustainedHealthy: boolean;
  status: 'ACTIVE' | 'PASSED' | 'REGRESSED';
}

export interface ServiceHealthScore {
  serviceId: ServiceId;
  name: string;
  health: ServiceHealth;
  healthPct: number; // 0 - 100%
  changeDeltaPct: number; // e.g. +0.4 or -58.2
  trend: 'up' | 'down' | 'steady';
  errorRate: number;
  latencyP95: number;
  rps: number;
}

export interface RecoveryExecutionRecord {
  planId: string;
  incidentId: string;
  startedAt: number;
  completedAt?: number;
  dryRun: boolean;
  success: boolean;
  resultMessage: string;
  retriesAttempted: number;
  logs: string[];
}

export interface VerificationCriteria {
  maxErrorRatePct: number;
  maxLatencyP95Ms: number;
  requiredHealth: ServiceHealth[];
  maxQueueDepth?: number;
  observationWindowSec: number;
}

export interface VerificationReport {
  incidentId: string;
  evaluatedAt: number;
  windowDurationSec: number;
  criteria: VerificationCriteria;
  actuals: {
    errorRatePct: number;
    latencyP95Ms: number;
    health: ServiceHealth;
    queueDepth?: number;
  };
  passed: boolean;
  outcome: 'RECOVERED' | 'PARTIALLY_RECOVERED' | 'FAILED' | 'TIMED_OUT';
  summary: string;
  recommendation: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  state: IncidentState;
  targetService: ServiceId;
  impactedServices: ServiceId[];
  detectedAt: number;
  resolvedAt?: number;
  summary: string;
  triggerMetric: string;
  triggerValue: string;
  threshold: string;
  investigation?: InvestigationReport;
  recoveryPlan?: RecoveryPlan;
  executionRecord?: RecoveryExecutionRecord;
  verificationReport?: VerificationReport;
  timeline: IncidentEvent[];
  retryCount: number;
  autoRecoveryEligible: boolean;
  correlationId?: string;
  linkedAlerts?: LinkedAlert[];
  blastRadius?: BlastRadiusAnalysis;
  planComparison?: RecoveryPlanComparison;
  watchWindow?: WatchWindowRecord;
}

export interface ChaosScenarioConfig {
  id: string;
  name: string;
  category: 'CRASH' | 'LATENCY' | 'SATURATION' | 'OUTAGE' | 'BACKLOG' | 'CONFIG' | 'TRANSIENT';
  targetService: ServiceId;
  title: string;
  description: string;
  parameters: {
    intensity: number; // 1 to 10
    durationSec?: number;
    delayMs?: number;
    errorRateTarget?: number;
  };
  expectedObservableEffects: string[];
}

export interface SimulatorState {
  running: boolean;
  tickCount: number;
  speed: number; // 1x, 2x, 5x
  activeFaults: {
    id: string;
    scenarioId: string;
    scenarioName: string;
    targetService: ServiceId;
    startedAt: number;
    intensity: number;
  }[];
  emergencyStop: boolean;
}

export interface PolicySettings {
  autoApprovalThreshold: IncidentSeverity; // e.g. approve LOW and MEDIUM automatically, require manual for HIGH/CRITICAL
  requireApprovalAlways: boolean;
  maxRetriesAllowed: number;
  verificationWindowSec: number;
  errorThresholdPct: number;
  latencyThresholdMs: number;
  circuitBreakerThresholdPct: number;
  simulatorSpeed: number;
  telemetryRetentionMinutes: number;
}

export interface DayIncidentFrequency {
  dayLabel: string;
  dateStr: string;
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReliabilityAnalytics {
  meanTimeToDetectSec: number;
  meanTimeToRecoverSec: number;
  totalIncidents: number;
  resolvedIncidents: number;
  failedRecoveries: number;
  systemAvailabilityPct: number;
  recoverySuccessRatePct: number;
  severityDistribution: Record<IncidentSeverity, number>;
  actionDistribution: Record<string, number>;
  sevenDayFrequency?: DayIncidentFrequency[];
  policyComparison: {
    baselineAvgMttrSec: number;
    aegisAutonomousMttrSec: number;
    timeReductionPct: number;
    preventedDowntimeMinutes: number;
  };
}
