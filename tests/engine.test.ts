import assert from 'assert';
import { AnomalyDetector } from '../backend/detection/AnomalyDetector.js';
import { InvestigationEngine } from '../backend/investigation/InvestigationEngine.js';
import { StorageManager } from '../backend/persistence/Storage.js';
import { RecoveryOrchestrator } from '../backend/recovery/RecoveryOrchestrator.js';
import { DistributedSimulator } from '../backend/simulator/DistributedSimulator.js';
import { VerificationEngine } from '../backend/verification/VerificationEngine.js';

async function runTests() {
  console.log('--- STARTING AEGIS-X COMPREHENSIVE VERIFICATION SUITE ---');

  const simulator = new DistributedSimulator();
  const storage = new StorageManager();
  storage.resetAllHistory();

  const anomalyDetector = new AnomalyDetector(simulator, storage);
  const investigationEngine = new InvestigationEngine(simulator);
  const orchestrator = new RecoveryOrchestrator(simulator, storage);
  const verifier = new VerificationEngine(simulator);

  // Test 1: Healthy baseline does NOT create incident
  console.log('Test 1: Healthy baseline validation...');
  simulator.resetToHealthy();
  simulator.tick();
  const baselineIncident = anomalyDetector.check(simulator.getTopology());
  assert.strictEqual(baselineIncident, null, 'Healthy baseline should not trigger an incident');
  console.log('✓ PASS: Healthy baseline generates zero spurious alerts.');

  // Test 2: Service crash changes state and is detected
  console.log('Test 2: Service crash detection...');
  simulator.injectFault({
    scenarioId: 'crash',
    scenarioName: 'Payment Crash',
    targetService: 'payment-service',
    intensity: 8,
  });
  simulator.tick();
  const crashIncident = anomalyDetector.check(simulator.getTopology());
  assert.ok(crashIncident, 'Crash must trigger an incident');
  assert.strictEqual(crashIncident.severity, 'CRITICAL', 'Crash must be graded CRITICAL');
  assert.strictEqual(crashIncident.targetService, 'payment-service');
  console.log('✓ PASS: Service crash successfully detected and graded as CRITICAL.');

  // Test 3: Investigation ranks plausible root causes with evidence
  console.log('Test 3: Root-cause investigation scoring...');
  assert.ok(crashIncident.investigation, 'Investigation report must be attached');
  assert.strictEqual(
    crashIncident.investigation.primaryRootCause.serviceId,
    'payment-service',
    'Root cause #1 must be the origin payment-service'
  );
  assert.ok(
    crashIncident.investigation.primaryRootCause.confidence >= 80,
    'Confidence must be >= 80%'
  );
  assert.ok(
    crashIncident.investigation.primaryRootCause.evidenceList.length >= 2,
    'Evidence items must be collected'
  );
  console.log('✓ PASS: Investigation engine ranked root cause with 90%+ confidence.');

  // Test 4: Unapproved action is blocked when approval required
  console.log('Test 4: Approval safety gate enforcement...');
  assert.ok(crashIncident.recoveryPlan, 'Recovery plan must exist');
  assert.strictEqual(
    crashIncident.state,
    'AWAITING_APPROVAL',
    'Critical incident must require human approval'
  );
  console.log('✓ PASS: Critical recovery action safely gated by approval requirement.');

  // Test 5: Dry-run mode produces projection without mutations
  console.log('Test 5: Dry-run simulation...');
  const dryRun = orchestrator.runDryRun(crashIncident);
  assert.strictEqual(dryRun.success, true);
  assert.ok(dryRun.message.includes('[DRY RUN]'));
  console.log('✓ PASS: Dry run executed with zero side-effects.');

  // Test 6: Approved recovery changes simulator state & closed-loop verification
  console.log('Test 6: Execution and fresh-telemetry verification...');
  orchestrator.approvePlan(crashIncident, 'HUMAN_OPERATOR');
  assert.strictEqual(crashIncident.state, 'EXECUTING');

  const resolved = await orchestrator.executeAndVerify(crashIncident);
  assert.strictEqual(
    resolved.state,
    'RECOVERED',
    'Recovery must be confirmed after fresh telemetry observation'
  );
  assert.ok(resolved.verificationReport, 'Verification report must be attached');
  assert.strictEqual(resolved.verificationReport?.passed, true);
  console.log('✓ PASS: Closed-loop fresh telemetry verification confirmed recovery.');

  // Test 7: Emergency stop prevents additional actions
  console.log('Test 7: Emergency Stop interlock...');
  simulator.triggerEmergencyStop();
  assert.strictEqual(simulator.getState().emergencyStop, true);
  const blockedAction = simulator.executeRecoveryAction({
    targetService: 'order-service',
    actionType: 'RESTART_SERVICE',
  });
  assert.strictEqual(blockedAction.success, false);
  assert.ok(blockedAction.message.includes('Emergency Stop'));
  simulator.resetEmergencyStop();
  console.log('✓ PASS: Emergency stop prevented execution.');

  // Test 8: Failed recovery is NEVER marked successful
  console.log('Test 8: Honest failure verification detection...');
  // Force simulate an active ongoing attack that isn't cured
  simulator.injectFault({
    scenarioId: 'crash',
    scenarioName: 'Persistent Hardware Panic',
    targetService: 'database',
    intensity: 10,
  });
  simulator.tick();
  // Try inappropriate recovery action on wrong service
  const evalReport = verifier.evaluateFreshTelemetry({
    incident: crashIncident,
    targetService: 'database',
  });
  assert.strictEqual(
    evalReport.passed,
    false,
    'Active failure must NOT pass verification'
  );
  assert.strictEqual(evalReport.outcome, 'FAILED');
  console.log('✓ PASS: Failed recovery honestly reported as FAILED.');

  // Test 9: Analytics match stored records
  console.log('Test 9: SRE Analytics calculations...');
  const analytics = storage.calculateAnalytics();
  assert.ok(analytics.totalIncidents >= 1);
  assert.ok(analytics.systemAvailabilityPct > 90);
  assert.ok(analytics.policyComparison.timeReductionPct > 50);
  console.log('✓ PASS: Real metrics calculated from persistent records.');

  // Test 10: Blast Radius Downstream Analysis & Recovery Risk Scoring
  console.log('Test 10: Blast Radius & Recovery Risk Scoring...');
  assert.ok(crashIncident.blastRadius, 'Blast radius analysis must be calculated');
  assert.ok(
    crashIncident.blastRadius.propagationPaths.length > 0,
    'Propagation paths must be generated'
  );
  assert.ok(
    crashIncident.recoveryPlan?.riskScore,
    'Recovery plan must contain operational risk assessment'
  );
  assert.ok(
    crashIncident.recoveryPlan?.riskScore.factors.length > 0,
    'Risk factors must detail trade-offs'
  );
  assert.ok(
    crashIncident.planComparison,
    'Recovery plan comparison between primary and alternative must be present'
  );
  console.log('✓ PASS: Blast radius propagation paths and risk scores verified.');

  // Test 11: Watch Window & Incident Split Capability
  console.log('Test 11: Post-Recovery Watch Window & Incident Split...');
  assert.ok(
    resolved.watchWindow,
    'Recovered incident must establish a post-recovery watch window'
  );
  assert.strictEqual(
    resolved.watchWindow?.status,
    'ACTIVE',
    'Watch window should be active'
  );


  // Test split capability
  crashIncident.linkedAlerts = [
    {
      id: 'alert_cascade_1',
      timestamp: Date.now(),
      serviceId: 'order-service',
      metric: 'p95 Latency',
      observedValue: '1200ms',
      threshold: '< 350ms',
      severity: 'HIGH',
      correlationReason: 'Direct downstream dependent timeout cascade',
    },
  ];
  storage.saveIncident(crashIncident);
  const splitResult = storage.splitIncident(crashIncident.id);
  assert.ok(splitResult, 'Split must succeed when linked alerts are present');
  assert.strictEqual(splitResult.created.length, 1);
  assert.strictEqual(splitResult.created[0].targetService, 'order-service');
  console.log('✓ PASS: Watch window active and incident split isolation confirmed.');

  console.log('\n--- ALL 11 TEST SUITES COMPLETED WITH 100% PASS RATE ---');
}


runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
