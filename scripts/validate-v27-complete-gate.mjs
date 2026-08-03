#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const shouldWrite = process.argv.includes("--write"); const root = process.cwd(); const manifestRelative = "docs/calibration/v2.7/held-out-gates/gate-manifest.json"; const manifestPath = path.resolve(manifestRelative); const manifestText = await readFile(manifestPath, "utf8"); const manifest = JSON.parse(manifestText); const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const run = (script, ...args) => execFileSync(process.execPath, [path.resolve(script), ...args], { cwd: root, stdio: "pipe", encoding: "utf8" });
run("scripts/validate-v27-gate-manifest.mjs", manifestRelative);
const laneResults = [];
for (const [laneKey, directory] of [["dyadic", "dyadic"], ["multiSpeaker", "multi-speaker"]]) {
  const lane = manifest.lanes[laneKey]; const artifacts = [];
  for (const debate of lane.debates) {
    const inventory = `docs/calibration/v2.7/held-out-gates/${directory}/inventories/${debate.debateId}.json`; run("scripts/validate-v27-atomic-inventory.mjs", inventory, manifestRelative); artifacts.push(inventory);
    const round1 = `docs/calibration/v2.7/held-out-gates/${directory}/inventory-reviews/round-1/${debate.debateId}.json`; if (!existsSync(path.resolve(round1))) throw new Error(`${debate.debateId}: missing round-1 review`); run("scripts/validate-v27-inventory-review.mjs", round1, manifestRelative); artifacts.push(round1); const r1 = JSON.parse(await readFile(path.resolve(round1), "utf8"));
    const needs2 = lane.lane === "multi-speaker" || r1.nextReviewTrigger.required; const round2 = `docs/calibration/v2.7/held-out-gates/${directory}/inventory-reviews/round-2/${debate.debateId}.json`; if (needs2) { if (!existsSync(path.resolve(round2))) throw new Error(`${debate.debateId}: missing required round-2 review`); run("scripts/validate-v27-inventory-review.mjs", round2, manifestRelative); artifacts.push(round2); const r2 = JSON.parse(await readFile(path.resolve(round2), "utf8")); if (r2.nextReviewTrigger.required) { const round3 = `docs/calibration/v2.7/held-out-gates/${directory}/inventory-reviews/round-3/${debate.debateId}.json`; if (!existsSync(path.resolve(round3))) throw new Error(`${debate.debateId}: missing required round-3 review`); run("scripts/validate-v27-inventory-review.mjs", round3, manifestRelative); artifacts.push(round3); } }
    for (const pass of ["a", "b"]) { const passPath = `docs/calibration/v2.7/held-out-gates/${directory}/pass-${pass}/${debate.debateId}.json`; run("scripts/validate-v27-annotation-pass.mjs", passPath, manifestRelative); artifacts.push(passPath); }
    const lock = `docs/calibration/v2.7/held-out-gates/${directory}/locks/${debate.debateId}.json`; run("scripts/validate-v27-annotation-lock.mjs", lock, manifestRelative); artifacts.push(lock);
  }
  run("scripts/analyze-v27-held-out-gate.mjs", "--lane", lane.lane); const analysisPath = `docs/calibration/v2.7/held-out-gates/${directory}/reliability-analysis.json`; const analysisText = await readFile(path.resolve(analysisPath), "utf8"); const analysis = JSON.parse(analysisText); artifacts.push(analysisPath);
  const artifactHashes = {}; for (const file of artifacts) artifactHashes[file] = sha256(await readFile(path.resolve(file), "utf8")); laneResults.push({ lane: lane.lane, gateId: lane.gateId, passed: analysis.decision.passed, numericalScoringAuthorized: false, reliabilityAnalysisPath: analysisPath, reliabilityAnalysisSha256: sha256(analysisText), artifactHashes });
}
const complete = { schemaVersion: "2.7-complete-dual-lane-gate-validation", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion, validatedAt: new Date().toISOString(), gateManifestPath: manifestRelative, gateManifestSha256: sha256(manifestText), lanes: laneResults, decisionsIndependent: true, corpusWideNumericalScoringAuthorized: false, nextStep: laneResults.every((item) => item.passed) ? "Preregister and run separate dyadic and multi-speaker numerical gates, then a mixed-format audit." : "Iterate only failed lanes; preserve any passing lane unchanged." };
const outputPath = path.resolve("docs/calibration/v2.7/held-out-gates/complete-gate-validation.json");
if (shouldWrite) await writeFile(outputPath, `${JSON.stringify(complete, null, 2)}\n`); else { const existing = JSON.parse(await readFile(outputPath, "utf8")); const normalize = (value) => { const copy = structuredClone(value); delete copy.validatedAt; return copy; }; if (JSON.stringify(normalize(existing)) !== JSON.stringify(normalize(complete))) throw new Error("complete v2.7 gate validation is stale; rerun --write"); }
console.log(JSON.stringify({ status: "passed", write: shouldWrite, lanes: laneResults.map(({ lane, passed }) => ({ lane, passed })), corpusWideNumericalScoringAuthorized: false }, null, 2));
