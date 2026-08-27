#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch14PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-14/publication-reconstruction";
const RESUMPTION_ROOT =
  `${PUBLICATION_ROOT}/failure-recovery/original-unattempted-context-resumption-2`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const OUTPUT = `${PUBLICATION_ROOT}/outputs/debate-12.json`;
const PACKET = `${PUBLICATION_ROOT}/packets/debate-12.json`;
const VALIDATION = `${PUBLICATION_ROOT}/validations/debate-12.json`;
const PROVENANCE = `${PUBLICATION_ROOT}/provenance/debate-12.json`;
const DIAGNOSIS = `${RESUMPTION_ROOT}/debate-12-failure-diagnosis.json`;
const atIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");

assertV4(diagnosedAt && !Number.isNaN(Date.parse(diagnosedAt)),
  "--diagnosed-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [executionBytes, outputBytes, packetBytes, validationBytes, provenanceBytes] =
  await Promise.all([EXECUTION, OUTPUT, PACKET, VALIDATION, PROVENANCE].map(
    (file) => readFile(path.resolve(file))
  ));
const execution = JSON.parse(executionBytes);
const output = JSON.parse(outputBytes);
const packet = JSON.parse(packetBytes);
const validation = JSON.parse(validationBytes);

assertV4(
  execution.status === "six-context-publication-resumption-stopped-with-failure" &&
    execution.contextsAttempted === 1 && execution.contextsUnattempted === 5 &&
    execution.results?.[0]?.originalContextIndex === 4 &&
    execution.results?.[0]?.debateNumber === "12" &&
    execution.results?.[0]?.status === "output-validation-failed" &&
    execution.unattemptedOriginalContextIndexes?.join(",") === "5,6,7,8,9",
  "the preserved six-context resumption failure changed"
);
assertV4(
  validation.status === "failed" && validation.debateNumber === "12" &&
    validation.outputSha256 === sha256(outputBytes),
  "the preserved Debate 12 validation changed"
);

const labels = [
  "strongest feature:", "principal limitation:", "live burden:", "locked score:"
];
const critiqueDiagnostics = packet.moves.map((move) => {
  const critique = String(output.moveProse[move.moveId].critique).trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  const violations = [];
  if (words < 105 || words > 130) violations.push("word-count");
  if (critique.length < 880) violations.push("minimum-characters");
  if (sentences.length !== 4) violations.push("sentence-count");
  labels.forEach((label, index) => {
    if (!sentences[index]?.toLowerCase().startsWith(label)) {
      violations.push(`ordered-label-${index + 1}`);
    }
    if (sentences[index] && !/[.!?]["')\]]?$/.test(sentences[index].trim())) {
      violations.push(`terminal-punctuation-${index + 1}`);
    }
  });
  return {
    moveId: move.moveId,
    words,
    characters: critique.length,
    sentences: sentences.length,
    violations
  };
});
const invalidCritiques = critiqueDiagnostics.filter((item) => item.violations.length > 0);
const validCritiques = critiqueDiagnostics.filter((item) => item.violations.length === 0);
assertV4(
  invalidCritiques.length === 17 && validCritiques.length === 1 &&
    invalidCritiques.every((item) =>
      item.violations.length === 1 && item.violations[0] === "word-count" &&
      item.words > 130
    ),
  "the exact Debate 12 critique failure set changed"
);

const diagnosticReplay = structuredClone(output);
const acceptedSurrogate = output.moveProse[validCritiques[0].moveId].critique;
for (const item of invalidCritiques) {
  diagnosticReplay.moveProse[item.moveId].critique = acceptedSurrogate;
}
const replay = validatePostCanaryBatch14PublicationOutput(diagnosticReplay, packet);
assertV4(replay.status === "passed", "non-target Debate 12 publication fields failed");

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-14-publication-resumption-2-debate-12-failure-diagnosis",
  status: "debate-12-seventeen-critique-fields-failed-all-other-publication-fields-valid",
  diagnosedAt,
  batchNumber: 14,
  debateNumber: "12",
  originalContextIndex: 4,
  recoveryLevel: 1,
  recoveryLevelsMaximum: 2,
  preservedEvidence: {
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    output: OUTPUT,
    outputSha256: sha256(outputBytes),
    packet: PACKET,
    packetSha256: sha256(packetBytes),
    validation: VALIDATION,
    validationSha256: sha256(validationBytes),
    provenance: PROVENANCE,
    provenanceSha256: sha256(provenanceBytes)
  },
  diagnosis: {
    moves: packet.moves.length,
    invalidCritiqueCount: invalidCritiques.length,
    invalidCritiques,
    validCritiques,
    allOtherFieldsStructurallyValid: true,
    surrogateValidationWasInMemoryOnly: true,
    acceptedFieldsChanged: false,
    scoresChanged: false,
    scorePassRerun: false
  },
  recoveryPlan: {
    freshIsolatedFieldDisjointShards: 9,
    maximumWritableCritiquesPerShard: 2,
    attemptsPerShard: 1,
    retriesMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  authorization: {
    levelOneFieldDisjointRecoveryPreparation: true,
    modelExecution: false,
    furtherRecoveryLevel: false,
    scorePass: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-nine-field-disjoint-debate-12-critique-recovery-shards"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify(diagnosis, null, 2));
