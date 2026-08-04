#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V382_EXECUTION_MANIFEST, assert } from "./lib/v382-source-preparation.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const manifest = await readJson(V382_EXECUTION_MANIFEST);
assert(manifest.status === "frozen-instrumentation-continuation-authorized", "v3.8.2 execution is not frozen and authorized");
assert(manifest.executionPolicy.proposalModelContexts === 0 && manifest.executionPolicy.proposalReuseContexts === 3, "proposal reuse boundary invalid");
assert(manifest.authorization.sourceReviewModelExecution && manifest.authorization.disputeOnlySourceAdjudicationModelExecution, "source execution authorization missing");
assert(!manifest.authorization.burdenContactClassificationPasses && !manifest.authorization.numericalParticipantScoring && !manifest.authorization.assessmentProse && !manifest.authorization.productionMutation, "downstream authorization expanded");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const context of Object.values(manifest.proposalReuseContexts)) {
  assert(sha256(await read(context.rawOutput)) === context.rawOutputSha256, `Debate ${context.debateNumber}: raw proposal reuse hash mismatch`);
  assert(sha256(await read(context.enrichedOutput)) === context.enrichedOutputSha256, `Debate ${context.debateNumber}: enriched proposal reuse hash mismatch`);
  assert(sha256(await read(context.transcript)) === context.transcriptSha256, `Debate ${context.debateNumber}: transcript hash mismatch`);
  assert(sha256(await read(context.events)) === context.eventsSha256, `Debate ${context.debateNumber}: event hash mismatch`);
}
const fixture = await readJson(manifest.detectorFixture.path);
assert(fixture.status === "passed" && fixture.exactStructuredWarning.parsedEvents.length === 1 && fixture.semanticFalsePositiveCases.every((item) => item.parsedEvents === 0), "transport detector fixture invalid");
const continuation = await readJson(manifest.continuationFixture.path);
assert(continuation.passed && continuation.semanticallyValidatedProposalContexts === 3 && continuation.reviewPacketsWithAllSevenProposalFieldsHidden === 3 && continuation.transcriptAndEventChainsHashMatched === 3 && continuation.futureReviewOutputsExcluded === 3, "continuation fixture invalid");
console.log(JSON.stringify({ status: "passed", sourceHashes: Object.keys(manifest.sourceHashes).length, proposalReuseContexts: Object.keys(manifest.proposalReuseContexts).length, reviewContexts: Object.keys(manifest.reviewContexts).length, exactStructuredRetryEventsInFixture: fixture.exactStructuredWarning.parsedEvents.length, continuationFixturePassed: continuation.passed, classificationAuthorized: false, scoringAuthorized: false, proseAuthorized: false, productionAuthorized: false }, null, 2));
