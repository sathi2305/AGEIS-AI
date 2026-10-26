# AEGIS-X: Autonomous Reliability Guardian & Incident Recovery System

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![OmniRush Buildathon](https://img.shields.io/badge/OmniRush-2026%20Agentic%20Buildathon-emerald.svg)](https://aistudio.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)

> **AEGIS-X** is an autonomous engineering guardian and closed-loop reliability recovery platform. It continuously observes a simulated distributed system, detects anomalies, investigates causal root causes with explainable deterministic scoring, formulates safe mitigation plans, executes approved actions in a local container sandbox, and verifies recovery using fresh post-action telemetry.

---

## 1. Core Lifecycle & Architecture

AEGIS-X operates a continuous, closed-loop state machine:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   OBSERVE    │ ──> │    DETECT    │ ──> │ INVESTIGATE  │ ──> │  PLAN & GATE │
│ Sliding Win. │     │ SLA Breaches │     │ Graph Walk   │     │ Safety Policy│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐             ▼
│  LEARN & SRE │ <── │    VERIFY    │ <── │   EXECUTE    │ <── ┌──────────────┐
│  Analytics   │     │ Fresh Telem. │     │ Sandbox Acts │     │   APPROVE    │
└──────────────┘     └──────────────┘     └──────────────┘     │ Human-in-Loop│
                                                               └──────────────┘
```

### Architectural Subsystems

1. **Distributed System Simulator (`backend/simulator/`)**: Discrete-time event engine modeling 7 interdependent microservices with realistic traffic distributions, latency propagation, thread pools, and database connection limits.
2. **Telemetry Sliding Window (`backend/telemetry/`)**: Ring buffer storing time-series measurements (RPS, Error Rate %, p95 Latency ms, CPU %, RAM %, Queue Depth, DB connections).
3. **Anomaly Detector (`backend/detection/`)**: Continuous rule & statistical threshold scanner with deduplication and severity grading (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
4. **Root-Cause Investigation Engine (`backend/investigation/`)**: Explainable heuristic scoring formula ranking hypotheses by topological depth, metric deviations, and stdout crash signatures.
5. **Recovery Orchestrator (`backend/recovery/`)**: State machine enforcing allowlists, bounded retries, dry runs, and human approval gates.
6. **Closed-Loop Verification Engine (`backend/verification/`)**: Strictly evaluates fresh post-action telemetry against quantitative criteria (Error Rate ≤ 2.0%, Latency ≤ 150ms).
7. **Reliability Analytics (`backend/persistence/`)**: Persistent audit storage calculating empirical MTTD, MTTR, availability %, and comparative baseline benchmarks.

---

## 2. Distributed Microservice Topology

```
                  ┌──────────────────────┐
                  │     API Gateway      │
                  │ (Ingress & Routing)  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌──────────────────────┐          ┌──────────────────────┐
│Authentication Service│          │    Order Service     │
│ (JWT Vault & RBAC)   │          │ (Checkout Coordinator│
└──────────────────────┘          └──────────┬───────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
            ┌──────────────────────┐ ┌───────────────┐ ┌──────────────────────┐
            │   Payment Service    │ │Inventory Svc  │ │    Message Queue     │
            │(Stripe/Ledger Writes)│ │ (Stock Lock)  │ │ (Async OrderPlaced)  │
            └──────────┬───────────┘ └───────┬───────┘ └──────────────────────┘
                       │                     │
                       └──────────┬──────────┘
                                  ▼
                     ┌────────────────────────┐
                     │   Primary PostgreSQL   │
                     │(Connection Pool: 100)  │
                     └────────────────────────┘
```

---

## 3. Predefined Chaos Scenarios

| Scenario ID | Name | Category | Primary Target | Observable Cascade |
| :--- | :--- | :--- | :--- | :--- |
| `crash` | Service Hard Crash | `CRASH` | `payment-service` | SIGSEGV panic, 100% error rate, Gateway 502/504 cascade |
| `db_saturation` | PostgreSQL Pool Exhaustion | `SATURATION` | `database` | 100/100 connections pegged, 3400ms latency, timeouts |
| `latency_spike` | Downstream Latency Regression | `LATENCY` | `inventory-service` | Full scan table lock, p95 latency > 2000ms |
| `queue_backlog` | Dead-Letter Queue Backpressure | `BACKLOG` | `message-queue` | Queue depth spikes from 18 to 2000+ items |
| `config_regression` | Authentication Key Mismatch | `CONFIG` | `auth-service` | 85% 401 Unauthorized rejections across API Gateway |
| `dependency_outage` | Route Disconnection | `OUTAGE` | `auth-service` | TCP connection refused, upstream client dropouts |
| `transient_errors` | Intermittent Transport Drops | `TRANSIENT` | `order-service` | 15-25% sporadic packet drops, high variance |

---

## 4. Safety Governance & Threat Model

- **Workspace Isolation**: Actions only mutate the local distributed system simulator memory. Never executes arbitrary shell scripts or touches host filesystems.
- **Strict Allowlist**: Only pre-approved primitives (`RESTART_SERVICE`, `REVERT_CONFIGURATION`, `SCALE_CONNECTION_POOL`, `DRAIN_REPROCESS_QUEUE`, `ROLLBACK_DEPLOYMENT`, `TRIP_CIRCUIT_BREAKER`, `REDUCE_TRAFFIC`) can be scheduled.
- **Human-in-the-Loop Interlock**: Consequential actions (`HIGH` and `CRITICAL`) require explicit operator authorization in the UI unless explicitly configured by policy.
- **Bounded Retries**: Orchestrator stops after max allowable retries (default: 3) and escalates to human on-call.
- **Emergency Stop (E-STOP)**: Physical interlock immediately neutralizes ongoing chaos injections, trips circuit breakers, throttles traffic, and rejects all in-flight mutations.

---

## 5. Quick Start & Deployment

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm run test:engine  # or: npx tsx tests/engine.test.ts

# 3. Start full-stack dev server (API + Vite)
npm run dev

# Open http://localhost:3000
```

### Docker Deployment

```bash
# Build & run with Docker Compose
docker-compose up --build

# Open http://localhost:3000
```

---

## 6. Repeatable 13-Step Guided Evaluation Demo

Click **"Guided Demo"** in the top navigation bar to execute the official 13-step evaluation walkthrough:

1. **Topology Preview**: Inspect the 7 microservices in nominal state.
2. **Baseline Telemetry**: Observe <0.2% error rate and normal 35ms latency.
3. **Inject Failure**: Trigger a deterministic `payment-service` crash.
4. **Observe Degradation**: Watch the live SVG error rate and latency graphs spike.
5. **Detection**: Observe anomaly detector catch the breach in < 3s.
6. **Investigation**: Inspect rank #1 root cause hypothesis with 95%+ confidence score and causal evidence.
7. **Recovery Formulation**: Review the proposed plan with safety checks.
8. **Approval Gate**: Authorize the action via the operator dialog.
9. **Execution**: Watch container restart and audit trail generation.
10. **Closed-Loop Verification**: Observe fresh telemetry window confirming error rate ≤ 2.0% and latency ≤ 150ms.
11. **Incident Timeline**: Inspect auditable chronological lifecycle events.
12. **Analytics**: Review MTTR reduction (14s vs 1,140s manual SRE baseline).
13. **Honest Failure Proof**: Demonstrates how AEGIS-X detects ineffective actions and flags `FAILED` rather than fabricating success.
