import {
  ChaosScenarioConfig,
  RecoveryActionType,
  ServiceHealth,
  ServiceId,
  ServiceNode,
  SimulatorState,
  TelemetryPoint,
} from '../../shared/types.js';

interface ActiveFault {
  id: string;
  scenarioId: string;
  scenarioName: string;
  targetService: ServiceId;
  startedAt: number;
  intensity: number;
  configOverrides?: Record<string, any>;
}

export class DistributedSimulator {
  private nodes: Map<ServiceId, ServiceNode> = new Map();
  private activeFaults: Map<string, ActiveFault> = new Map();
  private tickCount: number = 0;
  private isRunning: boolean = true;
  private speed: number = 1;
  private emergencyStop: boolean = false;
  private telemetryHistory: TelemetryPoint[] = [];
  private readonly maxTelemetryPoints = 5000;

  constructor() {
    this.initializeTopology();
  }

  private initializeTopology() {
    const initialServices: ServiceNode[] = [
      {
        id: 'api-gateway',
        name: 'API Gateway',
        role: 'Ingress routing, SSL termination & rate limiting',
        version: 'v2.4.1',
        health: 'healthy',
        rps: 420,
        errorRate: 0.2,
        latencyP95: 38,
        cpuUsage: 28,
        memoryUsage: 35,
        restarts: 0,
        dependencies: ['auth-service', 'order-service'],
        x: 440,
        y: 60,
        config: {
          timeoutMs: 2500,
          maxConnections: 1000,
          rateLimitRps: 600,
          circuitBreakerOpen: false,
        },
      },
      {
        id: 'auth-service',
        name: 'Authentication Service',
        role: 'OAuth token validation, session vault & RBAC',
        version: 'v1.9.0',
        health: 'healthy',
        rps: 195,
        errorRate: 0.1,
        latencyP95: 18,
        cpuUsage: 22,
        memoryUsage: 30,
        restarts: 0,
        dependencies: [],
        x: 180,
        y: 190,
        config: {
          timeoutMs: 1500,
          maxConnections: 400,
          rateLimitRps: 400,
          circuitBreakerOpen: false,
        },
      },
      {
        id: 'order-service',
        name: 'Order Service',
        role: 'Checkout coordinator & transactional saga manager',
        version: 'v3.2.0',
        health: 'healthy',
        rps: 240,
        errorRate: 0.3,
        latencyP95: 52,
        cpuUsage: 34,
        memoryUsage: 48,
        restarts: 0,
        dependencies: ['payment-service', 'inventory-service', 'message-queue'],
        x: 440,
        y: 190,
        config: {
          timeoutMs: 3000,
          maxConnections: 500,
          rateLimitRps: 450,
          circuitBreakerOpen: false,
        },
      },
      {
        id: 'message-queue',
        name: 'Message Queue',
        role: 'Event bus for async notifications, orders & audit logs',
        version: 'v4.1.2',
        health: 'healthy',
        rps: 310,
        errorRate: 0.05,
        latencyP95: 12,
        cpuUsage: 25,
        memoryUsage: 40,
        queueDepth: 18,
        restarts: 0,
        dependencies: [],
        x: 720,
        y: 190,
        config: {
          timeoutMs: 2000,
          maxConnections: 800,
          rateLimitRps: 1000,
          circuitBreakerOpen: false,
        },
      },
      {
        id: 'payment-service',
        name: 'Payment Service',
        role: 'Card capture, fraud checks & ledger writes',
        version: 'v2.1.4',
        health: 'healthy',
        rps: 95,
        errorRate: 0.1,
        latencyP95: 64,
        cpuUsage: 26,
        memoryUsage: 38,
        restarts: 0,
        dependencies: ['database'],
        x: 300,
        y: 330,
        config: {
          timeoutMs: 4000,
          maxConnections: 200,
          rateLimitRps: 200,
          circuitBreakerOpen: false,
        },
      },
      {
        id: 'inventory-service',
        name: 'Inventory Service',
        role: 'Stock reservation, catalog sync & SKU validation',
        version: 'v1.8.3',
        health: 'healthy',
        rps: 145,
        errorRate: 0.15,
        latencyP95: 42,
        cpuUsage: 29,
        memoryUsage: 44,
        restarts: 0,
        dependencies: ['database'],
        x: 580,
        y: 330,
        config: {
          timeoutMs: 3000,
          maxConnections: 300,
          rateLimitRps: 350,
          circuitBreakerOpen: false,
        },
      },
      {
        id: 'database',
        name: 'Primary Database',
        role: 'ACID PostgreSQL cluster with connection pool',
        version: 'v16.2',
        health: 'healthy',
        rps: 520,
        errorRate: 0.05,
        latencyP95: 16,
        cpuUsage: 31,
        memoryUsage: 62,
        activeConnections: 34,
        restarts: 0,
        dependencies: [],
        x: 440,
        y: 460,
        config: {
          timeoutMs: 5000,
          maxConnections: 100,
          rateLimitRps: 1200,
          circuitBreakerOpen: false,
        },
      },
    ];

    for (const s of initialServices) {
      this.nodes.set(s.id, s);
    }
  }

  public getTopology(): ServiceNode[] {
    return Array.from(this.nodes.values());
  }

  public getService(id: ServiceId): ServiceNode | undefined {
    return this.nodes.get(id);
  }

  public getState(): SimulatorState {
    return {
      running: this.isRunning,
      tickCount: this.tickCount,
      speed: this.speed,
      activeFaults: Array.from(this.activeFaults.values()),
      emergencyStop: this.emergencyStop,
    };
  }

  public setRunning(running: boolean) {
    this.isRunning = running;
  }

  public setSpeed(speed: number) {
    this.speed = Math.max(1, Math.min(5, speed));
  }

  public triggerEmergencyStop(): void {
    this.emergencyStop = true;
    this.activeFaults.clear();
    // Throttle all traffic to nominal safe mode
    for (const node of this.nodes.values()) {
      node.config.rateLimitRps = Math.min(node.config.rateLimitRps, 50);
      node.config.circuitBreakerOpen = true;
    }
  }

  public resetEmergencyStop(): void {
    this.emergencyStop = false;
    for (const node of this.nodes.values()) {
      node.config.circuitBreakerOpen = false;
    }
  }

  public injectFault(fault: {
    scenarioId: string;
    scenarioName: string;
    targetService: ServiceId;
    intensity: number;
    parameters?: Record<string, any>;
  }): string {
    if (this.emergencyStop) {
      throw new Error('Cannot inject fault: Emergency Stop is active');
    }
    const id = `flt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const active: ActiveFault = {
      id,
      scenarioId: fault.scenarioId,
      scenarioName: fault.scenarioName,
      targetService: fault.targetService,
      startedAt: Date.now(),
      intensity: fault.intensity,
      configOverrides: fault.parameters,
    };
    this.activeFaults.set(id, active);
    return id;
  }

  public clearFault(faultId: string): boolean {
    return this.activeFaults.delete(faultId);
  }

  public clearAllFaults(): void {
    this.activeFaults.clear();
  }

  public resetToHealthy(): void {
    this.activeFaults.clear();
    this.emergencyStop = false;
    this.initializeTopology();
  }

  /**
   * Executes a safe recovery action directly modifying the simulated state.
   */
  public executeRecoveryAction(action: {
    targetService: ServiceId;
    actionType: RecoveryActionType;
    parameters?: Record<string, any>;
    dryRun?: boolean;
  }): { success: boolean; message: string; details: string[] } {
    if (this.emergencyStop) {
      return {
        success: false,
        message: 'Action rejected: System is under Emergency Stop lockout.',
        details: ['Emergency stop flag active', 'No mutations permitted'],
      };
    }

    const node = this.nodes.get(action.targetService);
    if (!node) {
      return {
        success: false,
        message: `Unknown target service: ${action.targetService}`,
        details: ['Target does not exist in topology graph'],
      };
    }

    if (action.dryRun) {
      return {
        success: true,
        message: `[DRY RUN] Simulation verification passed for ${action.actionType} on ${node.name}. No side effects applied.`,
        details: [
          `Target: ${node.name} (${node.id})`,
          `Current Health: ${node.health}`,
          `Projected Action: ${action.actionType}`,
          `Preconditions verified: Target alive, parameters schema valid, safety bounds respected`,
        ],
      };
    }

    const details: string[] = [];

    // Remove any active fault attacking this service if the action addresses it
    for (const [fId, fault] of this.activeFaults.entries()) {
      if (fault.targetService === action.targetService) {
        if (
          (action.actionType === 'RESTART_SERVICE' && fault.scenarioId === 'crash') ||
          (action.actionType === 'REVERT_CONFIGURATION' && fault.scenarioId === 'config_regression') ||
          (action.actionType === 'SCALE_CONNECTION_POOL' && fault.scenarioId === 'db_saturation') ||
          (action.actionType === 'DRAIN_REPROCESS_QUEUE' && fault.scenarioId === 'queue_backlog') ||
          (action.actionType === 'ROLLBACK_DEPLOYMENT' && fault.scenarioId === 'latency_spike') ||
          (action.actionType === 'TRIP_CIRCUIT_BREAKER' && fault.scenarioId === 'dependency_outage') ||
          action.actionType === 'RESTART_SERVICE'
        ) {
          this.activeFaults.delete(fId);
          details.push(`Neutralized active fault: ${fault.scenarioName} [${fId}]`);
        }
      }
    }

    switch (action.actionType) {
      case 'RESTART_SERVICE':
        node.restarts += 1;
        node.health = 'healthy';
        node.errorRate = 0.2;
        node.latencyP95 = 45;
        node.cpuUsage = 24;
        node.lastErrorLog = undefined;
        details.push(`Service ${node.name} pod restarted successfully. Total restarts: ${node.restarts}`);
        details.push(`Cleared internal memory leak / deadlocked execution threads.`);
        break;

      case 'REVERT_CONFIGURATION':
        node.config.timeoutMs = 3000;
        node.config.rateLimitRps = 450;
        node.health = 'healthy';
        node.errorRate = 0.2;
        node.lastErrorLog = undefined;
        details.push(`Restored baseline configuration: timeout=3000ms, rateLimit=450 rps`);
        details.push(`Verified credentials and token validation secrets in vault`);
        break;

      case 'SCALE_CONNECTION_POOL':
        if (node.id === 'database') {
          node.config.maxConnections = 200;
          node.activeConnections = 42;
          node.health = 'healthy';
          node.latencyP95 = 18;
          node.errorRate = 0.1;
          details.push(`Scaled PostgreSQL connection pool limit from 100 to 200.`);
          details.push(`Flushed stale idle sessions. Active connections normalized to 42.`);
        }
        break;

      case 'DRAIN_REPROCESS_QUEUE':
        if (node.id === 'message-queue') {
          node.queueDepth = 15;
          node.health = 'healthy';
          node.errorRate = 0.05;
          details.push(`Purged poisoned DLQ poison messages; backlogged items drained to workers.`);
          details.push(`Queue depth returned to safe baseline: 15 items.`);
        }
        break;

      case 'ROLLBACK_DEPLOYMENT':
        node.version = 'v2.1.3-stable';
        node.health = 'healthy';
        node.latencyP95 = 55;
        node.errorRate = 0.1;
        details.push(`Rolled back release artifact to previous verified stable build: v2.1.3-stable`);
        details.push(`Bypassed regression code in calculation engine.`);
        break;

      case 'TRIP_CIRCUIT_BREAKER':
        node.config.circuitBreakerOpen = true;
        node.health = 'healthy';
        node.errorRate = 0.5;
        details.push(`Tripped circuit breaker on ${node.name}. Downstream calls short-circuited to cached fallback.`);
        details.push(`Prevented cascading thread exhaustion.`);
        break;

      case 'REDUCE_TRAFFIC':
        node.config.rateLimitRps = Math.round(node.config.rateLimitRps * 0.5);
        node.rps = Math.round(node.rps * 0.5);
        details.push(`Applied 50% rate-shedding token bucket. Load reduced to ${node.rps} rps.`);
        break;

      default:
        details.push(`Action executed: ${action.actionType}`);
    }

    return {
      success: true,
      message: `Recovery action ${action.actionType} successfully applied to ${node.name}.`,
      details,
    };
  }

  /**
   * Main discrete simulation step (invoked every 1 second or simulator tick)
   */
  public tick(): TelemetryPoint[] {
    if (!this.isRunning) return [];
    this.tickCount++;
    const now = Date.now();
    const currentPoints: TelemetryPoint[] = [];

    // 1. Reset baseline noise for healthy state
    for (const node of this.nodes.values()) {
      const jitter = (Math.random() - 0.5) * 4;
      const rpsJitter = (Math.random() - 0.5) * 10;

      const hasDirectFault = Array.from(this.activeFaults.values()).some(
        (f) => f.targetService === node.id
      );

      if (!hasDirectFault) {
        node.health = 'healthy';
        node.errorRate = Math.max(0.01, +(0.15 + (Math.random() - 0.5) * 0.1).toFixed(2));
        node.cpuUsage = Math.min(60, Math.max(15, Math.round(28 + jitter * 0.5)));
        node.memoryUsage = Math.min(80, Math.max(25, Math.round(35 + (Math.random() - 0.5))));
        if (node.id === 'database') {
          node.activeConnections = Math.min(60, Math.max(20, Math.round(35 + jitter)));
          node.latencyP95 = Math.max(10, Math.round(16 + jitter * 0.8));
        } else if (node.id === 'message-queue') {
          node.queueDepth = Math.max(5, Math.round(18 + jitter));
          node.latencyP95 = Math.max(8, Math.round(12 + jitter * 0.5));
        } else {
          node.latencyP95 = Math.max(15, Math.round(38 + jitter * 0.4));
        }
        node.rps = Math.max(50, Math.round(node.rps + rpsJitter));
      }
    }

    // 2. Apply active faults directly to target nodes
    for (const fault of this.activeFaults.values()) {
      const target = this.nodes.get(fault.targetService);
      if (!target) continue;

      const intensity = fault.intensity || 5;

      switch (fault.scenarioId) {
        case 'crash':
          target.health = 'offline';
          target.errorRate = 100;
          target.latencyP95 = 5000;
          target.rps = 0;
          target.cpuUsage = 0;
          target.lastErrorLog = `FATAL [SIGSEGV]: Worker process died unexpectedly. Uncaught memory panic in thread 0x4B9F.`;
          break;

        case 'latency_spike':
          target.health = 'degraded';
          const addedDelay = 1200 + intensity * 250;
          target.latencyP95 = Math.round(addedDelay + (Math.random() - 0.5) * 80);
          target.cpuUsage = Math.min(98, 70 + intensity * 3);
          target.errorRate = +(3.5 + intensity * 0.8).toFixed(2);
          target.lastErrorLog = `WARN: Thread pool saturated. Response time exceeded SLA threshold (${target.latencyP95}ms > 200ms).`;
          break;

        case 'db_saturation':
          if (target.id === 'database') {
            target.health = 'critical';
            target.activeConnections = 100; // max out pool
            target.latencyP95 = 3400 + intensity * 200;
            target.cpuUsage = 96;
            target.errorRate = +(22 + intensity * 3.5).toFixed(2);
            target.lastErrorLog = `FATAL: PostgreSQL connection pool exhausted (100/100). Remaining 45 client queries queued or timed out with 504.`;
          }
          break;

        case 'queue_backlog':
          if (target.id === 'message-queue') {
            target.health = 'critical';
            target.queueDepth = Math.min(5000, 800 + intensity * 350 + this.tickCount * 40);
            target.latencyP95 = 450 + intensity * 60;
            target.cpuUsage = 88;
            target.errorRate = +(6.5 + intensity * 1.2).toFixed(2);
            target.lastErrorLog = `ALERT: Dead-letter queue buildup. Consumer workers stalled. Unprocessed events count: ${target.queueDepth}.`;
          }
          break;

        case 'config_regression':
          target.health = 'critical';
          target.errorRate = +(85 + (Math.random() - 0.5) * 5).toFixed(2);
          target.latencyP95 = 120;
          target.lastErrorLog = `ERROR [AUTH_FAIL]: Signature verification key mismatch. Public key ID missing from keystore. Rejection rate: ${target.errorRate}%.`;
          break;

        case 'dependency_outage':
          target.health = 'offline';
          target.errorRate = 98;
          target.latencyP95 = 4500;
          target.lastErrorLog = `ERROR [CONNECTION_REFUSED]: Remote upstream socket closed abruptly. Connection reset by peer.`;
          break;

        case 'transient_errors':
          target.health = 'degraded';
          target.errorRate = +(18 + intensity * 2.5 + (Math.random() - 0.5) * 4).toFixed(2);
          target.latencyP95 = Math.round(180 + intensity * 25);
          target.lastErrorLog = `WARN: Intermittent transport drop. TCP socket reset on egress interface.`;
          break;

        default:
          target.health = 'degraded';
          target.errorRate = 25;
      }
    }

    // 3. Compute cascading effects across the directed dependency graph
    // Database saturation or failure propagates up to Payment and Inventory
    const db = this.nodes.get('database')!;
    const payment = this.nodes.get('payment-service')!;
    const inventory = this.nodes.get('inventory-service')!;
    const order = this.nodes.get('order-service')!;
    const auth = this.nodes.get('auth-service')!;
    const gateway = this.nodes.get('api-gateway')!;

    // Propagate from DB -> Payment & Inventory
    if (db.health === 'critical' || db.health === 'offline' || db.latencyP95 > 1000) {
      if (payment.health === 'healthy') {
        payment.health = 'degraded';
        payment.errorRate = Math.max(payment.errorRate, Math.min(85, +(db.errorRate * 0.85).toFixed(2)));
        payment.latencyP95 = Math.max(payment.latencyP95, Math.round(db.latencyP95 * 0.9 + 50));
      }
      if (inventory.health === 'healthy') {
        inventory.health = 'degraded';
        inventory.errorRate = Math.max(inventory.errorRate, Math.min(75, +(db.errorRate * 0.75).toFixed(2)));
        inventory.latencyP95 = Math.max(inventory.latencyP95, Math.round(db.latencyP95 * 0.8 + 40));
      }
    }

    // Propagate from Payment, Inventory & MQ -> Order Service
    if (
      payment.health !== 'healthy' ||
      inventory.health !== 'healthy' ||
      (this.nodes.get('message-queue')!.queueDepth || 0) > 600
    ) {
      if (order.health === 'healthy') {
        order.health = 'degraded';
        const combinedError = Math.max(payment.errorRate * 0.6, inventory.errorRate * 0.5);
        order.errorRate = Math.max(order.errorRate, Math.min(75, +combinedError.toFixed(2)));
        const maxDownstreamLat = Math.max(payment.latencyP95, inventory.latencyP95);
        order.latencyP95 = Math.max(order.latencyP95, Math.min(4500, Math.round(maxDownstreamLat * 0.85 + 30)));
      }
    }

    // Propagate from Order Service and Auth Service -> API Gateway
    if (order.health !== 'healthy' || auth.health !== 'healthy') {
      if (gateway.health === 'healthy') {
        gateway.health = 'degraded';
        const impact = Math.max(order.errorRate * 0.7, auth.errorRate * 0.8);
        gateway.errorRate = Math.max(gateway.errorRate, Math.min(80, +impact.toFixed(2)));
        gateway.latencyP95 = Math.max(gateway.latencyP95, Math.round(order.latencyP95 * 0.8 + 25));
      }
    }

    // 4. Record telemetry points
    for (const node of this.nodes.values()) {
      const pt: TelemetryPoint = {
        timestamp: now,
        serviceId: node.id,
        rps: node.rps,
        errorRate: node.errorRate,
        latencyP95: node.latencyP95,
        cpuUsage: node.cpuUsage,
        queueDepth: node.queueDepth || 0,
        activeConnections: node.activeConnections || 0,
        health: node.health,
      };
      this.telemetryHistory.push(pt);
      currentPoints.push(pt);
    }

    // Bound telemetry history to ring buffer limit
    if (this.telemetryHistory.length > this.maxTelemetryPoints) {
      this.telemetryHistory.splice(0, this.telemetryHistory.length - this.maxTelemetryPoints);
    }

    return currentPoints;
  }

  public getTelemetryHistory(serviceId?: ServiceId, windowSeconds: number = 300): TelemetryPoint[] {
    const cutoff = Date.now() - windowSeconds * 1000;
    return this.telemetryHistory.filter((pt) => {
      if (pt.timestamp < cutoff) return false;
      if (serviceId && pt.serviceId !== serviceId) return false;
      return true;
    });
  }
}

export const simulator = new DistributedSimulator();
