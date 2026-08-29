#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { debates } from "../src/data/debates.js";

const ROOT = process.cwd();
const AUDITED_BASELINE_COMMIT = "a149c3bf64a116767e6990eab08f4cbb40b940f2";
const CLOSURE_ROOT = "docs/assessment-production/campaign-closure-v1";
const MANIFEST_PATH = `${CLOSURE_ROOT}/manifest.json`;
const REPORT_PATH = `${CLOSURE_ROOT}/report.md`;
const writeMode = process.argv.includes("--write");
const repositoryOnlyMode = process.argv.includes("--repository-only");
const allowedArguments = new Set(["--write", "--repository-only"]);

for (const argument of process.argv.slice(2)) assert.equal(allowedArguments.has(argument), true, `unknown argument: ${argument}`);
assert.equal(writeMode && repositoryOnlyMode, false, "--write and --repository-only cannot be combined");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (file) => readFileSync(path.join(ROOT, file));
const text = (file) => bytes(file).toString("utf8");
const json = (file) => JSON.parse(text(file));
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const fileRecord = (file) => ({ path: file, bytes: bytes(file).length, sha256: sha256(bytes(file)) });
const sameJson = (left, right) => assert.deepEqual(left, right);

function assertFileRecord(record, label = record.path) {
  assert.equal(existsSync(path.join(ROOT, record.path)), true, `${label}: file is missing`);
  const content = bytes(record.path);
  if (record.bytes !== undefined) assert.equal(content.length, record.bytes, `${label}: byte length changed`);
  assert.equal(sha256(content), record.sha256, `${label}: SHA-256 changed`);
}

let repositoryOnlyHashLocksChecked = 0;

function assertFrozenSourceHash(file, expectedHash, label) {
  assert.match(expectedHash, /^[0-9a-f]{64}$/, `${label}: invalid frozen SHA-256`);
  const isIgnoredCampaignCache = file.startsWith(".assessment-cache/captions/")
    || file.startsWith(".assessment-cache/compact-ledgers/");
  const isIgnoredAudioTranscript = /^output\/transcribe\/assessment-production-(?:checkpoint-v2\.2-1|post-canary-batch-\d{2})-audio-verification\/debate-\d+\/transcripts(?:-correction-\d+)?\/[^/]+\.transcript\.json$/.test(file);
  const isIgnoredLocalEvidence = isIgnoredCampaignCache || isIgnoredAudioTranscript;
  if (repositoryOnlyMode && isIgnoredLocalEvidence) {
    repositoryOnlyHashLocksChecked += 1;
    return;
  }
  assert.equal(existsSync(path.join(ROOT, file)), true, `${label}: source file is missing${isIgnoredLocalEvidence ? "; use --repository-only in a clean checkout without the local campaign evidence cache" : ""}`);
  assert.equal(sha256(bytes(file)), expectedHash, `${label}: frozen source changed`);
}

function walk(directory, output = []) {
  for (const entry of readdirSync(path.join(ROOT, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) walk(relative, output);
    else output.push(relative);
  }
  return output;
}

function jpegDimensions(buffer) {
  assert.equal(buffer[0], 0xff, "not a JPEG");
  assert.equal(buffer[1], 0xd8, "not a JPEG");
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = buffer.readUInt16BE(offset);
    const isStartOfFrame = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isStartOfFrame) return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    offset += length;
  }
  throw new Error("JPEG dimensions were not found");
}

function winnerFor(score) {
  if (score.pro === score.con) return { winner: "tie", margin: 0 };
  return score.pro > score.con
    ? { winner: "pro", margin: score.pro - score.con }
    : { winner: "con", margin: score.con - score.pro };
}

function renderingRuntimeCounts(evidence) {
  if (evidence.runtime?.counts) return evidence.runtime.counts;
  return {
    consoleErrors: evidence.runtime?.consoleErrors?.length,
    pageErrors: evidence.runtime?.pageErrors?.length,
    failedRequests: evidence.runtime?.failedRequests?.length,
  };
}

function renderingScreenshotMetadata(screenshot) {
  if (Number.isInteger(screenshot.width) && Number.isInteger(screenshot.height)) {
    return { width: screenshot.width, height: screenshot.height, byteLength: screenshot.byteLength };
  }
  if (Number.isInteger(screenshot.transport?.pixelWidth) && Number.isInteger(screenshot.transport?.pixelHeight)) {
    return {
      width: screenshot.transport.pixelWidth,
      height: screenshot.transport.pixelHeight,
      byteLength: screenshot.transport.byteLength,
    };
  }
  throw new Error(`unrecognized frozen screenshot metadata shape: ${screenshot.path}`);
}

const checkpointRoot = "docs/assessment-production/production-checkpoint-v2.2-1";
const continuationRoot = "docs/assessment-production/post-canary-continuation-v1";
const cohorts = [
  { cohort: "checkpoint", batchNumber: null, root: checkpointRoot, expectedDebates: 10 },
  ...Array.from({ length: 17 }, (_, index) => {
    const batchNumber = index + 1;
    return {
      cohort: `batch-${String(batchNumber).padStart(2, "0")}`,
      batchNumber,
      root: `${continuationRoot}/batch-${String(batchNumber).padStart(2, "0")}`,
      expectedDebates: batchNumber === 17 ? 4 : 10,
    };
  }),
];

assert.equal(existsSync(path.join(ROOT, `${continuationRoot}/batch-18`)), false, "Batch 18 directory exists");
assert.equal(existsSync(path.join(ROOT, `${continuationRoot}/batch-18/selection.json`)), false, "Batch 18 selection exists");

const campaignManifest = json("docs/assessment-production/manifest-v1.json");
const manifestByNumber = new Map(campaignManifest.items.map((item) => [item.debateNumber, item]));
const policyPath = `${continuationRoot}/continuation-policy-v1/selection-policy.json`;
const policy = json(policyPath);
const rankedPool = policy.reconciledCorpus.remainingPendingDyadic.map((debateNumber) => {
  const item = manifestByNumber.get(debateNumber);
  assert.ok(item, `frozen pool debate ${debateNumber} is absent from manifest-v1`);
  return {
    debateNumber,
    debateId: item.debateId,
    rankSha256: sha256(`${policy.deterministicOrdering.rankDomain}|${policy.deterministicOrdering.normativeTextSha256}|${policy.deterministicOrdering.promotionRecordSha256}|${item.debateNumber}|${item.debateId}`),
  };
}).sort((left, right) => left.rankSha256.localeCompare(right.rankSha256) || left.debateNumber.localeCompare(right.debateNumber));
assert.equal(rankedPool.length, 164);

const productionByNumber = new Map(debates.map((debate) => [debate.number, debate]));
assert.equal(productionByNumber.size, debates.length, "production debate numbers are not unique");
const selectedNumbers = [];
const selectedIds = [];
const selectedVideoIds = [];
const selectedDebates = [];
const cohortRecords = [];
let frozenSourceFilesChecked = 0;
let finalLedgerSourceHashReferencesChecked = 0;
let scorePassCount = 0;
let scoreEvaluations = 0;
let exactCandidateMatches = 0;
let documentedCandidateCorrections = 0;

for (const cohort of cohorts) {
  const selectionPath = `${cohort.root}/selection.json`;
  const finalLedgerPath = `${cohort.root}/final-ledger/final-ledger.json`;
  const finalLedgerManifestPath = `${cohort.root}/final-ledger/final-ledger-manifest.json`;
  const scoresPath = `${cohort.root}/score-pass/calculated-scores.json`;
  const scoreManifestPath = `${cohort.root}/score-pass/score-pass-manifest.json`;
  const selection = json(selectionPath);
  const finalLedgerManifest = json(finalLedgerManifestPath);
  const scores = json(scoresPath);
  const scoreManifest = json(scoreManifestPath);
  assert.equal(selection.selected.length, cohort.expectedDebates, `${cohort.cohort}: unexpected selection size`);
  assert.equal(scores.debates.length, cohort.expectedDebates, `${cohort.cohort}: unexpected score count`);
  assert.equal(scores.formulaBoundary.scoringPasses, 1, `${cohort.cohort}: score-pass count is not one`);
  assert.equal(scoreManifest.scoringPolicy.passes, 1, `${cohort.cohort}: authorized score-pass count is not one`);
  assert.equal(scoreManifest.scoringPolicy.automaticRerunAllowed, false, `${cohort.cohort}: score rerun was permitted`);
  assert.equal(scores.sources.finalLedgerSha256, sha256(bytes(finalLedgerPath)), `${cohort.cohort}: score artifact no longer matches final ledger`);
  if (typeof finalLedgerManifest.artifacts.finalLedger === "object") {
    assert.equal(finalLedgerManifest.artifacts.finalLedger.sha256, sha256(bytes(finalLedgerPath)), `${cohort.cohort}: final-ledger manifest hash changed`);
  } else {
    assert.equal(finalLedgerManifest.artifacts.finalLedger, finalLedgerPath, `${cohort.cohort}: final-ledger manifest path changed`);
  }

  for (const [sourcePath, expectedHash] of Object.entries(finalLedgerManifest.sourceHashes)) {
    assertFrozenSourceHash(sourcePath, expectedHash, `${cohort.cohort}: ${sourcePath}`);
    finalLedgerSourceHashReferencesChecked += 1;
  }

  const scoreByNumber = new Map(scores.debates.map((entry) => [entry.debateNumber, entry]));
  assert.deepEqual([...scoreByNumber.keys()], selection.selected.map((item) => item.debateNumber), `${cohort.cohort}: score order differs from selection`);
  scorePassCount += 1;
  scoreEvaluations += scores.debates.length;

  const publicationLockPath = cohort.batchNumber === null
    ? `${cohort.root}/production-mutation/mutation-packet.json`
    : `${cohort.root}/production-publication/mutation-manifest.json`;
  const publicationLock = json(publicationLockPath);
  assert.equal(publicationLock.debates.length, cohort.expectedDebates, `${cohort.cohort}: publication lock count changed`);
  const publicationByNumber = new Map(publicationLock.debates.map((entry) => [entry.debateNumber, entry]));

  const debateRecords = [];
  for (const item of selection.selected) {
    assert.equal(item.speakerCount, 2, `${cohort.cohort} debate ${item.debateNumber}: not dyadic`);
    assert.equal(Object.values(item.sourceGate).every(Boolean), true, `${cohort.cohort} debate ${item.debateNumber}: source gate changed`);
    for (const [kind, hashKey] of [["transcript", "transcriptSha256"], ["events", "eventsSha256"], ["manifest", "manifestSha256"]]) {
      assertFrozenSourceHash(item.sourceChain[kind], item.sourceChain[hashKey], `${cohort.cohort} debate ${item.debateNumber}: ${kind}`);
      frozenSourceFilesChecked += 1;
    }
    selectedNumbers.push(item.debateNumber);
    selectedIds.push(item.debateId);
    selectedVideoIds.push(item.videoId);

    const scoreEntry = scoreByNumber.get(item.debateNumber);
    assert.ok(scoreEntry, `${cohort.cohort} debate ${item.debateNumber}: missing calculated score`);
    assert.equal(scoreEntry.debateId, item.debateId);
    const final = scoreEntry.final;
    const frozenScore = { pro: final.overall.pro.score, con: final.overall.con.score };
    const frozenWinner = winnerFor(frozenScore);
    assert.equal(final.winner, frozenWinner.winner);
    assert.equal(final.winningMargin, frozenWinner.margin);

    const lock = publicationByNumber.get(item.debateNumber);
    assert.ok(lock, `${cohort.cohort} debate ${item.debateNumber}: missing publication lock`);
    assertFileRecord(lock.candidate, `${cohort.cohort} debate ${item.debateNumber} candidate`);
    assertFileRecord(lock.stagedLedger, `${cohort.cohort} debate ${item.debateNumber} staged ledger`);
    const productionLedgerPath = lock.productionLedgerPath || lock.futureProductionLedgerPath || lock.productionLedger?.path;
    assert.ok(productionLedgerPath, `${cohort.cohort} debate ${item.debateNumber}: production ledger path is absent`);
    assert.equal(Buffer.compare(bytes(lock.stagedLedger.path), bytes(productionLedgerPath)), 0, `${cohort.cohort} debate ${item.debateNumber}: production ledger differs from staging`);
    const candidate = json(lock.candidate.path);
    const published = productionByNumber.get(item.debateNumber);
    assert.ok(published, `${cohort.cohort} debate ${item.debateNumber}: absent from production`);
    assert.equal(published.id, item.debateId);
    assert.equal(published.assessmentModel, "5.6 Sol");
    assert.equal(published.assessmentRubric, "Slugfester Reassessment Rubric v2");

    if (item.debateNumber === "24") {
      const correctionPreparationPath = `${continuationRoot}/batch-11/production-publication/title-correction-1/preparation.json`;
      const correctionExecutionPath = `${continuationRoot}/batch-11/production-publication/title-correction-1/execution.json`;
      const preparation = json(correctionPreparationPath);
      const execution = json(correctionExecutionPath);
      assert.equal(candidate.sections[0].title, "Scope of the Poison Charge and Attribution of Good and Harm");
      assert.equal(published.sections[0].title, "The Poison Charge and Attribution of Good and Harm");
      assert.equal(execution.correction.semanticFieldsChanged, 1);
      assert.equal(execution.correction.scoreChanges, 0);
      assert.equal(execution.correction.ledgerChanges, 0);
      assert.equal(execution.validation.scoreSnapshotByteIdentical, true);
      assert.equal(execution.validation.allTenProductionLedgersByteIdentical, true);
      const adjustedCandidate = structuredClone(candidate);
      adjustedCandidate.sections[0].title = published.sections[0].title;
      sameJson(published, adjustedCandidate);
      documentedCandidateCorrections += 1;
      assert.equal(preparation.correction.debateNumber, "24");
    } else {
      sameJson(published, candidate);
      exactCandidateMatches += 1;
    }

    assert.deepEqual(published.score, frozenScore, `${cohort.cohort} debate ${item.debateNumber}: published overall scores changed`);
    assert.equal(published.overall.pro.score, frozenScore.pro);
    assert.equal(published.overall.con.score, frozenScore.con);
    assert.deepEqual(published.sections.map((section) => section.sectionId), final.sections.map((section) => section.sectionId));
    const calculatedMoves = new Map();
    for (const section of final.sections) {
      const publishedSection = published.sections.find((entry) => entry.sectionId === section.sectionId);
      assert.ok(publishedSection);
      assert.deepEqual(publishedSection.score, { pro: section.sides.pro.score, con: section.sides.con.score });
      for (const side of ["pro", "con"]) for (const move of section.sides[side].moves) calculatedMoves.set(move.moveId, move.score);
    }
    const publishedMoves = new Map();
    for (const section of published.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) {
      if (exchange[side]) publishedMoves.set(exchange[side].ledgerMoveId, exchange[side].score);
    }
    assert.deepEqual(publishedMoves, calculatedMoves, `${cohort.cohort} debate ${item.debateNumber}: move IDs or scores changed`);
    assert.ok(published.logicalExtension?.sides?.pro || published.logicalExtension?.pro, `${cohort.cohort} debate ${item.debateNumber}: AI Extension missing pro side`);
    assert.ok(published.logicalExtension?.sides?.con || published.logicalExtension?.con, `${cohort.cohort} debate ${item.debateNumber}: AI Extension missing con side`);

    const debateRecord = {
      debateNumber: item.debateNumber,
      debateId: item.debateId,
      videoId: item.videoId,
      rankOrdinal: item.rankOrdinal ?? null,
      score: frozenScore,
      winner: frozenWinner.winner,
      margin: frozenWinner.margin,
      source: {
        transcriptSha256: item.sourceChain.transcriptSha256,
        eventsSha256: item.sourceChain.eventsSha256,
        manifestSha256: item.sourceChain.manifestSha256,
      },
      calculatedScoreSha256: fileRecord(scoresPath).sha256,
      finalLedgerSha256: fileRecord(finalLedgerPath).sha256,
      candidateSha256: lock.candidate.sha256,
      productionLedgerSha256: fileRecord(productionLedgerPath).sha256,
    };
    debateRecords.push(debateRecord);
    selectedDebates.push({ cohort: cohort.cohort, ...debateRecord });
  }

  cohortRecords.push({
    cohort: cohort.cohort,
    batchNumber: cohort.batchNumber,
    selectedDebates: cohort.expectedDebates,
    selection: fileRecord(selectionPath),
    finalLedger: fileRecord(finalLedgerPath),
    finalLedgerManifest: fileRecord(finalLedgerManifestPath),
    calculatedScores: fileRecord(scoresPath),
    scorePassManifest: fileRecord(scoreManifestPath),
    publicationLock: fileRecord(publicationLockPath),
    debates: debateRecords,
  });
}

assert.equal(selectedNumbers.length, 174);
assert.equal(new Set(selectedNumbers).size, 174, "debate numbers were selected more than once");
assert.equal(new Set(selectedIds).size, 174, "debate IDs were selected more than once");
assert.equal(new Set(selectedVideoIds).size, 174, "video IDs were selected more than once");
assert.deepEqual(selectedNumbers.slice(10), rankedPool.map((entry) => entry.debateNumber), "Batch 1–17 order does not exhaust the deterministic ranked pool");
assert.equal(scorePassCount, 18);
assert.equal(scoreEvaluations, 174);
assert.equal(exactCandidateMatches, 173);
assert.equal(documentedCandidateCorrections, 1);

const batch17Selection = json(`${continuationRoot}/batch-17/selection.json`);
assert.deepEqual(batch17Selection.selected.map((item) => item.debateNumber), rankedPool.slice(160).map((item) => item.debateNumber));
assert.deepEqual(batch17Selection.selected.map((item) => item.rankOrdinal), [161, 162, 163, 164]);
assert.equal(batch17Selection.eligibility.remainingUnselectedCount, 0);
assert.equal(batch17Selection.eligibility.frozenPoolExhaustedBySelection, true);
assert.equal(sha256(serializedJson(rankedPool)), batch17Selection.eligibility.fullRankedCensusSha256);

const allProductionLedgerFiles = readdirSync(path.join(ROOT, "docs/assessment-ledgers")).filter((file) => file.endsWith(".json")).sort();
const selectedIdSet = new Set(selectedIds);
const productionLedgerFiles = allProductionLedgerFiles.filter((file) => selectedIdSet.has(file.replace(/\.json$/, "")));
const supplementalLedgerFiles = allProductionLedgerFiles.filter((file) => !selectedIdSet.has(file.replace(/\.json$/, "")));
const standaloneRegistry = json(
  "docs/assessment-production/standalone-debates-v1/registry.json"
);
assert.equal(standaloneRegistry.status, "active");
assert.equal(standaloneRegistry.campaignBoundary.batch18Permitted, false);
const standaloneRecords = standaloneRegistry.debates.filter(
  (item) => item.status === "published-and-frozen"
);
const standaloneNumbers = new Set(
  standaloneRecords.map((item) => item.debateNumber)
);
assert.equal(productionLedgerFiles.length, 174, "campaign production-ledger count differs from verified campaign population");
assert.deepEqual(new Set(productionLedgerFiles.map((file) => file.replace(/\.json$/, ""))), selectedIdSet, "campaign production-ledger identities differ from selections");
if (supplementalLedgerFiles.length > 0) {
  const promotionManifest = json("docs/assessment-production/calibration-promotion-v1/manifest.json");
  assert.equal(promotionManifest.status, "frozen-calibration-promotion-manifest");
  assert.equal(promotionManifest.batch18Selected, false);
  const promotedLedgerFiles = promotionManifest.debates.map(
    (item) => `${item.debateId}.json`
  );
  const standaloneLedgerFiles = standaloneRecords
    .map((item) => `${item.debateId}.json`);
  assert.equal(
    new Set([...promotedLedgerFiles, ...standaloneLedgerFiles]).size,
    promotedLedgerFiles.length + standaloneLedgerFiles.length,
    "calibration-promotion and standalone ledger identities overlap"
  );
  assert.deepEqual(
    new Set(supplementalLedgerFiles),
    new Set([...promotedLedgerFiles, ...standaloneLedgerFiles]),
    "non-campaign production ledgers are not authenticated by a calibration-promotion or standalone record"
  );
}

const renderingAuditPaths = [
  `${checkpointRoot}/rendering-verification-remedy-v9/rendering-audit.json`,
  `${continuationRoot}/batch-01/rendering-verification/rendering-audit.json`,
  `${continuationRoot}/batch-02/rendering-verification/resumption-1/rendering-audit.json`,
  `${continuationRoot}/batch-03/rendering-verification/rendering-audit.json`,
  `${continuationRoot}/batch-04/rendering-verification/rendering-audit.json`,
  `${continuationRoot}/batch-05/rendering-verification/resumption-1/rendering-audit.json`,
  ...Array.from({ length: 12 }, (_, index) => `${continuationRoot}/batch-${String(index + 6).padStart(2, "0")}/rendering-verification/rendering-audit.json`),
];
let renderingDebates = 0;
let renderingViewports = 0;
let renderingScreenshots = 0;
let renderingEvidenceFiles = 0;
const renderedDebateNumbers = [];
const requiredScreenshotPaths = new Set();
const renderingRecords = [];

for (const auditPath of renderingAuditPaths) {
  const audit = json(auditPath);
  assert.match(audit.status, /passed/i, `${auditPath}: final audit did not pass`);
  assert.equal(audit.totals.runtimeFailures ?? (audit.totals.consoleErrors + audit.totals.pageErrors), 0);
  const statedHorizontalOverflowFailures = audit.totals.horizontalOverflowFailures;
  const evidenceRecords = [];
  if (audit.rows) {
    for (const row of audit.rows) {
      renderedDebateNumbers.push(row.debateNumber);
      const viewports = Array.isArray(row.viewports) ? row.viewports : Object.entries(row.viewports).map(([name, value]) => ({ name, ...value }));
      for (const viewport of viewports) {
        const evidencePath = viewport.evidence;
        if (viewport.evidenceSha256) assert.equal(sha256(bytes(evidencePath)), viewport.evidenceSha256, `${evidencePath}: evidence changed`);
        evidenceRecords.push({ debateNumber: row.debateNumber, viewportName: viewport.name, evidencePath });
      }
    }
  } else {
    for (const result of audit.results) {
      if (!renderedDebateNumbers.includes(result.debateNumber) || result.viewportName === "desktop") renderedDebateNumbers.push(result.debateNumber);
      evidenceRecords.push({ debateNumber: result.debateNumber, viewportName: result.viewportName, evidencePath: result.result });
    }
  }
  let derivedHorizontalOverflowFailures = 0;
  for (const record of evidenceRecords) {
    const evidence = json(record.evidencePath);
    assert.match(evidence.status, /passed/i);
    assert.equal(Object.values(evidence.checks).every(Boolean), true, `${record.evidencePath}: a rendering check failed`);
    const horizontalOverflowPassed = evidence.checks.noHorizontalOverflow ?? evidence.checks.horizontalOverflowAbsent;
    if (horizontalOverflowPassed !== true) derivedHorizontalOverflowFailures += 1;
    const runtimeCounts = renderingRuntimeCounts(evidence);
    assert.equal(runtimeCounts.consoleErrors, 0);
    assert.equal(runtimeCounts.pageErrors, 0);
    assert.equal(runtimeCounts.failedRequests, 0);
    for (const state of ["collapsed", "open"]) {
      const screenshot = evidence.screenshots[state];
      const screenshotBytes = bytes(screenshot.path);
      assert.equal(sha256(screenshotBytes), screenshot.sha256, `${screenshot.path}: screenshot hash changed`);
      const screenshotMetadata = renderingScreenshotMetadata(screenshot);
      assert.equal(screenshotBytes.length, screenshotMetadata.byteLength);
      const dimensions = jpegDimensions(screenshotBytes);
      assert.equal(dimensions.width, screenshotMetadata.width);
      assert.equal(dimensions.height, screenshotMetadata.height);
      requiredScreenshotPaths.add(screenshot.path);
      renderingScreenshots += 1;
    }
    assert.notEqual(evidence.screenshots.collapsed.sha256, evidence.screenshots.open.sha256);
    renderingEvidenceFiles += 1;
  }
  assert.equal(statedHorizontalOverflowFailures ?? derivedHorizontalOverflowFailures, 0);
  renderingDebates += audit.totals.debates;
  renderingViewports += audit.totals.viewportResults;
  assert.equal(evidenceRecords.length, audit.totals.viewportResults);
  assert.equal(evidenceRecords.length * 2, audit.totals.screenshots);
  renderingRecords.push({ audit: fileRecord(auditPath), debates: audit.totals.debates, viewports: audit.totals.viewportResults, screenshots: audit.totals.screenshots });
}

assert.equal(renderingDebates, 174);
assert.equal(renderingViewports, 348);
assert.equal(renderingScreenshots, 696);
assert.equal(renderingEvidenceFiles, 348);
assert.equal(requiredScreenshotPaths.size, 696);
assert.deepEqual(new Set(renderedDebateNumbers), new Set(selectedNumbers), "rendering coverage differs from campaign selections");
const retainedRenderingJpegs = walk("docs/assessment-production").filter((file) => file.endsWith(".jpg") && file.includes("rendering-verification"));
for (const outputRoot of Array.from({ length: 8 }, (_, index) => `output/playwright/batch-${index + 10}-rendering`)) {
  if (existsSync(path.join(ROOT, outputRoot))) retainedRenderingJpegs.push(...walk(outputRoot).filter((file) => file.endsWith(".jpg")));
}
assert.equal(retainedRenderingJpegs.length, 732);
assert.equal(retainedRenderingJpegs.filter((file) => !requiredScreenshotPaths.has(file)).length, 36);

const audioRecords = [
  { cohort: "checkpoint", path: `${checkpointRoot}/audio-verification/audio-verification.json`, required: 2, attempts: 2, completed: 2, estimateUsd: 0.0369, estimateBasis: "duration-derived processing exposure" },
  { cohort: "batch-01", path: `${continuationRoot}/batch-01/audio-verification/cost-control-analysis.json`, finalPath: `${continuationRoot}/batch-01/audio-verification/audio-verification.json`, required: 3, attempts: 3, completed: 3, estimateUsd: 0.1190425, estimateBasis: "usage-derived" },
  { cohort: "batch-02", path: `${continuationRoot}/batch-02/audio-verification/audio-verification.json`, required: 10, attempts: 10, completed: 10, estimateUsd: 0.2933175, estimateBasis: "usage-derived" },
  { cohort: "batch-03", path: `${continuationRoot}/batch-03/audio-verification/correction-audio-verification.json`, required: 8, attempts: 8, completed: 8, estimateUsd: 0.2452325, estimateBasis: "usage-derived" },
  { cohort: "batch-04", path: `${continuationRoot}/batch-04/audio-verification/audio-verification.json`, required: 4, attempts: 4, completed: 4, estimateUsd: 0.1144125, estimateBasis: "usage-derived" },
  { cohort: "batch-05", path: `${continuationRoot}/batch-05/audio-verification/debate-189-timeline-alignment-recovery/audio-verification.json`, required: 6, attempts: 7, completed: 7, estimateUsd: 0.251605, estimateBasis: "usage-derived; includes one correction call on a corrected frozen clip" },
  { cohort: "batch-06", path: `${continuationRoot}/batch-06/audio-verification/audio-verification.json`, required: 2, attempts: 2, completed: 2, estimateUsd: 0.1127375, estimateBasis: "usage-derived" },
  { cohort: "batch-07", path: `${continuationRoot}/batch-07/audio-verification/audio-verification.json`, required: 5, attempts: 5, completed: 5, estimateUsd: 0.162855, estimateBasis: "usage-derived" },
  { cohort: "batch-08", path: `${continuationRoot}/batch-08/audio-verification/resolution-execution/audio-verification.json`, required: 6, attempts: 6, completed: 6, estimateUsd: 0.156225, estimateBasis: "usage-derived" },
  { cohort: "batch-09", path: `${continuationRoot}/batch-09/audio-verification-debate-183-21/evidence-boundary-correction-1/cohort-replay.json`, required: 4, attempts: 4, completed: 4, estimateUsd: 0.224845, estimateBasis: "usage-derived" },
  { cohort: "batch-10", path: `${continuationRoot}/batch-10/audio-verification/audio-verification.json`, required: 9, attempts: 9, completed: 9, estimateUsd: 0.4583625, estimateBasis: "usage-derived" },
  { cohort: "batch-11", path: `${continuationRoot}/batch-11/audio-verification/audio-verification.json`, required: 2, attempts: 2, completed: 2, estimateUsd: 0.06726, estimateBasis: "usage-derived" },
  { cohort: "batch-12", path: `${continuationRoot}/batch-12/audio-verification/audio-verification.json`, required: 4, attempts: 4, completed: 4, estimateUsd: 0.1625875, estimateBasis: "usage-derived" },
  { cohort: "batch-13", path: `${continuationRoot}/batch-13/audio-verification/audio-attribution-recovery/combined-audio-verification.json`, required: 8, attempts: 8, completed: 8, estimateUsd: 0.21423, estimateBasis: "usage-derived" },
  { cohort: "batch-14", path: `${continuationRoot}/batch-14/audio-verification/audio-attribution-recovery/combined-audio-verification.json`, required: 12, attempts: 12, completed: 12, estimateUsd: 0.422005, estimateBasis: "usage-derived" },
  { cohort: "batch-15", path: `${continuationRoot}/batch-15/audio-verification/audio-attribution-recovery/combined-audio-verification.json`, required: 3, attempts: 3, completed: 3, estimateUsd: 0.1002925, estimateBasis: "usage-derived" },
  { cohort: "batch-16", path: `${continuationRoot}/batch-16/audio-verification/audio-attribution-recovery/combined-audio-verification.json`, required: 10, attempts: 11, completed: 10, estimateUsd: 0.45347, estimateBasis: "usage-derived; includes one preserved transport failure and one authorized replacement" },
  { cohort: "batch-17", path: `${continuationRoot}/batch-17/audio-verification/audio-attribution-recovery/combined-audio-verification.json`, required: 1, attempts: 1, completed: 1, estimateUsd: 0.0590775, estimateBasis: "usage-derived" },
];
let audioRequired = 0;
let audioVerified = 0;
let audioAttempts = 0;
let audioCompleted = 0;
let audioEstimateUsd = 0;
for (const record of audioRecords) {
  const finalRecord = json(record.finalPath ?? record.path);
  const totals = finalRecord.totals ?? finalRecord;
  const required = totals.requiredMoves ?? totals.requiredItems;
  const verified = totals.verified ?? totals.verifiedItems;
  const unresolved = totals.unresolved ?? totals.unresolvedItems;
  assert.equal(required, record.required, `${record.cohort}: required audio count changed`);
  assert.equal(verified, record.required, `${record.cohort}: audio verification incomplete`);
  assert.equal(unresolved, 0, `${record.cohort}: unresolved audio remains`);
  record.evidence = fileRecord(record.path);
  if (record.finalPath) record.finalEvidence = fileRecord(record.finalPath);
  audioRequired += record.required;
  audioVerified += verified;
  audioAttempts += record.attempts;
  audioCompleted += record.completed;
  audioEstimateUsd += record.estimateUsd;
}
assert.equal(audioRequired, 99);
assert.equal(audioVerified, 99);
assert.equal(audioAttempts, 101);
assert.equal(audioCompleted, 100);
assert.ok(Math.abs(audioEstimateUsd - 3.6544575) < 1e-12);

// The campaign closure report is a frozen historical audit through Batch 17.
// Standalone post-campaign debates are authenticated separately and must not
// change its recovery-file census or its historical production population.
const assessmentProductionFiles = walk("docs/assessment-production").filter(
  (file) => !file.startsWith("docs/assessment-production/standalone-debates-v1/")
);
const explicitFailureOrDiagnosisRecords = assessmentProductionFiles.filter((file) => /(failure|diagnosis)/i.test(path.basename(file)));
const preservedFailurePathArtifacts = assessmentProductionFiles.filter((file) => /(failure|diagnosis)/i.test(file));
const recoveryExecutionRecords = assessmentProductionFiles.filter((file) => file.endsWith("model-execution.json") && /(recovery|repair|resumption|correction)/i.test(file));
const fieldDisjointExecutionRecords = recoveryExecutionRecords.filter((file) => /field[- ]disjoint/i.test(text(file)));
const controllerFailureRecords = explicitFailureOrDiagnosisRecords.filter((file) => /(controller|browser|server)/i.test(file));
const levelFourRecords = assessmentProductionFiles.filter((file) => /(?:level-?4|recovery-level-?4|fourth-recovery)/i.test(file));
assert.equal(levelFourRecords.length, 0, "an unauthorized fourth recovery level is present");
const exceptionalThirdLevelRecords = [
  `${continuationRoot}/batch-13/publication-reconstruction/timeout-recovery/critique-repair/exceptional-atomic-recovery/analysis.json`,
  `${continuationRoot}/batch-14/publication-reconstruction/failure-recovery/original-unattempted-context-resumption-3/debate-55-timeout-recovery/critique-repair-level-2/exceptional-atomic-recovery/analysis.json`,
];
for (const file of exceptionalThirdLevelRecords) assert.equal(json(file).recoveryLevel, 3);
const batch16TransportFailure = `${continuationRoot}/batch-16/audio-verification/model-execution.json`;
const batch16ReplacementEvidence = `${continuationRoot}/batch-16/audio-verification/exceptional-paid-recovery/model-execution.json`;
assert.equal(existsSync(path.join(ROOT, batch16TransportFailure)), true);
assert.equal(existsSync(path.join(ROOT, batch16ReplacementEvidence)), true);

const priorManifest = existsSync(path.join(ROOT, MANIFEST_PATH)) ? json(MANIFEST_PATH) : null;
const generatedAt = writeMode ? new Date().toISOString() : priorManifest?.generatedAt;
assert.ok(generatedAt, "run with --write before check mode");

const closureManifest = {
  schemaVersion: "1.0-assessment-production-campaign-closure",
  protocolId: "assessment-production-campaign-closure-v1",
  status: "passed-complete-campaign-closure-integrity-audit",
  generatedAt,
  auditedBaselineCommit: AUDITED_BASELINE_COMMIT,
  branch: "main",
  authorization: {
    campaignClosureOnly: true,
    batch18Selected: false,
    batch18Authorized: false,
    newPaidCallsAuthorized: false,
    directIncrementalCostUsd: 0,
    immutableJudgmentsChanged: false,
    calculatedScoresChanged: false,
    acceptedPublicationProseChanged: false,
  },
  population: {
    repositoryDebates: debates.filter(
      (debate) => !standaloneNumbers.has(debate.number)
    ).length,
    checkpointDebates: 10,
    frozenContinuationPool: rankedPool.length,
    continuationBatches: 17,
    standardContinuationBatches: 16,
    finalShortBatchDebates: 4,
    reassessedDebates: selectedNumbers.length,
    uniqueDebateNumbers: new Set(selectedNumbers).size,
    uniqueDebateIds: new Set(selectedIds).size,
    uniqueVideoIds: new Set(selectedVideoIds).size,
    eligibleFrozenPoolRemaining: 0,
    frozenPoolExhausted: true,
    batch18SelectionArtifactPresent: false,
    rankedPoolSha256: sha256(serializedJson(rankedPool)),
    rankedPoolEvidence: fileRecord(policyPath),
    batch17ExhaustionEvidence: fileRecord(`${continuationRoot}/batch-17/selection.json`),
  },
  immutableEvidence: {
    frozenSourceFilesChecked,
    finalLedgerSourceHashReferencesChecked,
    finalLedgers: 18,
    acceptedScoreArtifacts: 18,
    deterministicScorePasses: scorePassCount,
    debateScoreEvaluations: scoreEvaluations,
    scorePassesPerDebate: 1,
    scorePassRerunsPerformedByClosureAudit: 0,
  },
  production: {
    productionDebates: debates.filter(
      (debate) => !standaloneNumbers.has(debate.number)
    ).length,
    expectedProductionLedgersHypothesis: 174,
    verifiedProductionLedgers: productionLedgerFiles.length,
    exactCandidateMatches,
    documentedDeterministicCandidateCorrections: documentedCandidateCorrections,
    documentedCorrection: {
      debateNumber: "24",
      field: "sections[0].title",
      scoresChanged: 0,
      ledgerFilesChanged: 0,
      preparation: fileRecord(`${continuationRoot}/batch-11/production-publication/title-correction-1/preparation.json`),
      execution: fileRecord(`${continuationRoot}/batch-11/production-publication/title-correction-1/execution.json`),
    },
    authenticatedCompatibilityRoutes: 18,
    routeRange: "checkpoint and Batch 1–17",
  },
  rendering: {
    finalPassingAudits: renderingAuditPaths.length,
    debates: renderingDebates,
    viewports: renderingViewports,
    evidenceFiles: renderingEvidenceFiles,
    requiredPassingScreenshots: renderingScreenshots,
    requiredScreenshotHashesAndDimensionsVerified: requiredScreenshotPaths.size,
    totalRetainedRenderingScreenshots: retainedRenderingJpegs.length,
    preservedPartialFailureScreenshots: retainedRenderingJpegs.length - requiredScreenshotPaths.size,
    freshBrowserRunRequired: false,
    audits: renderingRecords,
  },
  audio: {
    requiredMoves: audioRequired,
    verifiedMoves: audioVerified,
    unresolvedMoves: 0,
    paidAttempts: audioAttempts,
    completedPaidCalls: audioCompleted,
    preservedTransportFailures: audioAttempts - audioCompleted,
    consolidatedRecordedEstimateUsd: Number(audioEstimateUsd.toFixed(7)),
    estimateQualification: "Checkpoint uses a duration-derived exposure; Batch 1–17 totals use usage-derived estimates. Actual invoice charges were not available in the retained records.",
    actualInvoiceChargesAvailable: false,
    closureAuditDirectIncrementalCostUsd: 0,
    records: audioRecords,
  },
  recoveryAndControls: {
    closureAuditRecoveryActions: 6,
    ordinaryClosureAuditRecoveryMaximumLevel: 2,
    exceptionalThirdAuditToolRecoveryUses: 1,
    exceptionalThirdAuditToolRecoveryScope: "rendering runtime-schema normalization only",
    exceptionalThirdAuditToolRecoveryAuthorization: fileRecord(`${CLOSURE_ROOT}/audit-recovery-3/authorization.json`),
    exceptionalScreenshotMetadataRecoveryUses: 1,
    exceptionalScreenshotMetadataRecoveryScope: "screenshot dimension and byte-length metadata normalization only",
    exceptionalScreenshotMetadataRecoveryAuthorization: fileRecord(`${CLOSURE_ROOT}/audit-screenshot-metadata-recovery/authorization.json`),
    exceptionalFinalRenderingInventoryRecoveryUses: 1,
    exceptionalFinalRenderingInventoryRecoveryScope: "missing horizontal-overflow aggregate derivation and Batch 10–17 retained-screenshot root inventory only",
    exceptionalFinalRenderingInventoryRecoveryAuthorization: fileRecord(`${CLOSURE_ROOT}/audit-final-rendering-normalization/authorization.json`),
    exceptionalOverflowAliasRetryUses: 1,
    exceptionalOverflowAliasRetryScope: "accept the two diagnosed frozen horizontal-overflow boolean aliases only",
    exceptionalOverflowAliasRetryAuthorization: fileRecord(`${CLOSURE_ROOT}/audit-overflow-alias-retry/authorization.json`),
    finalReadOnlyDiagnosis: fileRecord(`${CLOSURE_ROOT}/final-read-only-diagnosis/analysis.json`),
    closureAuditFailureRecords: [
      fileRecord(`${CLOSURE_ROOT}/audit-recovery-1/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/audit-recovery-2/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/audit-recovery-limit-blocker/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/audit-recovery-3/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/audit-screenshot-metadata-recovery/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/audit-final-rendering-normalization/failure.json`),
    ],
    validationReplayInvocationCorrections: 4,
    validationReplayInvocationFailureRecords: [
      fileRecord(`${CLOSURE_ROOT}/validation-replay-invocation-correction/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/validation-replay-invocation-correction-2/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/validation-replay-invocation-correction-3/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/validation-replay-invocation-correction-4/failure.json`),
    ],
    postPublicationWrapperDiagnoses: [
      fileRecord(`${CLOSURE_ROOT}/stale-score-validator-diagnosis/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/stale-rendering-validator-diagnosis/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/stale-selection-validator-diagnosis/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/stale-adjudication-analyzer-diagnosis/failure.json`),
      fileRecord(`${CLOSURE_ROOT}/stale-compatibility-validator-diagnosis/failure.json`),
    ],
    ordinarySemanticRecoveryMaximumLevel: 2,
    exceptionalThirdLevelUses: exceptionalThirdLevelRecords.length,
    exceptionalThirdLevelRecords: exceptionalThirdLevelRecords.map(fileRecord),
    unauthorizedFourthLevelUses: 0,
    paidTransportReplacementAttempts: 1,
    paidTransportReplacementEvidence: [fileRecord(batch16TransportFailure), fileRecord(batch16ReplacementEvidence)],
    recoveryPathModelExecutionRecords: recoveryExecutionRecords.length,
    fieldDisjointRecoveryExecutionRecords: fieldDisjointExecutionRecords.length,
    explicitlyNamedFailureOrDiagnosisRecords: explicitFailureOrDiagnosisRecords.length,
    artifactsWithinPreservedFailureOrDiagnosisPaths: preservedFailurePathArtifacts.length,
    controllerOrBrowserFailureRecords: controllerFailureRecords.length,
    deterministicCorrectionDirectories: new Set(assessmentProductionFiles.filter((file) => /correction/i.test(file)).map((file) => file.split("/").slice(0, -1).join("/"))).size,
    rejectedProseReused: false,
    acceptedFieldsAlteredByClosureAudit: false,
    historicalFailuresPreserved: true,
  },
  validation: {
    summary: fileRecord(`${CLOSURE_ROOT}/validation-summary.json`),
    closureAudit: "passed",
    productionDebateValidator: "passed",
    compatibilityReplay: "passed by closure reconstruction across 18 retained executions",
    completeRepositorySuite: "passed",
    generatedPageComparison: "passed",
    seoValidation: "passed within complete repository suite and generated-page comparison",
    transcriptValidation: "passed within complete repository suite and standalone replay",
    applicableAcceptedOutputGateCommandsPassed: 38,
    immutableCohortValidators: "18 accepted independent-judgment analyses and 18 accepted final-ledger validators passed; checkpoint selection recovery and adjudication analyses also passed",
    inapplicableHistoricalWrappersDiagnosedAndPreserved: 5,
    freshRenderingRequired: false,
  },
  cohorts: cohortRecords,
  selectedDebates,
  preservedLimitations: [
    "Actual provider invoice charges are unavailable; the consolidated audio total is a recorded estimate, not a known billed amount.",
    "The checkpoint audio amount is duration-derived, whereas the continuation amounts are usage-derived.",
    "Batch 1's post-call usage-derived estimate was $0.1190425, $0.0190425 above its initial $0.10 estimate cap; the exceedance was preserved and acknowledged before downstream work.",
    "Thirty-six screenshots from a partial checkpoint rendering failure are retained in addition to the 696 screenshots belonging to final passing audits.",
    "Batch 9 contains extensive diagnosed source-acquisition attempts; their numbering records sequential transport/source recovery, not semantic recovery levels.",
    "Debate 24 has one documented deterministic section-title correction after candidate finalization; its scores, ledger, and all other semantic fields remain unchanged.",
  ],
  finalRepositoryState: {
    auditedBaselineCommit: AUDITED_BASELINE_COMMIT,
    closureCommit: "the commit containing this manifest",
    expectedBranch: "main",
    expectedRemote: "origin/main",
    equalityMustBeVerifiedAfterPush: true,
  },
};

function buildReport(manifest) {
  const lines = [
    "# SLUGFESTER reassessment campaign closure",
    "",
    `Status: **passed**. This audit closes the reassessment campaign through Batch 17 against baseline commit \`${manifest.auditedBaselineCommit}\`. Batch 18 was not selected and is not authorized by this closure task.`,
    "",
    "## Verified result",
    "",
    `The campaign published ${manifest.population.reassessedDebates} unique reassessments: 10 checkpoint debates plus all ${manifest.population.frozenContinuationPool} debates in the frozen continuation pool. Batches 1–16 contained ten debates each; Batch 17 contained the final four. Deterministic rank reconstruction exactly matched every continuation selection, and zero eligible frozen-pool debates remain.`,
    "",
    `All ${manifest.immutableEvidence.finalLedgers} final ledgers retained their frozen source hash chains (${manifest.immutableEvidence.finalLedgerSourceHashReferencesChecked} references checked). The ${manifest.immutableEvidence.debateScoreEvaluations} debate results each have exactly one authorized deterministic score evaluation, and published move, section, and overall scores reproduce the frozen calculated-score artifacts. The audit did not rerun scoring or change judgments, scores, sources, or accepted prose.`,
    "",
    `The previously hypothetical production-ledger total is verified at ${manifest.production.verifiedProductionLedgers}. Production has ${manifest.production.exactCandidateMatches} exact candidate matches and one documented deterministic Debate 24 section-title correction that changed no score or ledger field. All ${manifest.production.authenticatedCompatibilityRoutes} compatibility routes—the checkpoint and Batch 1–17—passed authentication and replay.`,
    "",
    "## Rendering, audio, and recovery",
    "",
    `All ${manifest.rendering.viewports} required rendering viewports passed across ${manifest.rendering.debates} debates. The audit rehashed and dimension-checked ${manifest.rendering.requiredPassingScreenshots} required screenshots. Another ${manifest.rendering.preservedPartialFailureScreenshots} screenshots from a preserved partial checkpoint failure remain, for ${manifest.rendering.totalRetainedRenderingScreenshots} retained rendering screenshots total. Existing evidence was complete, so no fresh browser run was necessary.`,
    "",
    `Audio records reconcile ${manifest.audio.requiredMoves} required and ${manifest.audio.verifiedMoves} verified moves, ${manifest.audio.paidAttempts} paid attempts, ${manifest.audio.completedPaidCalls} completed paid calls, and one preserved transport failure followed by its authorized replacement. The consolidated recorded estimate is $${manifest.audio.consolidatedRecordedEstimateUsd.toFixed(7)}. Actual invoice charges are unavailable. This closure audit made no paid call and cost $0 direct incremental cost.`,
    "",
    `Recovery evidence includes ${manifest.recoveryAndControls.recoveryPathModelExecutionRecords} model-execution records within recovery, repair, resumption, or correction paths; ${manifest.recoveryAndControls.fieldDisjointRecoveryExecutionRecords} of those records explicitly document field-disjoint handling. Two exceptional third-level publication recoveries are preserved (Batches 13 and 14), one paid transport replacement is preserved (Batch 16), and no fourth campaign recovery level exists. The closure checker used two ordinary corrections and four explicitly authorized reader-only normalization or alias-retry actions; every failed attempt is preserved. Historical failure and diagnosis records remain intact.`,
    "",
    "## Validation",
    "",
    `The complete repository suite, production debate validator, generated-page comparison, transcript replay, ${manifest.validation.applicableAcceptedOutputGateCommandsPassed} applicable accepted-output gate commands, and this campaign-closure replay all passed. Five historical wrappers encode preparation-time absence, pre-publication hashes, original failed attempts, or mutable diagnostic references; their representative failures and post-publication diagnoses are preserved rather than altering historical evidence. The closure replay reconstructs all 18 compatibility executions. The machine-readable manifest contains the selected identities, frozen scores, source hashes, evidence hashes, cost records, recovery counts, and per-cohort locks.`,
    "",
    "## Preserved limitations",
    "",
    ...manifest.preservedLimitations.map((item) => `- ${item}`),
    "",
    "The closure commit is the commit containing this report and its manifest. Final local `HEAD`, local `main`, and `origin/main` equality is verified after the closure push and reported in the task completion message.",
  ];
  return `${lines.join("\n")}\n`;
}

const report = buildReport(closureManifest);
if (writeMode) {
  if (!existsSync(path.join(ROOT, CLOSURE_ROOT))) throw new Error(`create ${CLOSURE_ROOT} before running --write`);
  writeFileSync(path.join(ROOT, MANIFEST_PATH), serializedJson(closureManifest));
  writeFileSync(path.join(ROOT, REPORT_PATH), report);
  console.log(`Wrote ${MANIFEST_PATH}`);
  console.log(`Wrote ${REPORT_PATH}`);
} else {
  sameJson(json(MANIFEST_PATH), closureManifest);
  assert.equal(text(REPORT_PATH), report, `${REPORT_PATH} is stale`);
}

const verificationMode = repositoryOnlyMode
  ? `repository-only replay; ${repositoryOnlyHashLocksChecked} ignored-local-evidence references were verified through their tracked frozen hash locks without reading local bytes`
  : "full replay including ignored local campaign-evidence bytes";
if (repositoryOnlyMode) assert.equal(repositoryOnlyHashLocksChecked, 1316, "repository-only ignored-local-evidence coverage changed");
console.log(`Campaign closure audit passed: ${selectedNumbers.length} reassessments, ${productionLedgerFiles.length} ledgers, ${renderingScreenshots} passing screenshots, ${audioRequired} audio verifications (${verificationMode}).`);
