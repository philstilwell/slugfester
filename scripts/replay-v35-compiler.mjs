#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V35_RUBRIC, V35_WORKFLOW, assert, compileReviewArtifact, mergeCompiledCase, sha256, validateAnnotation
} from "./lib/v35-semantic-compiler.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.5/v34-six-review-replay";
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`);
const manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-replay" && manifest.workflowVersion === V35_WORKFLOW && manifest.rubricVersion === V35_RUBRIC, "v3.5 manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `frozen decision-source hash mismatch: ${file}`);

function containsScoreField(value) {
  if (!value || typeof value !== "object") return false;
  if (Object.keys(value).some((key) => /^(score|scores|moveScore|sectionScore|overall|winner)$/i.test(key))) return true;
  return Object.values(value).some(containsScoreField);
}

const pendingWrites = [];
const debateSummaries = [];
let totalCompiledCases = 0, totalReplayCases = 0, totalUnresolved = 0;
for (const debate of manifest.sample.debates) {
  const output = manifest.outputs[debate.debateId];
  const texts = {};
  for (const [key, source] of Object.entries(debate.fixtures)) {
    texts[key] = await read(source.path);
    assert(sha256(texts[key]) === source.sha256, `${debate.debateId}: fixture hash mismatch for ${key}`);
  }
  const input = JSON.parse(texts.input), passA = JSON.parse(texts.passA), passB = JSON.parse(texts.passB);
  const sourceReviews = { terra: JSON.parse(texts.terraReview), sol: JSON.parse(texts.solReview) };
  assert(!containsScoreField(sourceReviews), `${debate.debateId}: source review contains prohibited scoring fields`);
  const compiledByModel = {};
  for (const reviewerKey of ["terra", "sol"]) {
    const compiled = compileReviewArtifact(sourceReviews[reviewerKey], input, reviewerKey);
    const artifact = {
      schemaVersion: "3.5-compiled-v34-review",
      workflowVersion: V35_WORKFLOW,
      rubricVersion: V35_RUBRIC,
      debateId: debate.debateId,
      debateNumber: debate.debateNumber,
      reviewerKey,
      model: sourceReviews[reviewerKey].model,
      calibrationOnly: true,
      compiledAt: manifest.frozenAt,
      source: {
        manifestSha256: sha256(manifestText),
        inputSha256: sha256(texts.input),
        sourceReviewSha256: sha256(texts[`${reviewerKey}Review`])
      },
      cases: compiled.cases,
      audit: { ...compiled.audit, scoreFieldsPresent: false, modelContextsExecuted: 0 }
    };
    assert(!containsScoreField(artifact), `${debate.debateId}.${reviewerKey}: compiled artifact contains prohibited scoring fields`);
    const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
    pendingWrites.push({ path: output.compiledReviews[reviewerKey], text: artifactText });
    compiledByModel[reviewerKey] = artifact;
    totalCompiledCases += artifact.cases.length;
  }

  const maps = {
    A: new Map(passA.annotations.map((item) => [item.caseId, item])),
    B: new Map(passB.annotations.map((item) => [item.caseId, item])),
    T: new Map(compiledByModel.terra.cases.map((item) => [item.caseId, item.annotation])),
    S: new Map(compiledByModel.sol.cases.map((item) => [item.caseId, item.annotation]))
  };
  const cases = [];
  let debateUnresolved = 0, projectionChangeCount = 0;
  for (const challengeCase of input.cases) {
    const merged = mergeCompiledCase(challengeCase, maps.A.get(challengeCase.caseId), maps.B.get(challengeCase.caseId), maps.T.get(challengeCase.caseId), maps.S.get(challengeCase.caseId));
    validateAnnotation(merged.annotation, challengeCase, `${debate.debateId}.${challengeCase.caseId}.replay`);
    debateUnresolved += merged.unresolvedFields;
    projectionChangeCount += merged.audit.projectionChanges.length;
    cases.push({
      caseId: challengeCase.caseId,
      moveId: challengeCase.moveId,
      annotation: merged.annotation,
      derived: merged.derived,
      unresolved: merged.unresolvedFields > 0,
      unresolvedFieldCount: merged.unresolvedFields,
      provenance: merged.provenance,
      compilerProjection: merged.audit.projectionChanges
    });
  }
  const lock = {
    schemaVersion: "3.5-retrospective-replay-lock",
    workflowVersion: V35_WORKFLOW,
    rubricVersion: V35_RUBRIC,
    debateId: debate.debateId,
    debateNumber: debate.debateNumber,
    calibrationOnly: true,
    retrospectiveOnly: true,
    builtAt: manifest.frozenAt,
    sources: {
      manifestSha256: sha256(manifestText), inputSha256: sha256(texts.input), passASha256: sha256(texts.passA), passBSha256: sha256(texts.passB),
      terraCompiledReviewSha256: sha256(pendingWrites.find((item) => item.path === output.compiledReviews.terra).text),
      solCompiledReviewSha256: sha256(pendingWrites.find((item) => item.path === output.compiledReviews.sol).text)
    },
    cases,
    audit: {
      caseCount: cases.length,
      validCaseCount: cases.length,
      unresolvedFields: debateUnresolved,
      projectionChangeCount,
      discretionaryRepairs: 0,
      fallbacks: 0,
      modelContextsExecuted: 0,
      scoreFieldsPresent: false,
      productionMutation: false
    }
  };
  assert(!containsScoreField(lock), `${debate.debateId}: replay lock contains prohibited scoring fields`);
  const lockText = `${JSON.stringify(lock, null, 2)}\n`;
  pendingWrites.push({ path: output.replayLock, text: lockText });
  totalReplayCases += cases.length;
  totalUnresolved += debateUnresolved;
  debateSummaries.push({
    debateId: debate.debateId,
    compiledReviewCases: compiledByModel.terra.cases.length + compiledByModel.sol.cases.length,
    replayCases: cases.length,
    unresolvedFields: debateUnresolved,
    projectionChangeCount,
    compiledTerraSha256: sha256(pendingWrites.find((item) => item.path === output.compiledReviews.terra).text),
    compiledSolSha256: sha256(pendingWrites.find((item) => item.path === output.compiledReviews.sol).text),
    replayLockSha256: sha256(lockText)
  });
}

const summary = {
  schemaVersion: "3.5-compiler-replay-summary",
  workflowVersion: V35_WORKFLOW,
  rubricVersion: V35_RUBRIC,
  builtAt: manifest.frozenAt,
  sources: { manifestSha256: sha256(manifestText) },
  execution: { modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  structural: {
    compiledArtifactCount: manifest.sample.debateCount * 2,
    compiledReviewCaseCount: totalCompiledCases,
    replayLockCaseCount: totalReplayCases,
    validCompiledReviewCount: totalCompiledCases,
    validReplayLockCount: totalReplayCases,
    unresolvedFields: totalUnresolved,
    discretionaryRepairs: 0,
    fallbackCases: 0,
    scoringFields: 0,
    productionMutations: 0
  },
  debates: debateSummaries
};
const summaryText = `${JSON.stringify(summary, null, 2)}\n`;
pendingWrites.push({ path: manifest.replaySummaryPath, text: summaryText });

if (shouldWrite) {
  for (const item of pendingWrites) {
    await mkdir(path.dirname(path.resolve(root, item.path)), { recursive: true });
    await writeFile(path.resolve(root, item.path), item.text);
  }
} else {
  for (const item of pendingWrites) assert(await read(item.path) === item.text, `deterministic replay mismatch: ${item.path}`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "matched", ...summary.structural, debateCount: debateSummaries.length, replaySummarySha256: sha256(summaryText) }, null, 2));
