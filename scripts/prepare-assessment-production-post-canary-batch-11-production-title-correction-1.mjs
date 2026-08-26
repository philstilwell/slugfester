#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  BATCH_11_TITLE_CORRECTION_AFTER,
  BATCH_11_TITLE_CORRECTION_BEFORE,
  BATCH_11_TITLE_CORRECTION_DEBATE_ID,
  BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER,
  BATCH_11_TITLE_CORRECTION_SECTION_ID,
  buildBatch11TitleCorrectedCompatibilityLibrary,
  buildBatch11TitleCorrectedProductionSource,
  serializedJson,
  sha256,
  validateBatch11TitleCorrectedCompatibilityLibrary
} from "./lib/assessment-production-post-canary-batch-11-production-title-correction-1.mjs";
import { extractProductionDebateRecords } from "./lib/assessment-production-post-canary-batch-11-production-publication.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const frozenAtIndex = args.indexOf("--frozen-at");
const requestedFrozenAt = frozenAtIndex >= 0 ? args[frozenAtIndex + 1] : null;
const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const lockBytes = (relativePath, bytes) => ({
  path: relativePath,
  sha256: sha256(bytes),
  bytes: bytes.length
});
const lockFile = async (relativePath) => lockBytes(relativePath, await readBytes(relativePath));

const correctionRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/title-correction-1";
const paths = {
  preparation: `${correctionRoot}/preparation.json`,
  activation: `${correctionRoot}/execution-activation.json`,
  execution: `${correctionRoot}/execution.json`,
  mutationManifest:
    "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/mutation-manifest.json",
  publicationActivation:
    "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/execution-activation.json",
  productionDebates: "src/data/debates.js",
  compatibilityLibrary:
    "scripts/lib/assessment-production-post-canary-batch-11-compatibility.mjs",
  correctionLibrary:
    "scripts/lib/assessment-production-post-canary-batch-11-production-title-correction-1.mjs",
  preparationScript:
    "scripts/prepare-assessment-production-post-canary-batch-11-production-title-correction-1.mjs",
  preparationTest:
    "scripts/test-assessment-production-post-canary-batch-11-production-title-correction-1-preparation.mjs",
  activationScript:
    "scripts/activate-assessment-production-post-canary-batch-11-production-title-correction-1.mjs",
  runScript:
    "scripts/run-assessment-production-post-canary-batch-11-production-title-correction-1.mjs"
};

const existing = (await exists(paths.preparation))
  ? await readJson(paths.preparation)
  : null;
const frozenAt = existing?.frozenAt ?? requestedFrozenAt;
assertV4(
  typeof frozenAt === "string" && !Number.isNaN(Date.parse(frozenAt)),
  "stable --frozen-at ISO timestamp required"
);
assertV4(
  !(await exists(paths.activation)) && !(await exists(paths.execution)),
  "Batch 11 title correction already activated or executed"
);

const [mutationManifest, publicationActivation, debatesBytes, libraryBytes] =
  await Promise.all([
    readJson(paths.mutationManifest),
    readJson(paths.publicationActivation),
    readBytes(paths.productionDebates),
    readBytes(paths.compatibilityLibrary)
  ]);
assertV4(
  mutationManifest.status ===
      "frozen-batch-11-production-publication-mutation-manifest-prepared" &&
    publicationActivation.status ===
      "frozen-batch-11-production-publication-mutation-pass-activated" &&
    sha256(debatesBytes) === publicationActivation.frozenOutput.proposedSha256,
  "the exact activated Batch 11 production mutation must exist before correction"
);

const lockedCompatibilityLibrary = mutationManifest.preparationTools.find(
  (item) => item.path === paths.compatibilityLibrary
);
assertV4(
  lockedCompatibilityLibrary &&
    sha256(libraryBytes) === lockedCompatibilityLibrary.sha256,
  "Batch 11 compatibility library changed before title correction"
);
for (const output of publicationActivation.frozenOutput.productionLedgerOutputs) {
  assertV4(
    sha256(await readBytes(output.path)) === output.sha256,
    `${output.debateNumber}: activated production ledger output is unavailable`
  );
}

const validatorFailure = spawnSync(
  process.execPath,
  ["scripts/validate-debates.mjs"],
  { cwd: root, encoding: "utf8" }
);
const validatorFailureText = `${validatorFailure.stdout ?? ""}${validatorFailure.stderr ?? ""}`;
assertV4(
  validatorFailure.status !== 0 &&
    validatorFailureText.includes("Debate validation failed with 1 issue") &&
    validatorFailureText.includes(
      "debates.23.sections.0.title: must contain no more than 10 words"
    ),
  "expected the single Batch 11 Debate 24 section-title validation failure"
);

const source = debatesBytes.toString("utf8");
const debateRecord = extractProductionDebateRecords(source).find(
  (record) => record.number === BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER
);
const debate = JSON.parse(debateRecord?.text ?? "null");
assertV4(
  debateRecord?.id === BATCH_11_TITLE_CORRECTION_DEBATE_ID &&
    debate.sections?.[0]?.sectionId === BATCH_11_TITLE_CORRECTION_SECTION_ID &&
    debate.sections[0].title === BATCH_11_TITLE_CORRECTION_BEFORE,
  "Batch 11 Debate 24 title-correction source changed"
);
const scoreSnapshot = {
  overall: structuredClone(debate.score),
  section: structuredClone(debate.sections[0].score),
  moves: debate.sections[0].exchanges.flatMap((exchange) =>
    [exchange.pro, exchange.con].filter(Boolean).map((move) => ({
      ledgerMoveId: move.ledgerMoveId,
      score: move.score
    }))
  )
};

const proposedDebatesSource = buildBatch11TitleCorrectedProductionSource(source);
const proposedLibrarySource = buildBatch11TitleCorrectedCompatibilityLibrary(
  libraryBytes.toString("utf8")
);
const proposedLibraryValidation =
  validateBatch11TitleCorrectedCompatibilityLibrary(proposedLibrarySource);
const proposedDebateRecord = extractProductionDebateRecords(
  proposedDebatesSource
).find((record) => record.number === BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER);
const proposedDebate = JSON.parse(proposedDebateRecord.text);
assertV4(
  canonicalJson({
    overall: proposedDebate.score,
    section: proposedDebate.sections[0].score,
    moves: proposedDebate.sections[0].exchanges.flatMap((exchange) =>
      [exchange.pro, exchange.con].filter(Boolean).map((move) => ({
        ledgerMoveId: move.ledgerMoveId,
        score: move.score
      }))
    )
  }) === canonicalJson(scoreSnapshot),
  "Batch 11 title correction changes a score or move identity"
);

const preparation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-production-title-correction-1-preparation",
  status: "frozen-batch-11-production-title-correction-1-prepared",
  frozenAt,
  productionCanary: false,
  batchNumber: 11,
  directIncrementalCostCapUsd: 0,
  diagnosedFailure: {
    validatorExitCode: validatorFailure.status,
    issueCount: 1,
    path: "debates.23.sections.0.title",
    message: "must contain no more than 10 words"
  },
  correction: {
    debateNumber: BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER,
    debateId: BATCH_11_TITLE_CORRECTION_DEBATE_ID,
    sectionId: BATCH_11_TITLE_CORRECTION_SECTION_ID,
    field: "sections[0].title",
    before: BATCH_11_TITLE_CORRECTION_BEFORE,
    after: BATCH_11_TITLE_CORRECTION_AFTER,
    beforeWords: 11,
    afterWords: 9,
    semanticFieldsChanged: 1,
    scoreChanges: 0,
    ledgerChanges: 0
  },
  inputs: {
    mutationManifest: await lockFile(paths.mutationManifest),
    publicationActivation: await lockFile(paths.publicationActivation),
    productionDebates: lockBytes(paths.productionDebates, debatesBytes),
    compatibilityLibrary: lockBytes(paths.compatibilityLibrary, libraryBytes),
    productionLedgerOutputs:
      publicationActivation.frozenOutput.productionLedgerOutputs
  },
  proposedOutputs: {
    productionDebates: lockBytes(
      paths.productionDebates,
      Buffer.from(proposedDebatesSource)
    ),
    compatibilityLibrary: {
      path: paths.compatibilityLibrary,
      sha256: proposedLibraryValidation.sha256,
      bytes: proposedLibraryValidation.bytes
    }
  },
  scoreSnapshot,
  preparationTools: await Promise.all(
    [
      paths.correctionLibrary,
      paths.preparationScript,
      paths.preparationTest,
      paths.activationScript,
      paths.runScript
    ].map(lockFile)
  ),
  executionDiscipline: {
    attempts: 1,
    retries: 0,
    timeoutExtensions: 0,
    automaticRepairs: 0,
    exactWritableFiles: [paths.productionDebates, paths.compatibilityLibrary],
    exactWritableSemanticFields: 1,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  authorization: {
    boundedFailureRecovery: true,
    titleCorrection: true,
    compatibilityAliasCorrection: true,
    scoreChange: false,
    ledgerChange: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "activate-and-execute-one-batch-11-production-title-correction-1-attempt"
};

if (write) {
  await mkdir(resolve(correctionRoot), { recursive: true });
  await writeFile(resolve(paths.preparation), serializedJson(preparation));
}
console.log(
  serializedJson({
    status: preparation.status,
    write,
    semanticFields: 1,
    writableFiles: 2,
    scoreChanges: 0,
    ledgerChanges: 0,
    directIncrementalCostUsd: 0
  })
);
