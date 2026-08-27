#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch14PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-14/publication-reconstruction";
const RESUMPTION_ROOT =
  `${PUBLICATION_ROOT}/failure-recovery/original-unattempted-context-resumption-3`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const PACKET = `${PUBLICATION_ROOT}/packets/debate-55.json`;
const SCHEMA = `${PUBLICATION_ROOT}/schemas/debate-55.schema.json`;
const OUTPUT = `${PUBLICATION_ROOT}/outputs/debate-55.json`;
const VALIDATION = `${PUBLICATION_ROOT}/validations/debate-55.json`;
const PROVENANCE = `${PUBLICATION_ROOT}/provenance/debate-55.json`;
const DIAGNOSIS = `${RESUMPTION_ROOT}/debate-55-timeout-diagnosis.json`;
const atIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");

assertV4(diagnosedAt && !Number.isNaN(Date.parse(diagnosedAt)),
  "--diagnosed-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const [executionBytes, analysisBytes, packetBytes, schemaBytes] = await Promise.all(
  [EXECUTION, ANALYSIS, PACKET, SCHEMA].map((file) => readFile(path.resolve(file)))
);
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
const packet = JSON.parse(packetBytes);
const schema = JSON.parse(schemaBytes);

assertV4(
  execution.status === "five-context-publication-resumption-stopped-with-failure" &&
    execution.contextsAttempted === 3 && execution.contextsUnattempted === 2 &&
    execution.validContexts === 2 && execution.invalidContexts === 1 &&
    execution.results?.[0]?.originalContextIndex === 5 &&
    execution.results?.[0]?.debateNumber === "187" &&
    execution.results?.[0]?.status === "completed-valid" &&
    execution.results?.[1]?.originalContextIndex === 6 &&
    execution.results?.[1]?.debateNumber === "160" &&
    execution.results?.[1]?.status === "completed-valid" &&
    execution.results?.[2]?.originalContextIndex === 7 &&
    execution.results?.[2]?.debateNumber === "55" &&
    execution.results?.[2]?.status === "timed-out" &&
    execution.results?.[2]?.timedOut === true &&
    execution.results?.[2]?.outputWritten === false &&
    execution.results?.[2]?.attemptCount === 1 &&
    execution.results?.[2]?.retryCount === 0 &&
    canonicalJson(execution.unattemptedOriginalContextIndexes) === canonicalJson([8, 9]) &&
    analysis.status === "five-context-publication-resumption-failed",
  "the preserved Debate 55 timeout boundary changed"
);
assertV4(packet.debateNumber === "55" && schema.properties?.debateNumber?.const === "55",
  "Debate 55 frozen packet or schema changed");
for (const file of [OUTPUT, VALIDATION, PROVENANCE]) {
  assertV4(!(await exists(file)), `timed-out Debate 55 artifact unexpectedly exists: ${file}`);
}
for (const debateNumber of ["187", "160"]) {
  const [output, acceptedPacket] = await Promise.all([
    `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`,
    `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`
  ].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
  assertV4(validatePostCanaryBatch14PublicationOutput(output, acceptedPacket).status === "passed",
    `accepted Debate ${debateNumber} no longer validates`);
}

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-14-publication-resumption-3-debate-55-timeout-diagnosis",
  status: "debate-55-original-publication-first-attempt-timed-out-without-output",
  diagnosedAt,
  batchNumber: 14,
  debateNumber: "55",
  originalContextIndex: 7,
  recoveryLevel: 1,
  recoveryLevelsMaximum: 2,
  preservedEvidence: {
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    analysis: ANALYSIS,
    analysisSha256: sha256(analysisBytes),
    packet: PACKET,
    packetSha256: sha256(packetBytes),
    schema: SCHEMA,
    schemaSha256: sha256(schemaBytes)
  },
  diagnosis: {
    failureType: "bounded-timeout",
    elapsedMs: execution.results[2].elapsedMs,
    timeoutMs: 600000,
    terminationSignal: execution.results[2].terminationSignal,
    outputWritten: false,
    partialOutputReusable: false,
    sourceOrSchemaDriftDetected: false,
    acceptedDebatesRetained: ["187", "160"],
    untouchedOriginalContextIndexes: [8, 9],
    scoresChanged: false,
    scorePassRerun: false
  },
  recoveryPlan: {
    freshIsolatedFieldDisjointShards: 3,
    topLevelWritableFieldGroups: [
      ["moveProse"],
      ["summary", "representativeQuotes"],
      ["overallCommentary", "aiExtension"]
    ],
    maximumWritableTopLevelFieldsPerShard: 2,
    attemptsPerShard: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  authorization: {
    recoveryLevelOnePreparation: true,
    additionalWholeDebateAttempt: false,
    modelExecution: false,
    furtherRecoveryLevel: false,
    scorePass: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-three-field-disjoint-debate-55-timeout-recovery-shards"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify(diagnosis, null, 2));
