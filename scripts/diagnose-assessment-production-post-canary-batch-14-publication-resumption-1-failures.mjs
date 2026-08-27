#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch14PublicationOutput } from "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-14/publication-reconstruction";
const RESUMPTION = `${ROOT}/failure-recovery/original-unattempted-context-resumption-1`;
const EXECUTION = `${RESUMPTION}/model-execution.json`;
const DIAGNOSIS = `${RESUMPTION}/failure-diagnosis.json`;
const DEBATES = ["110", "133"];
const diagnosedAtIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = diagnosedAtIndex >= 0 ? process.argv[diagnosedAtIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");

assertV4(
  diagnosedAt && !Number.isNaN(Date.parse(diagnosedAt)),
  "--diagnosed-at requires an ISO timestamp"
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const executionBytes = await readFile(path.resolve(EXECUTION));
const execution = JSON.parse(executionBytes);
assertV4(
  execution.status === "nine-context-publication-resumption-stopped-with-failure" &&
    execution.contextsAttempted === 3 && execution.validContexts === 1 &&
    execution.invalidContexts === 2 &&
    execution.results.filter((item) => !item.gateAcceptancePassed)
      .map((item) => item.debateNumber).join(",") === DEBATES.join(","),
  "the preserved publication resumption failure changed"
);

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const loaded = {};
for (const debateNumber of DEBATES) {
  const paths = {
    output: `${ROOT}/outputs/debate-${debateNumber}.json`,
    packet: `${ROOT}/packets/debate-${debateNumber}.json`,
    validation: `${ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${ROOT}/provenance/debate-${debateNumber}.json`
  };
  const bytes = Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(async ([key, file]) => [key, await readFile(path.resolve(file))])
    )
  );
  loaded[debateNumber] = {
    paths,
    bytes,
    output: JSON.parse(bytes.output),
    packet: JSON.parse(bytes.packet),
    validation: JSON.parse(bytes.validation)
  };
  assertV4(
    loaded[debateNumber].validation.status === "failed" &&
      loaded[debateNumber].validation.outputSha256 === sha256(bytes.output),
    `Debate ${debateNumber}: preserved failed validation changed`
  );
}

let structuralSurrogate = null;
for (const prose of Object.values(loaded["110"].output.moveProse)) {
  const critique = String(prose.critique).trim();
  const words = wordCount(critique);
  if (words >= 105 && words <= 130 && critique.length >= 880) {
    structuralSurrogate = critique;
    break;
  }
}
assertV4(structuralSurrogate, "no accepted structural critique surrogate available");

const debateDiagnoses = [];
for (const debateNumber of DEBATES) {
  const item = loaded[debateNumber];
  const critiqueDiagnostics = item.packet.moves.map((move) => {
    const critique = String(item.output.moveProse[move.moveId].critique).trim();
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
  const invalidCritiques = critiqueDiagnostics.filter(
    (entry) => entry.violations.length > 0
  );
  assertV4(
    invalidCritiques.every(
      (entry) => entry.violations.length === 1 &&
        entry.violations[0] === "word-count" && entry.words > 130
    ),
    `Debate ${debateNumber}: failure type changed`
  );
  const replayOutput = structuredClone(item.output);
  for (const invalid of invalidCritiques) {
    replayOutput.moveProse[invalid.moveId].critique = structuralSurrogate;
  }
  const replay = validatePostCanaryBatch14PublicationOutput(replayOutput, item.packet);
  assertV4(replay.status === "passed", `Debate ${debateNumber}: non-target fields failed`);
  debateDiagnoses.push({
    debateNumber,
    moves: item.packet.moves.length,
    invalidCritiqueCount: invalidCritiques.length,
    invalidCritiques,
    allOtherFieldsStructurallyValid: true,
    preservedEvidence: {
      output: item.paths.output,
      outputSha256: sha256(item.bytes.output),
      packet: item.paths.packet,
      packetSha256: sha256(item.bytes.packet),
      validation: item.paths.validation,
      validationSha256: sha256(item.bytes.validation),
      provenance: item.paths.provenance,
      provenanceSha256: sha256(item.bytes.provenance)
    }
  });
}

assertV4(
  debateDiagnoses[0].invalidCritiqueCount === 1 &&
    debateDiagnoses[1].invalidCritiqueCount === 18,
  "the exact critique failure counts changed"
);
const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-14-publication-resumption-1-failure-diagnosis",
  status:
    "debates-110-and-133-nineteen-critique-fields-failed-all-other-fields-valid",
  diagnosedAt,
  batchNumber: 14,
  recoveryLevel: 1,
  recoveryLevelsMaximum: 2,
  resumptionExecution: EXECUTION,
  resumptionExecutionSha256: sha256(executionBytes),
  debates: debateDiagnoses,
  totals: {
    debates: 2,
    invalidCritiques: 19,
    freshIsolatedFieldDisjointShards: 10,
    maximumWritableCritiquesPerShard: 2,
    attemptsPerShard: 1,
    retriesMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  integrity: {
    structuralSurrogateUsedInMemoryOnly: true,
    acceptedFieldsChanged: false,
    scoresChanged: false,
    scorePassRerun: false
  },
  authorization: {
    levelOneFieldDisjointRecoveryPreparation: true,
    modelExecution: false,
    furtherRecoveryLevel: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "prepare-ten-field-disjoint-debates-110-and-133-critique-recovery-shards"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify(diagnosis, null, 2));
