#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { V38_DEBATE_NUMBERS, V38_ROOT, assert } from "./lib/v38-source-preparation.mjs";

const manifestPath = `${V38_ROOT}/source-development-manifest.json`;
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(file)); return true; } catch { return false; } };
assert(manifest.schemaVersion === "3.8-heldout-source-development-manifest" && manifest.status === "frozen-source-tooling-model-execution-blocked", "source development manifest invalid");
assert(manifest.developmentState.proposalPacketsBuilt && manifest.developmentState.proposalSchemasBuilt && manifest.developmentState.dryFixturePassed, "source development state incomplete");
assert(!manifest.developmentState.modelExecutionAuthorized && !manifest.developmentState.executionRunnerImplemented, "model execution must remain blocked");
assert(JSON.stringify(manifest.debateNumbers) === JSON.stringify(V38_DEBATE_NUMBERS), "debate order mismatch");
assert(manifest.proposalPolicy.contexts === 3 && manifest.proposalPolicy.candidateMovesPerDebate === 8 && manifest.proposalPolicy.candidatesPerSide === 4, "proposal policy invalid");
assert(manifest.reviewPolicy.contextsPlanned === 3 && manifest.reviewPolicy.isolatedFromProposalLabelsAndRationales, "review policy invalid");
assert(manifest.adjudicationPolicy.onlyDisputedPreparationFields && manifest.adjudicationPolicy.audioTriggeredIfEitherInitialAttributionBelowHigh, "adjudication or audio policy invalid");
assert(manifest.selectionPolicy.finalMovesPerDebate === 4 && manifest.selectionPolicy.exactlyTwoPerSide, "selection policy invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readFile(path.resolve(file), "utf8")) === digest, `source hash mismatch: ${file}`);
for (const debateNumber of V38_DEBATE_NUMBERS) {
  const context = manifest.proposalContexts[debateNumber];
  assert(context && await exists(context.packet) && await exists(context.schema) && await exists(context.transcript) && await exists(context.events), `${debateNumber}: proposal context incomplete`);
  assert(!(await exists(context.output)), `${debateNumber}: proposal output exists before execution lock`);
}
assert(!(await exists(`${V38_ROOT}/source-preparation/review`)), "review artifacts exist before proposal execution");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, debateCount: V38_DEBATE_NUMBERS.length, proposalContexts: 3, reviewContextsPlanned: 3, modelExecutionAuthorized: false, classificationPassesAuthorized: false, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false }, null, 2));
