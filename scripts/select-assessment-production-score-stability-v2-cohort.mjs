#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const root =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const outputPath = `${root}/selection.json`;
if (shouldWrite) {
  await access(outputPath).then(
    () => {
      throw new Error(`${outputPath} already exists`);
    },
    () => true
  );
}
const productionManifestPath = "docs/assessment-production/manifest-v1.json";
const policyPath =
  "docs/assessment-production/score-stability-policy-v2-proposal.md";
const retrospectiveAuditPath =
  "docs/assessment-production/score-stability-policy-v2-retrospective-audit.json";
const selectorPath =
  "scripts/select-assessment-production-score-stability-v2-cohort.mjs";
const testPath =
  "scripts/test-assessment-production-score-stability-v2-cohort.mjs";
const [
  productionManifestBytes,
  policyBytes,
  retrospectiveAuditBytes,
  selectorBytes,
  testBytes,
] = await Promise.all(
  [
    productionManifestPath,
    policyPath,
    retrospectiveAuditPath,
    selectorPath,
    testPath,
  ].map((file) => readFile(path.resolve(file)))
);
const productionManifest = JSON.parse(productionManifestBytes);
const retrospectiveAudit = JSON.parse(retrospectiveAuditBytes);
assertV4(
  productionManifest.schemaVersion ===
    "1.0-adjudicated-consensus-production-manifest" &&
    productionManifest.model.slug === "gpt-5.6-sol" &&
    productionManifest.model.reasoningEffort === "low" &&
    productionManifest.model.authentication === "ChatGPT subscription" &&
    retrospectiveAudit.status ===
      "retrospective-diagnostic-supports-v2-fresh-validation-still-required" &&
    retrospectiveAudit.authorization.freshDisjointCohortSelection &&
    !retrospectiveAudit.authorization.modelExecution &&
    !retrospectiveAudit.authorization.paidTranscription,
  "fresh v2 cohort selection is not authorized"
);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}
const calibrationPaths = (await walkFiles("docs/calibration")).sort();
const calibrationObservedDebates = new Set();
for (const file of calibrationPaths) {
  const match = file.match(/debate-(\d{1,3})/);
  if (!match) continue;
  const number = Number(match[1]);
  if (number >= 1 && number <= productionManifest.scope.corpusDebates) {
    calibrationObservedDebates.add(String(number).padStart(2, "0"));
  }
}
const productionCanaryDebates = new Set([
  "05",
  "13",
  "37",
  "64",
  "65",
  "81",
  "130",
  "138",
  "152",
  "188",
]);
const observedDebates = new Set([
  ...calibrationObservedDebates,
  ...productionCanaryDebates,
]);
const policySeedSha256 = sha256(policyBytes);
const eligible = productionManifest.items
  .filter(
    (item) =>
      item.speakerCount === 2 &&
      item.disposition === "pending-reassessment" &&
      item.acceptedCalibration === null &&
      !observedDebates.has(item.debateNumber)
  )
  .map((item) => ({
    item,
    rankSha256: sha256(
      `${policySeedSha256}|${item.debateNumber}|${item.debateId}`
    ),
  }))
  .sort(
    (left, right) =>
      left.rankSha256.localeCompare(right.rankSha256) ||
      left.item.debateNumber.localeCompare(right.item.debateNumber)
  );
assertV4(eligible.length >= 10, "fewer than ten fresh dyadic candidates remain");
const rankedSelection = eligible.slice(0, 10);
const sourceHashes = {
  [productionManifestPath]: sha256(productionManifestBytes),
  [policyPath]: sha256(policyBytes),
  [retrospectiveAuditPath]: sha256(retrospectiveAuditBytes),
  [selectorPath]: sha256(selectorBytes),
  [testPath]: sha256(testBytes),
};
const selected = [];
for (const { item, rankSha256 } of rankedSelection) {
  const [transcriptBytes, eventsBytes, localManifestBytes] = await Promise.all([
    readFile(path.resolve(item.sourceChain.transcript)),
    readFile(path.resolve(item.sourceChain.events)),
    readFile(path.resolve(item.sourceChain.manifest)),
  ]);
  assertV4(
    sha256(transcriptBytes) === item.sourceChain.transcriptSha256,
    `Debate ${item.debateNumber}: transcript hash mismatch`
  );
  assertV4(
    sha256(eventsBytes) === item.sourceChain.eventsSha256,
    `Debate ${item.debateNumber}: events hash mismatch`
  );
  assertV4(
    sha256(localManifestBytes) === item.sourceChain.manifestSha256,
    `Debate ${item.debateNumber}: local manifest hash mismatch`
  );
  const events = normalizeV418Events(JSON.parse(eventsBytes));
  assertV4(
    events.length > 0,
    `Debate ${item.debateNumber}: canonical event projection empty`
  );
  const durationMs = Math.max(
    ...events.map((event) => event.startMs + event.durationMs)
  );
  sourceHashes[item.sourceChain.transcript] = sha256(transcriptBytes);
  sourceHashes[item.sourceChain.events] = sha256(eventsBytes);
  sourceHashes[item.sourceChain.manifest] = sha256(localManifestBytes);
  selected.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    videoId: item.videoId,
    motion: item.motion,
    sides: item.sides,
    speakerCount: item.speakerCount,
    rankSha256,
    eventCount: events.length,
    durationSeconds: Number((durationMs / 1000).toFixed(3)),
    sourceChain: structuredClone(item.sourceChain),
    sourceGate: {
      transcriptPresentAndHashMatched: true,
      eventsPresentAndHashMatched: true,
      localManifestPresentAndHashMatched: true,
      canonicalEventProjectionNonempty: true,
    },
  });
}
const selection = {
  schemaVersion: "1.0-score-stability-v2-fresh-validation-cohort-selection",
  status: "fresh-disjoint-ten-debate-cohort-source-gate-passed",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  policy: {
    path: policyPath,
    sha256: policySeedSha256,
    promoted: false,
  },
  selectionPolicy: {
    cohortSize: 10,
    dyadicOnly: true,
    pendingReassessmentOnly: true,
    acceptedCalibrationExcluded: true,
    allObservedCalibrationAndCanaryDebatesExcluded: true,
    calibrationObservationMethod:
      "valid corpus debate numbers embedded in docs/calibration artifact filenames",
    calibrationArtifactPathInventorySha256: sha256(
      Buffer.from(`${calibrationPaths.join("\n")}\n`)
    ),
    calibrationObservedDebateNumbers: [...calibrationObservedDebates].sort(),
    productionCanaryDebateNumbers: [...productionCanaryDebates].sort(),
    observedDebateNumbers: [...observedDebates].sort(),
    eligibleCandidateCount: eligible.length,
    deterministicRank:
      "SHA-256(policy bytes hash | debate number | debate id), ascending",
    replacementAfterSourceGateFailureAllowed: false,
  },
  modelBoundary: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    modelContextsExecuted: 0,
  },
  selected,
  sourceHashes,
  totals: {
    debates: selected.length,
    eventCount: selected.reduce((sum, item) => sum + item.eventCount, 0),
    durationHours: Number(
      (
        selected.reduce((sum, item) => sum + item.durationSeconds, 0) / 3600
      ).toFixed(3)
    ),
    sourceGateFailures: 0,
    modelContexts: 0,
    paidTranscriptionCalls: 0,
    meteredApiCostUsd: 0,
    scoresDerived: 0,
  },
  authorization: {
    freshValidationManifestPreparation: true,
    sourcePreparation: false,
    inventoryModelExecution: false,
    judgmentModelExecution: false,
    paidTranscription: false,
    scoreDerivation: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
};
assertV4(
  selected.length === 10 &&
    selected.every(
      (item) =>
        item.speakerCount === 2 && !observedDebates.has(item.debateNumber)
    ),
  "fresh v2 validation cohort is not disjoint and dyadic"
);
if (shouldWrite) {
  await mkdir(path.resolve(root), { recursive: true });
  await writeFile(
    path.resolve(outputPath),
    `${JSON.stringify(selection, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? selection.status : "preview",
      policySeedSha256,
      eligibleCandidateCount: eligible.length,
      selected: selected.map((item) => ({
        debateNumber: item.debateNumber,
        debateId: item.debateId,
        eventCount: item.eventCount,
        durationSeconds: item.durationSeconds,
      })),
      totals: selection.totals,
      modelExecutionAuthorized: false,
      paidTranscriptionAuthorized: false,
      nextAuthorized: "fresh-validation-manifest-preparation",
    },
    null,
    2
  )
);
