#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { V38_DEBATE_NUMBERS, V38_GATE_MANIFEST, V38_ROOT, V38_SOURCE_AUDIT, assert } from "./lib/v38-source-preparation.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const outputPath = `${V38_ROOT}/source-development-manifest.json`;
if (shouldWrite) {
  try { await access(path.resolve(outputPath)); throw new Error(`${outputPath} already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(file), "utf8");
const [gateText, sourceAuditText, authorizationText, dryText] = await Promise.all([
  read(V38_GATE_MANIFEST), read(V38_SOURCE_AUDIT), read(`${V38_ROOT}/source-access-authorization.json`), read(`${V38_ROOT}/source-preparation-dry-fixture.json`)
]);
const gate = JSON.parse(gateText), sourceAudit = JSON.parse(sourceAuditText), authorization = JSON.parse(authorizationText), dry = JSON.parse(dryText);
assert(authorization.status === "source-access-and-preparation-authorized" && sourceAudit.nextState.sourcePreparationModelExecutionAuthorized === true, "source preparation is not authorized");
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.proposalSchemaClosedAndValidated && dry.reviewSchemaClosedAndValidated && dry.reviewPacketProposalLabelLeakage.length === 0, "source tooling dry fixture invalid");

const proposalContexts = {};
for (const debateNumber of V38_DEBATE_NUMBERS) {
  const packet = `${V38_ROOT}/source-preparation/proposal/packets/debate-${debateNumber}.json`;
  const schema = `${V38_ROOT}/source-preparation/proposal/schemas/debate-${debateNumber}.schema.json`;
  const packetText = await read(packet), schemaText = await read(schema);
  proposalContexts[debateNumber] = {
    debateNumber,
    packet,
    packetSha256: sha256(packetText),
    schema,
    schemaSha256: sha256(schemaText),
    transcript: sourceAudit.debateSources[debateNumber].transcriptPath,
    transcriptSha256: sourceAudit.debateSources[debateNumber].transcriptSha256,
    events: sourceAudit.debateSources[debateNumber].eventsPath,
    eventsSha256: sourceAudit.debateSources[debateNumber].eventsSha256,
    output: `${V38_ROOT}/source-preparation/proposal/outputs/debate-${debateNumber}.json`
  };
}

const sourceFiles = [
  "docs/assessment-workflow-v3.8.md",
  "docs/reassessment-rubric-v3.8.md",
  `${V38_ROOT}/source-preparation-manual.md`,
  V38_GATE_MANIFEST,
  `${V38_ROOT}/source-access-authorization.json`,
  V38_SOURCE_AUDIT,
  `${V38_ROOT}/source-preparation-dry-fixture.json`,
  "scripts/lib/v38-source-preparation.mjs",
  "scripts/build-v38-source-preparation-packets.mjs",
  "scripts/validate-v38-source-proposal.mjs",
  "scripts/build-v38-source-review-packets.mjs",
  "scripts/validate-v38-source-review.mjs",
  "scripts/test-v38-source-preparation-tooling.mjs",
  "scripts/preregister-v38-source-development.mjs",
  "scripts/validate-v38-source-development.mjs",
  ...Object.values(proposalContexts).flatMap((item) => [item.packet, item.schema])
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await read(file));

const artifact = {
  schemaVersion: "3.8-heldout-source-development-manifest",
  gateId: gate.gateId,
  status: "frozen-source-tooling-model-execution-blocked",
  frozenAt,
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: gate.model,
  debateNumbers: V38_DEBATE_NUMBERS,
  sourceChain: { path: V38_SOURCE_AUDIT, sha256: sha256(sourceAuditText), fullLocalTranscriptRequired: true, localHashesVerified: true, paidTranscriptionCalls: 0 },
  modelInputs: { workflow: "docs/assessment-workflow-v3.8.md", rubric: "docs/reassessment-rubric-v3.8.md", manual: `${V38_ROOT}/source-preparation-manual.md` },
  proposalPolicy: { contexts: 3, routesPerDebate: 2, bridgesPerRoute: 5, candidateMovesPerDebate: 8, candidatesPerSide: 4, fullTranscriptAndEventsAvailable: true, attemptsPerContext: 1, retriesMaximum: 0 },
  reviewPolicy: { contextsPlanned: 3, isolatedFromProposalLabelsAndRationales: true, sameFullTranscriptAndEventsAvailable: true, routesAndBridgesReviewed: true, moveValidityAttributionAndProvisionalContactReviewed: true, attemptsPerContext: 1, retriesMaximum: 0 },
  adjudicationPolicy: { contextsMaximum: 3, onlyDisputedPreparationFields: true, candidateValuesLimitedToProposalAndReview: true, audioTriggeredIfEitherInitialAttributionBelowHigh: true, finalFieldRequiresTwoMatchingVotes: true },
  selectionPolicy: { finalMovesPerDebate: 4, exactlyTwoPerSide: true, provisionalNoContactSupportAndAttackEachRequiredPerDebate: true, deterministicSelectionFromAcceptedCandidates: true, provisionalLabelsDiagnosticOnly: true },
  proposalContexts,
  dryFixture: { path: `${V38_ROOT}/source-preparation-dry-fixture.json`, sha256: sha256(dryText) },
  developmentState: { proposalPacketsBuilt: true, proposalSchemasBuilt: true, dryFixturePassed: true, executionRunnerImplemented: false, reviewPacketsBuilt: false, reviewSchemasBuilt: false, disputeExtractorImplemented: false, adjudicationRunnerImplemented: false, finalInventoryBuilderImplemented: false, modelExecutionAuthorized: false },
  stillBlocked: authorization.stillBlocked,
  sourceHashes
};
const outputText = `${JSON.stringify(artifact, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true }); await writeFile(path.resolve(outputPath), outputText); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", output: outputPath, debateNumbers: V38_DEBATE_NUMBERS, sourceHashCount: Object.keys(sourceHashes).length, modelExecutionAuthorized: false }, null, 2));
