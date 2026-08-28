#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  CALIBRATION_PROMOTION_ORDER,
  CALIBRATION_PROMOTION_PROTOCOL_ID,
  CALIBRATION_PROMOTION_ROOT,
  buildCalibrationPromotionSiteLedgerAdapter,
  promoteFrozenCalibrationCandidate,
  serializedJson,
  sha256,
  validateCalibrationPromotionSiteLedgerAdapter
} from "./lib/assessment-production-calibration-promotion-v1.mjs";
import {
  extractProductionDebateRecords,
  inventoryDigest
} from "./lib/assessment-production-post-canary-batch-17-production-publication.mjs";

const write = process.argv.includes("--write");
const root = process.cwd();
const resolve = (file) => path.resolve(root, file);
const readBytes = (file) => readFile(resolve(file));
const readJson = (file) => readFile(resolve(file), "utf8").then(JSON.parse);
const lock = async (file) => {
  const content = await readBytes(file);
  return { path: file, sha256: sha256(content), bytes: content.length };
};
const paths = {
  finalLedger: "docs/calibration/v4.2.21.17.29/hard-route-final-ledger/final-ledger.json",
  finalLedgerManifest: "docs/calibration/v4.2.21.17.29/hard-route-final-ledger/final-ledger-manifest.json",
  scores: "docs/calibration/v4.2.21.17.30/hard-route-single-score-pass/calculated-scores.json",
  sourcePreparation: "docs/calibration/v4.2.21.17.19/hard-route-held-out-source-preparation/preparation-manifest.json",
  mergeAudit: "docs/calibration/v4.2.21.17.40/hard-route-publication-finalization/merge-audit.json",
  historicalRendering: "docs/calibration/v4.2.21.17.41/hard-route-publication-readiness/rendering-audit.json",
  productionDebates: "src/data/debates.js",
  references: "src/data/references.js",
  ledgers: "docs/assessment-ledgers"
};

const [finalLedger, finalLedgerManifest, scores, sourcePreparation, mergeAudit] =
  await Promise.all([
    readJson(paths.finalLedger),
    readJson(paths.finalLedgerManifest),
    readJson(paths.scores),
    readJson(paths.sourcePreparation),
    readJson(paths.mergeAudit)
  ]);
assertV4(
  finalLedger.status === "passed-hard-route-deterministic-final-ledger-assembly" &&
    scores.status === "hard-route-single-score-pass-stability-gate-passed" &&
    scores.formulaBoundary.scoringPasses === 1 &&
    mergeAudit.status === "passed-five-debate-publication-finalization",
  "accepted frozen calibration evidence required"
);

for (const [file, expected] of Object.entries(finalLedgerManifest.sourceHashes)) {
  assertV4(sha256(await readBytes(file)) === expected, `${file}: frozen source changed`);
}

const productionBytes = await readBytes(paths.productionDebates);
const productionRecords = extractProductionDebateRecords(productionBytes.toString("utf8"));
assertV4(productionRecords.length === 195, "expected 195 production debates");
const productionByNumber = new Map(productionRecords.map((record) => [record.number, record]));
const ledgerFiles = (await readdir(resolve(paths.ledgers)))
  .filter((file) => file.endsWith(".json"))
  .sort();
assertV4(ledgerFiles.length === 174, "expected 174 production ledgers before calibration promotion");
const ledgerInventory = await Promise.all(
  ledgerFiles.map((file) => lock(`${paths.ledgers}/${file}`))
);

const commonLocks = {
  finalLedger: await lock(paths.finalLedger),
  finalLedgerManifest: await lock(paths.finalLedgerManifest),
  calculatedScores: await lock(paths.scores),
  mergeAudit: await lock(paths.mergeAudit),
  historicalRenderingAudit: await lock(paths.historicalRendering)
};
const debateRecords = [];
const pendingWrites = [];

for (const debateNumber of CALIBRATION_PROMOTION_ORDER) {
  const finalLedgerDebate = finalLedger.debates.find((item) => item.debateNumber === debateNumber);
  const scoreDebate = scores.debates.find((item) => item.debateNumber === debateNumber);
  const sourceContext = sourcePreparation.contexts.find((item) => item.debateNumber === debateNumber);
  const productionRecord = productionByNumber.get(debateNumber);
  assertV4(finalLedgerDebate && scoreDebate && sourceContext && productionRecord, `${debateNumber}: required identity missing`);
  assertV4(productionRecord.id === finalLedgerDebate.debateId, `${debateNumber}: production identity changed`);
  const compiledPath = `docs/calibration/v4.2.21.17.40/hard-route-publication-finalization/compiled/debate-${debateNumber}.json`;
  const compiled = await readJson(compiledPath);
  const candidate = promoteFrozenCalibrationCandidate(compiled);
  const candidatePath = `${CALIBRATION_PROMOTION_ROOT}/staged-candidates/debate-${debateNumber}.json`;
  const stagedLedgerPath = `${CALIBRATION_PROMOTION_ROOT}/staged-ledgers/debate-${debateNumber}.json`;
  const packetPath = `${CALIBRATION_PROMOTION_ROOT}/packets/debate-${debateNumber}.json`;
  const productionLedgerPath = `${paths.ledgers}/${candidate.id}.json`;
  assertV4(!ledgerFiles.includes(`${candidate.id}.json`), `${debateNumber}: production ledger already exists`);
  const candidateBytes = serializedJson(candidate);
  const eventsBytes = await readBytes(sourceContext.originalEvents);
  assertV4(
    sha256(eventsBytes) === sourceContext.originalEventsSha256 &&
      finalLedgerManifest.sourceHashes[sourceContext.originalEvents] === sourceContext.originalEventsSha256,
    `${debateNumber}: frozen event source changed`
  );
  const sourceLocks = {
    ...commonLocks,
    frozenCompiled: await lock(compiledPath),
    originalEvents: {
      path: sourceContext.originalEvents,
      sha256: sourceContext.originalEventsSha256,
      bytes: eventsBytes.length
    }
  };
  const adapter = buildCalibrationPromotionSiteLedgerAdapter({
    finalLedgerDebate,
    scoreDebate,
    candidate,
    eventsDocument: JSON.parse(eventsBytes),
    sourceLocks
  });
  validateCalibrationPromotionSiteLedgerAdapter({
    adapter,
    candidate,
    expectedSourceLocks: sourceLocks
  });
  const adapterBytes = serializedJson(adapter);
  const packet = {
    schemaVersion: "1.0-assessment-production-calibration-promotion-v1-packet",
    protocolId: CALIBRATION_PROMOTION_PROTOCOL_ID,
    status: "frozen-calibration-promotion-packet",
    debateNumber,
    debateId: candidate.id,
    sourceLocks,
    frozenTransformation: {
      operation: "replace-preview-id-with-source-debate-id-and-remove-calibration-metadata",
      identityReplacement: { from: compiled.id, to: candidate.id },
      removedTopLevelKeys: ["calibration"],
      candidateOtherwiseByteSemanticEquivalent: canonicalJson(candidate) === canonicalJson(promoteFrozenCalibrationCandidate(compiled)),
      scorePasses: 0,
      modelCalls: 0,
      paidCalls: 0
    },
    outputs: {
      candidate: { path: candidatePath, sha256: sha256(candidateBytes), bytes: Buffer.byteLength(candidateBytes) },
      stagedLedger: { path: stagedLedgerPath, sha256: sha256(adapterBytes), bytes: Buffer.byteLength(adapterBytes) },
      productionLedger: productionLedgerPath
    }
  };
  const packetBytes = serializedJson(packet);
  pendingWrites.push(
    [candidatePath, candidateBytes],
    [stagedLedgerPath, adapterBytes],
    [packetPath, packetBytes]
  );
  debateRecords.push({
    debateNumber,
    debateId: candidate.id,
    currentProductionRecordSha256: sha256(productionRecord.text),
    currentProductionRecordBytes: Buffer.byteLength(productionRecord.text),
    frozenCompiled: await lock(compiledPath),
    candidate: packet.outputs.candidate,
    stagedLedger: packet.outputs.stagedLedger,
    packet: { path: packetPath, sha256: sha256(packetBytes), bytes: Buffer.byteLength(packetBytes) },
    productionLedgerPath,
    score: { pro: candidate.score.pro, con: candidate.score.con }
  });
}

const frozenAt = new Date().toISOString();
const authorization = {
  schemaVersion: "1.0-assessment-production-calibration-promotion-v1-authorization",
  protocolId: CALIBRATION_PROMOTION_PROTOCOL_ID,
  status: "standing-authorization-frozen",
  frozenAt,
  userInstruction: "Process the five dyadic calibration debates at your discretion.",
  scope: CALIBRATION_PROMOTION_ORDER,
  separateFromCampaignBatches: true,
  batch18Selected: false,
  authorized: {
    frozenCandidatePromotion: true,
    deterministicLedgerAdapters: true,
    productionMutation: true,
    generatedDerivatives: true,
    rendering: true,
    validation: true,
    commitAndPush: true
  },
  prohibited: {
    newJudgments: true,
    scorePassRerun: true,
    scoreChanges: true,
    acceptedProseChanges: true,
    paidServices: true,
    batch18Selection: true
  },
  directIncrementalCostUsd: 0
};
const authorizationBytes = serializedJson(authorization);
const manifest = {
  schemaVersion: "1.0-assessment-production-calibration-promotion-v1-manifest",
  protocolId: CALIBRATION_PROMOTION_PROTOCOL_ID,
  status: "frozen-calibration-promotion-manifest",
  frozenAt,
  baselineCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  explicitOrder: [...CALIBRATION_PROMOTION_ORDER],
  authorization: {
    path: `${CALIBRATION_PROMOTION_ROOT}/authorization.json`,
    sha256: sha256(authorizationBytes),
    bytes: Buffer.byteLength(authorizationBytes)
  },
  baseline: {
    productionDebates: { path: paths.productionDebates, sha256: sha256(productionBytes), bytes: productionBytes.length, debates: 195 },
    references: await lock(paths.references),
    productionLedgers: { directory: paths.ledgers, count: ledgerInventory.length, inventorySha256: inventoryDigest(ledgerInventory), files: ledgerInventory }
  },
  frozenEvidence: {
    ...commonLocks,
    sourceHashReferencesChecked: Object.keys(finalLedgerManifest.sourceHashes).length,
    historicalReadinessReplay: {
      finalizationGatePassed: true,
      wrapperPassedAgainstCurrentTree: false,
      reason: "The historical rendering wrapper locks the stylesheet bytes at calibration-preview time; the stylesheet changed during the later production campaign. The historical audit remains immutable and fresh production rendering is required."
    }
  },
  debates: debateRecords,
  totals: { debates: 5, scorePasses: 0, modelCalls: 0, paidCalls: 0, directIncrementalCostUsd: 0 },
  batch18Selected: false
};

if (write) {
  for (const [file, content] of pendingWrites) {
    await mkdir(path.dirname(resolve(file)), { recursive: true });
    await writeFile(resolve(file), content);
  }
  await mkdir(resolve(CALIBRATION_PROMOTION_ROOT), { recursive: true });
  await writeFile(resolve(`${CALIBRATION_PROMOTION_ROOT}/authorization.json`), authorizationBytes);
  await writeFile(resolve(`${CALIBRATION_PROMOTION_ROOT}/manifest.json`), serializedJson(manifest));
}
console.log(serializedJson({ status: manifest.status, write, debates: debateRecords.map((item) => ({ number: item.debateNumber, score: item.score })), sourceHashReferencesChecked: manifest.frozenEvidence.sourceHashReferencesChecked, directIncrementalCostUsd: 0 }));
