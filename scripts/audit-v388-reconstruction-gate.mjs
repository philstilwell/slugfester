#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const auditPath = "docs/calibration/v3.8.8/reconstruction/deterministic-audit.json";
const performanceRoot = "docs/calibration/v3.8.8/performance-judgment-consensus";
const reconstructionRoot = "docs/calibration/v3.8.8/reconstruction";
const debateNumbers = ["55", "103", "161"];
const ratingKeys = [
  "logicalCoherence",
  "evidenceWarrant",
  "responsiveness",
  "relevanceBurden",
  "precisionClarity",
  "epistemicCalibration",
  "representationalCharity"
];
const reconstructionPaths = {
  "55": `${reconstructionRoot}/validated-outputs/debate-55.json`,
  "103": `${reconstructionRoot}/outputs/debate-103.json`,
  "161": `${reconstructionRoot}/outputs/debate-161.json`
};

const readBytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const fixed = (value, places = 6) => Number(value.toFixed(places));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const runJsonValidator = (args) => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  check(result.status === 0, `${args[0]} failed: ${(result.stderr || result.stdout).trim()}`);
  return JSON.parse(result.stdout);
};
const tokens = (value) => new Set(String(value).toLowerCase().match(/[a-z0-9]+/g) || []);
const jaccard = (a, b) => {
  const aa = tokens(a), bb = tokens(b);
  const intersection = [...aa].filter((token) => bb.has(token)).length;
  return aa.size || bb.size ? intersection / new Set([...aa, ...bb]).size : 0;
};

const transcriptValidation = runJsonValidator(["scripts/validate-corpus-transcripts.mjs"]);
const ledgerValidation = runJsonValidator(["scripts/validate-v388-performance-final-ledger.mjs"]);
const scoreValidation = runJsonValidator(["scripts/validate-v388-performance-scores.mjs"]);
const initialDisagreements = await readJson(`${performanceRoot}/initial-disagreements.json`);
const finalLedger = await readJson(`${performanceRoot}/final-ledger.json`);
const audioVerification = await readJson(`${performanceRoot}/audio-verification.json`);
const quoteVerification = await readJson(`${reconstructionRoot}/quote-verification.json`);

const rawScalarDeltas = [];
for (const debateNumber of debateNumbers) {
  const normalizedRoot = `${performanceRoot}/validated-recovery/normalized/outputs`;
  const passA = await readJson(`${normalizedRoot}/debate-${debateNumber}-pass-a.json`);
  const passB = await readJson(`${normalizedRoot}/debate-${debateNumber}-pass-b.json`);
  const passBByMove = new Map(passB.moveJudgments.map((move) => [move.moveId, move]));
  for (const move of passA.moveJudgments) {
    const other = passBByMove.get(move.moveId);
    check(other, `${debateNumber}:${move.moveId}: Pass B move missing`);
    for (const key of ratingKeys) rawScalarDeltas.push(Math.abs(move.ratings[key].value - other.ratings[key].value));
  }
}
const materialScalarDeltas = rawScalarDeltas.filter((delta) => delta > 5);
const scalarReliability = {
  fieldsCompared: rawScalarDeltas.length,
  meanAbsoluteRawScalarDelta: fixed(rawScalarDeltas.reduce((sum, value) => sum + value, 0) / rawScalarDeltas.length),
  materiallyDisputedScalarFields: materialScalarDeltas.length,
  materiallyDisputedScalarFieldRate: fixed(materialScalarDeltas.length / rawScalarDeltas.length),
  maximumRawScalarDelta: Math.max(...rawScalarDeltas)
};

const reconstructionAudits = [];
let sourceChainHashesChecked = 0;
let displayedMoves = 0;
let allMoves = 0;
let loadBearingMisses = 0;
let directRepliesDisplayed = 0;
let directRepliesWithDisplayedTarget = 0;
let introducedItems = 0;
let maximumIntroducedSourceJaccard = 0;

for (const debateNumber of debateNumbers) {
  const outputPath = reconstructionPaths[debateNumber];
  const packetPath = `${reconstructionRoot}/packets/debate-${debateNumber}.json`;
  const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
  const validator = runJsonValidator(["scripts/validate-v388-reconstruction-output.mjs", outputPath, packetPath]);
  for (const [kind, sourcePath, expectedHash] of [
    ["transcript", packet.sourceChain.transcriptPath, packet.sourceChain.transcriptSha256],
    ["events", packet.sourceChain.eventsPath, packet.sourceChain.eventsSha256],
    ["manifest", packet.sourceChain.localManifestPath, packet.sourceChain.localManifestSha256]
  ]) {
    const observedHash = sha256(await readBytes(sourcePath));
    check(observedHash === expectedHash, `${debateNumber}:${kind}: source-chain hash mismatch`);
    sourceChainHashesChecked += 1;
  }

  const selectedMoveIds = new Set(output.scorecard.sections.flatMap((section) =>
    section.exchanges.flatMap((exchange) => [exchange.pro?.moveId, exchange.con?.moveId].filter(Boolean))
  ));
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  const debateLoadBearingMisses = [];
  const missingDisplayedTargets = [];
  for (const section of packet.sections) {
    for (const side of ["pro", "con"]) {
      const moves = packet.moves.filter((move) => move.sectionId === section.sectionId && move.side === side);
      const maximumImportance = Math.max(...moves.map((move) => move.importance));
      const loadBearing = moves.filter((move) => move.importance === maximumImportance);
      if (!loadBearing.some((move) => selectedMoveIds.has(move.moveId))) {
        debateLoadBearingMisses.push({ sectionId: section.sectionId, side, candidateMoveIds: loadBearing.map((move) => move.moveId) });
      }
    }
  }
  for (const moveId of selectedMoveIds) {
    const move = moveById.get(moveId);
    const targetIds = move.response?.decisiveTargetIds || [];
    if (!targetIds.length) continue;
    directRepliesDisplayed += 1;
    if (targetIds.some((targetId) => selectedMoveIds.has(targetId))) directRepliesWithDisplayedTarget += 1;
    else missingDisplayedTargets.push({ moveId, targetIds });
  }
  const sourcePropositions = packet.moves.map((move) => move.proposition);
  const introduced = ["pro", "con"].flatMap((side) => {
    const extension = output.aiExtension[side];
    return [extension.thesis, ...extension.premises, extension.conclusion, ...extension.newArguments]
      .filter((item) => item.novelty.classification === "introduces");
  });
  const introducedSimilarity = introduced.map((item) => ({
    itemId: item.id,
    maximumSourcePropositionJaccard: fixed(Math.max(...sourcePropositions.map((proposition) => jaccard(item.text, proposition))))
  }));
  maximumIntroducedSourceJaccard = Math.max(maximumIntroducedSourceJaccard, ...introducedSimilarity.map((item) => item.maximumSourcePropositionJaccard));
  introducedItems += introduced.length;
  displayedMoves += selectedMoveIds.size;
  allMoves += packet.moves.length;
  loadBearingMisses += debateLoadBearingMisses.length;
  reconstructionAudits.push({
    debateNumber,
    debateId: packet.debateId,
    outputPath,
    outputSha256: sha256(await readBytes(outputPath)),
    validator,
    displayedMoves: selectedMoveIds.size,
    ledgerMoves: packet.moves.length,
    displayedMoveCoverage: fixed(selectedMoveIds.size / packet.moves.length),
    loadBearingMisses: debateLoadBearingMisses,
    directRepliesWithoutDisplayedTarget: missingDisplayedTargets,
    introducedSimilarity
  });
}

const renderingAuditPath = `${reconstructionRoot}/previews/rendering-audit.json`;
const adversarialAuditPath = `${reconstructionRoot}/adversarial-audit/audit-summary.json`;
const renderingAudit = existsSync(path.resolve(root, renderingAuditPath)) ? await readJson(renderingAuditPath) : null;
const adversarialAudit = existsSync(path.resolve(root, adversarialAuditPath)) ? await readJson(adversarialAuditPath) : null;
const transcriptionCostUsd = quoteVerification.cost.totalV388EstimatedTranscriptionCostUsd;

const thresholds = [
  { id: "complete-source-chains-and-audio", requirement: "3/3 complete dyadic source chains and 100% required audio verification", passed: transcriptValidation.available === 195 && sourceChainHashesChecked === 9 && audioVerification.verifiedMoves === 17 && quoteVerification.quotes.length === 6 && quoteVerification.quotes.every((quote) => quote.audioVerified), observed: { sourceChainHashesChecked, mediumConfidenceMovesAudioVerified: audioVerification.verifiedMoves, representativeQuotesAudioVerified: quoteVerification.quotes.length } },
  { id: "clean-initial-scoring-passes", requirement: "Two valid initial scoring passes per debate without post-hoc recovery", passed: initialDisagreements.evidenceBoundary.originalCleanGatePassed === true, observed: initialDisagreements.evidenceBoundary },
  { id: "mean-absolute-scalar-delta", requirement: "Mean absolute raw scalar delta <= 5", passed: scalarReliability.meanAbsoluteRawScalarDelta <= 5, limit: 5, observed: scalarReliability.meanAbsoluteRawScalarDelta },
  { id: "material-scalar-dispute-rate", requirement: "Materially disputed scalar-field rate <= 0.25", passed: scalarReliability.materiallyDisputedScalarFieldRate <= 0.25, limit: 0.25, observed: scalarReliability.materiallyDisputedScalarFieldRate },
  { id: "final-ledger-integrity", requirement: "Zero unresolved scoring fields and zero nondisputed-field mutations", passed: ledgerValidation.finalLedgerValidated && ledgerValidation.thirdValuesInvented === 0, observed: { finalLedgerValidated: ledgerValidation.finalLedgerValidated, thirdValuesInvented: ledgerValidation.thirdValuesInvented } },
  { id: "diagnostic-score-reliability", requirement: "Overall pass delta <= 5, identical winners, Spearman >= 0.90", passed: scoreValidation.scoreReliabilityGatePassed, observed: { maximumOverallDelta: scoreValidation.maximumDiagnosticOverallPassDelta, identicalWinners: scoreValidation.identicalWinnerClassificationsAcrossAllDebates, spearman: scoreValidation.spearmanRankCorrelationAcrossSixSideTotals } },
  { id: "burden-and-calculator-integrity", requirement: "Zero burden-adjustment exclusion violations and zero calculator mismatches", passed: scoreValidation.calculatorValidated && finalLedger.debates.every((debate) => ["pro", "con"].every((side) => debate.burdenCompletionAdjustment[side].value === 0)), observed: { calculatorValidated: scoreValidation.calculatorValidated, nonzeroFinalAdjustments: finalLedger.debates.flatMap((debate) => ["pro", "con"].filter((side) => debate.burdenCompletionAdjustment[side].value !== 0)).length } },
  { id: "reconstruction-contract", requirement: "3/3 complete reconstructions with score/prose identity and verified quotes", passed: reconstructionAudits.length === 3 && reconstructionAudits.every((audit) => audit.validator.status === "passed"), observed: { debates: reconstructionAudits.length, displayedMoves, ledgerMoves: allMoves, loadBearingMisses } },
  { id: "ai-extension-contract", requirement: "Complete novelty maps, balanced structure, exact placement/byline, zero prohibited terms", passed: reconstructionAudits.every((audit) => audit.validator.extensionBalancePassed && audit.validator.exactPlacementAccordionBylinePassed && audit.validator.prohibitedLanguageHits === 0), observed: { noveltyItems: reconstructionAudits.reduce((sum, audit) => sum + audit.validator.noveltyItems, 0), introducedItems, maximumIntroducedSourceJaccard: fixed(maximumIntroducedSourceJaccard) } },
  { id: "rendering", requirement: "Desktop, mobile, keyboard, accordion, and reduced-motion checks passed", passed: renderingAudit?.status === "passed", observed: renderingAudit?.status || "pending" },
  { id: "metered-model-cost", requirement: "Metered model API cost = $0", passed: true, observedUsd: 0 },
  { id: "transcription-cost", requirement: "Transcription cost = $0", passed: transcriptionCostUsd === 0, observedUsd: transcriptionCostUsd, note: "The required medium-confidence and representative-quote audio verification used approved paid transcription." }
];

const strictGatePassed = thresholds.every((threshold) => threshold.passed);
const audit = {
  schemaVersion: "3.8.8-reconstruction-deterministic-audit",
  protocolId: "v3.8.8-recovered-diagnostic-reconstruction",
  status: "passed-diagnostic-audit",
  strictThreeDebateGatePassed: strictGatePassed,
  tenDebateAuthorization: false,
  all195Authorization: false,
  calibrationOnly: true,
  sourceValidation: { corpusDebates: transcriptValidation.corpusDebates, localTranscriptsAvailable: transcriptValidation.available, sourceChainHashesChecked },
  scalarReliability,
  scoringConsensus: { initialDisagreements: initialDisagreements.summary, finalLedger: ledgerValidation, scoreReliability: scoreValidation },
  audioVerification: { mediumConfidenceMovesVerified: audioVerification.verifiedMoves, minimumBagOfWordsRecall: audioVerification.minimumBagOfWordsRecallAgainstLockedExcerpt, representativeQuotesVerified: quoteVerification.quotes.length },
  reconstruction: { debates: reconstructionAudits, displayedMoves, ledgerMoves: allMoves, loadBearingMisses, directRepliesDisplayed, directRepliesWithDisplayedTarget, directRepliesWithoutDisplayedTarget: directRepliesDisplayed - directRepliesWithDisplayedTarget },
  supplementalAdversarialAudit: adversarialAudit ? { status: adversarialAudit.status, verdicts: adversarialAudit.verdicts } : { status: "pending" },
  costs: { authentication: "ChatGPT subscription", meteredModelApiCostUsd: 0, estimatedTranscriptionCostUsd: transcriptionCostUsd, exactBilledCostAvailable: false },
  recoveryHistory: {
    originalScoringPassesRepresentationNormalized: initialDisagreements.evidenceBoundary.postHocRepresentationRecoveryUsed,
    reconstructionSchemaEndpointRecoveryUsed: true,
    debate55BoundedProseCorrectionUsed: true,
    debates103And161CleanFirstContexts: true
  },
  thresholds,
  failedThresholdIds: thresholds.filter((threshold) => !threshold.passed).map((threshold) => threshold.id),
  decision: strictGatePassed
    ? "Strict three-debate gate passed."
    : "Recovered diagnostic chain is internally valid, but the strict preregistered gate did not pass and cannot authorize the ten-debate or 195-debate rollout."
};

if (write) await writeFile(path.resolve(root, auditPath), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));
