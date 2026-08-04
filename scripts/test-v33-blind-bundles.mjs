#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V33_MODELS, assert, validateBlindAdjudication } from "./lib/v33-blind-bundles.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.3/retired-three-debate-test";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifest = JSON.parse(await read(`${gateRoot}/gate-manifest.json`));
let assertionCount = 0;
const expectFailure = (fn, pattern) => {
  let failed = false;
  try { fn(); } catch (error) { failed = pattern.test(error.message); }
  assert(failed, `expected failure matching ${pattern}`);
  assertionCount += 1;
};
const first = manifest.sample.debates[0], packet = JSON.parse(await read(first.blindPacket.path));
assert(packet.blindness.candidateValuesAbsent && packet.blindness.rawModelIdentitiesAbsent && packet.blindness.agreementStatusAbsent, "packet blindness declaration invalid");
assert(!JSON.stringify(packet).includes('"candidateA') && !JSON.stringify(packet).includes('"candidateB') && !JSON.stringify(packet).includes('"rawAgreement"'), "packet leaks candidate or agreement fields");
assertionCount += 2;

const defaultByField = (decision) => decision.allowedSemanticJson[0];
const valid = {
  schemaVersion: "3.3-blind-bundle-adjudication", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion,
  model: V33_MODELS.terra, debateId: packet.debateId, debateNumber: packet.debateNumber,
  isolationStatement: "This fixture used only the five allowlisted blind adjudication inputs and saw no candidate or score data.",
  bundles: packet.bundles.map((bundle) => ({
    bundleId: bundle.bundleId,
    decisions: bundle.decisions.map((decision) => ({ decisionId: decision.decisionId, fieldPath: decision.fieldPath, semanticJson: defaultByField(decision), evidenceText: null, rationale: "The default remains because the fixture supplies no qualifying nondefault evidence." }))
  })),
  audit: { bundleCount: packet.bundleCount, decisionCount: packet.decisionCount, allDecisionsMadeOnce: true, candidateDataSeen: false, scoresSeen: false }
};
validateBlindAdjudication(valid, packet, "terra");
assertionCount += 1;

const wrongSemantic = structuredClone(valid);
wrongSemantic.bundles[0].decisions[0].semanticJson = '"not-allowed"';
expectFailure(() => validateBlindAdjudication(wrongSemantic, packet, "terra"), /not allowlisted/);
const wrongEvidence = structuredClone(valid);
const targetDecision = wrongEvidence.bundles.flatMap((item) => item.decisions).find((item) => item.fieldPath === "targetContact");
targetDecision.semanticJson = "true";
targetDecision.evidenceText = "not present in the source excerpt";
expectFailure(() => validateBlindAdjudication(wrongEvidence, packet, "terra"), /not an exact sourceExcerpt substring/);
const wrongOrder = structuredClone(valid);
wrongOrder.bundles.reverse();
expectFailure(() => validateBlindAdjudication(wrongOrder, packet, "terra"), /bundle order\/id mismatch/);
const leakedAudit = structuredClone(valid);
leakedAudit.audit.candidateDataSeen = true;
expectFailure(() => validateBlindAdjudication(leakedAudit, packet, "terra"), /isolation audit invalid/);

const result = {
  schemaVersion: "3.3-dry-fixture-results", gateId: manifest.gateId, runAt: new Date().toISOString(),
  passed: true, fixtureCount: 5, assertionCount, modelContextsExecuted: 0, modelSchemaOrInvariantRetries: 0,
  checks: ["blind-packet-leak-check", "valid-default-bundle", "semantic-allowlist-rejection", "exact-evidence-rejection", "bundle-order-rejection", "candidate-visibility-audit-rejection"]
};
if (process.argv.includes("--write")) await writeFile(path.resolve(root, manifest.dryFixtureResultPath), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

