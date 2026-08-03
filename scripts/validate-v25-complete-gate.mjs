#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("docs/calibration/v2.5/held-out-gate");
const write = process.argv.includes("--write");
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
async function exists(file) { try { await access(file); return true; } catch { return false; } }
function validate(script, artifact) { execFileSync(process.execPath, [path.resolve("scripts", script), artifact], { cwd: process.cwd(), stdio: "pipe" }); }

execFileSync(process.execPath, [path.resolve("scripts/validate-v25-source-chain.mjs")], { cwd: process.cwd(), stdio: "pipe" });
execFileSync(process.execPath, [path.resolve("scripts/validate-v25-development.mjs")], { cwd: process.cwd(), stdio: "pipe" });
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
    reviewedInventory: path.join(root, "reviewed-inventories", name),
    inventory: path.join(root, "inventories", name),
    inventoryReview: path.join(root, "inventory-reviews", name),
    passA: path.join(root, "pass-a", name),
    passB: path.join(root, "pass-b", name),
    lock: path.join(root, "locks", name),
  };
  validate("validate-v25-atomic-inventory.mjs", files.draftInventory);
  validate("validate-v25-atomic-inventory.mjs", files.reviewedInventory);
  validate("validate-v25-atomic-inventory.mjs", files.inventory);
  validate("validate-v25-inventory-review.mjs", files.inventoryReview);
  const review = JSON.parse(await readFile(files.inventoryReview, "utf8"));
  if (review.thirdReviewTrigger.required) {
    files.thirdReview = path.join(root, "third-reviews", name);
    assert(await exists(files.thirdReview), `${debate.debateId}: missing triggered third review`);
    validate("validate-v25-third-review.mjs", files.thirdReview);
  } else {
    assert(!(await exists(path.join(root, "third-reviews", name))), `${debate.debateId}: untriggered third review present`);
  }
  validate("validate-v25-annotation-pass.mjs", files.passA);
  validate("validate-v25-annotation-pass.mjs", files.passB);
  validate("validate-v25-annotation-lock.mjs", files.lock);
  const hashes = {};
  for (const [kind, file] of Object.entries(files)) hashes[kind] = sha256(await readFile(file, "utf8"));
  artifactHashes.push({ debateNumber: debate.number, debateId: debate.debateId, ...hashes });
}

assert(analysis.gateId === gate.gateId && analysis.workflowVersion === gate.workflowVersion && analysis.rubricVersion === gate.rubricVersion, "analysis identity mismatch");
assert(analysis.agreement.moveCount === gate.hardGates.moveCount, "analysis move count mismatch");
const recomputed = JSON.parse(execFileSync(process.execPath, [path.resolve("scripts/analyze-v25-held-out-gate.mjs")], { cwd: process.cwd(), encoding: "utf8" }));
recomputed.analyzedAt = analysis.analyzedAt;
assert(JSON.stringify(recomputed) === JSON.stringify(analysis), "stored reliability analysis differs from recomputation");
const computedAnnotationPass = Object.values(analysis.gates).every((entry) => entry.status === "pass");
const computedHardPass = Object.values(analysis.hardGates).every((entry) => entry.status === "pass");
const computedPass = computedAnnotationPass && computedHardPass;
assert(analysis.decision.annotationGatesPassed === computedAnnotationPass && analysis.decision.hardGatesPassed === computedHardPass, "analysis decision mismatch");
assert(analysis.decision.heldOutAnnotationGate === (computedPass ? "passed" : "not-passed"), "analysis gate label mismatch");
assert(decision.gateId === gate.gateId && decision.decidedAt === analysis.analyzedAt && decision.heldOutAnnotationGate === analysis.decision.heldOutAnnotationGate, "decision artifact mismatch");
assert(decision.authorization.completeV25ThreeDebateNumericalGatePreregistration === computedPass, "numerical authorization mismatch");
assert(decision.authorization.tenDebateGate === false && decision.authorization.all195Debates === false, "promotion exceeded manifest authority");
const result = {
  schemaVersion: "2.5-complete-held-out-gate-validation",
  validatedAt: new Date().toISOString(),
  gateManifestSha256: sha256(gateSource),
  reliabilityAnalysisSha256: sha256(analysisSource),
  gateDecisionSha256: sha256(decisionSource),
  debates: artifactHashes,
  totals: {
    debateCount: artifactHashes.length,
    moveCount: analysis.agreement.moveCount,
    primitiveDisagreementCount: analysis.diagnostics.primitiveDisagreementCount,
    tupleDisagreementCount: analysis.diagnostics.tupleDisagreementCount,
    paidTranscriptionCalls: analysis.sourceQa.paidTranscriptionCalls,
    triggeredThirdReviews: analysis.sourceQa.triggeredThirdReviews,
  },
  hardGates: computedHardPass ? "passed" : "not-passed",
  annotationGate: analysis.decision.heldOutAnnotationGate,
  numericalScoringPreregistrationAuthorized: computedPass,
  tenDebateGateAuthorized: false,
  corpusWideAuthorized: false,
};
if (write) {
  await writeFile(path.join(root, "complete-gate-validation.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ status: "written", ...result.totals, hardGates: result.hardGates, annotationGate: result.annotationGate }, null, 2));
} else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
