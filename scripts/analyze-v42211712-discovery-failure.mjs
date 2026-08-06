#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const EXECUTION = "docs/calibration/v4.2.21.17.11/held-out-discovery/model-execution.json";
const MANIFEST = "docs/calibration/v4.2.21.17.11/held-out-discovery/execution-manifest.json";
const OUTPUT = "docs/calibration/v4.2.21.17.12/discovery-ownership-hardening/failure-analysis.json";
const execution = JSON.parse(await readFile(EXECUTION, "utf8"));
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));

assertV4(execution.status === "held-out-discovery-complete-with-failure", "failed held-out discovery execution is unavailable");
assertV4(execution.contextsAttempted === 17 && execution.validContexts === 16 && execution.invalidContexts === 1 && execution.retries === 0, "held-out failure count drifted");
const violations = [];
for (const result of execution.results.filter((item) => !item.accepted && item.rawOutputWritten)) {
  const context = manifest.contexts[result.contextIndex];
  const output = JSON.parse(await readFile(context.rawOutput, "utf8"));
  for (const candidate of output.candidates) {
    const { startEvent, endEvent } = candidate.sourceSpan;
    const reasons = [];
    if (startEvent < context.coreStartEvent || startEvent > context.coreEndEvent) reasons.push("start-event-outside-owned-core");
    if (endEvent < startEvent) reasons.push("end-event-precedes-start-event");
    if (endEvent > context.contextEndEvent) reasons.push("end-event-outside-available-context");
    if (reasons.length) violations.push({
      debateNumber: context.debateNumber,
      chunkId: context.chunkId,
      candidateId: candidate.candidateId,
      coreStartEvent: context.coreStartEvent,
      coreEndEvent: context.coreEndEvent,
      contextEndEvent: context.contextEndEvent,
      startEvent,
      endEvent,
      reasons,
    });
  }
}
assertV4(violations.length === 1, "expected exactly one structural ownership violation");
assertV4(violations[0].reasons.length === 1 && violations[0].reasons[0] === "start-event-outside-owned-core", "unexpected failure mode");

const analysis = {
  schemaVersion: "4.2.21.17.12-discovery-ownership-failure-analysis",
  protocolId: "v4.2.21.17.12-discovery-ownership-hardening",
  status: "held-out-discovery-failed-schema-ownership-bound-missing",
  calibrationOnly: true,
  AIOnly: true,
  inputs: { execution: EXECUTION, manifest: MANIFEST },
  observed: {
    contextsAttempted: execution.contextsAttempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: execution.retries,
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
    maximumParallelContextsObserved: execution.maximumParallelContextsObserved,
    meteredApiCostUsd: execution.meteredApiCostUsd,
    transcriptionCostUsd: execution.transcriptionCostUsd,
    scoresDerived: 0,
  },
  rootCause: {
    class: "output-schema-underconstraint",
    promptContainedOwnershipRule: true,
    deterministicValidatorEnforcedOwnershipRule: true,
    outputSchemaEnforcedOwnershipRule: false,
    modelTransportSucceeded: true,
    semanticRepairAttempted: false,
    retryAttempted: false,
    violations,
  },
  correction: {
    startEventSchemaMinimum: "chunk.coreStartEvent",
    startEventSchemaMaximum: "chunk.coreEndEvent",
    endEventSchemaMinimum: "chunk.contextStartEvent",
    endEventSchemaMaximum: "chunk.contextEndEvent",
    deterministicValidatorRetainedAsDefenseInDepth: true,
    historicalFailedOutputModified: false,
  },
  evidenceDisposition: {
    discoveryQualityEvidence: "informative-but-failed",
    throughputEvidence: "retained",
    cleanHeldOutPassEvidence: false,
    retiredDebateNumbers: manifest.contexts.map((context) => context.debateNumber).filter((value, index, array) => array.indexOf(value) === index),
    reuseForCleanHeldOutGate: false,
  },
  authorization: {
    deterministicSchemaTest: true,
    replacementHeldOutSelection: true,
    retryFailedContext: false,
    reuseFailedSampleAsCleanHeldOut: false,
    judgmentPacketPreparation: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false,
  },
};
if (shouldWrite) {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  validContexts: analysis.observed.validContexts,
  invalidContexts: analysis.observed.invalidContexts,
  violations,
  cleanHeldOutPassEvidence: false,
  retiredDebates: analysis.evidenceDisposition.retiredDebateNumbers,
  replacementHeldOutSelectionAuthorized: true,
}, null, 2));
