#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("docs/calibration/v2.4/held-out-gate");
const write = process.argv.includes("--write");
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function validate(script, artifact) {
  execFileSync(process.execPath, [path.resolve("scripts", script), artifact], { cwd: process.cwd(), stdio: "pipe" });
}

const [gateSource, analysisSource, decisionSource] = await Promise.all([
  readFile(path.join(root, "gate-manifest.json"), "utf8"),
  readFile(path.join(root, "reliability-analysis.json"), "utf8"),
  readFile(path.join(root, "gate-decision.json"), "utf8"),
]);
const gate = JSON.parse(gateSource); const analysis = JSON.parse(analysisSource); const decision = JSON.parse(decisionSource);
const artifactHashes = [];
for (const debate of gate.sample.debates) {
  const name = `${debate.debateId}.json`;
  const files = {
    draftInventory: path.join(root, "draft-inventories", name),
    inventory: path.join(root, "inventories", name),
    inventoryReview: path.join(root, "inventory-reviews", name),
    passA: path.join(root, "pass-a", name),
    passB: path.join(root, "pass-b", name),
    lock: path.join(root, "locks", name),
  };
  validate("validate-v24-atomic-inventory.mjs", files.draftInventory);
  validate("validate-v24-atomic-inventory.mjs", files.inventory);
  validate("validate-v24-inventory-review.mjs", files.inventoryReview);
  validate("validate-v24-annotation-pass.mjs", files.passA);
  validate("validate-v24-annotation-pass.mjs", files.passB);
  validate("validate-v24-annotation-lock.mjs", files.lock);
  const hashes = {};
  for (const [kind, file] of Object.entries(files)) hashes[kind] = sha256(await readFile(file, "utf8"));
  artifactHashes.push({ debateNumber: debate.number, debateId: debate.debateId, ...hashes });
}
assert(analysis.gateId === gate.gateId && analysis.workflowVersion === gate.workflowVersion && analysis.rubricVersion === gate.rubricVersion, "analysis identity mismatch");
assert(analysis.agreement.moveCount === gate.hardGates.moveCount, "analysis move count mismatch");
assert(Object.values(analysis.hardGates).every((entry) => entry.status === "pass"), "a hard gate failed");
const computedAnnotationPass = Object.values(analysis.gates).every((entry) => entry.status === "pass");
assert(analysis.decision.annotationGatesPassed === computedAnnotationPass, "analysis annotation decision mismatch");
assert(analysis.decision.heldOutAnnotationGate === (computedAnnotationPass ? "passed" : "not-passed"), "analysis gate label mismatch");
assert(decision.gateId === gate.gateId && decision.heldOutAnnotationGate === analysis.decision.heldOutAnnotationGate, "decision artifact mismatch");
assert(decision.authorization.completeV24ThreeDebateNumericalGatePreregistration === computedAnnotationPass, "numerical authorization mismatch");
assert(decision.authorization.tenDebateGate === false && decision.authorization.all195Debates === false, "promotion exceeded manifest authority");
const result = {
  schemaVersion: "2.4-complete-held-out-gate-validation",
  validatedAt: new Date().toISOString(),
  gateManifestSha256: sha256(gateSource),
  reliabilityAnalysisSha256: sha256(analysisSource),
  gateDecisionSha256: sha256(decisionSource),
  debates: artifactHashes,
  totals: { debateCount: artifactHashes.length, moveCount: analysis.agreement.moveCount, fieldDisagreementCount: analysis.diagnostics.fieldDisagreementCount, tupleDisagreementCount: analysis.diagnostics.tupleDisagreementCount, paidTranscriptionCalls: analysis.sourceQa.paidTranscriptionCalls },
  hardGates: "passed",
  annotationGate: analysis.decision.heldOutAnnotationGate,
  numericalScoringAuthorized: computedAnnotationPass,
  tenDebateGateAuthorized: false,
  corpusWideAuthorized: false,
};
if (write) {
  await writeFile(path.join(root, "complete-gate-validation.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ status: "written", ...result.totals, annotationGate: result.annotationGate }, null, 2));
} else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
