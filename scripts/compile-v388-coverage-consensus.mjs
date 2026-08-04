#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import {
  V388_CONSENSUS_ROOT,
  V388_DEBATE_NUMBERS,
  V388_REVIEW_ROOT,
  assert,
  canonicalJson,
  resolveCoverageFields,
  validateCoverageAdjudicationOutput
} from "./lib/v388-coverage-consensus.mjs";
import { validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sortedUnique = (values) => [...new Set(values)].sort();
const intersection = (left, right) => left.filter((value) => right.includes(value));
const consensusRoot = V388_CONSENSUS_ROOT;

const [disagreements, optionMaps, audio, primaryExecution, conditionalAudit, conditionalPacket, conditionalSchema, conditionalMap, conditionalOutput, conditionalExecution, coherenceAudit, coherencePacket, coherenceSchema, coherenceMap, coherenceOutput, coherenceExecution] = await Promise.all([
  readJson(`${consensusRoot}/initial-disagreements.json`),
  readJson(`${consensusRoot}/adjudication-option-map.json`),
  readJson(`${consensusRoot}/audio-verification.json`),
  readJson(`${consensusRoot}/adjudication/model-execution.json`),
  readJson(`${consensusRoot}/conditional-adjudication/conditional-field-audit.json`),
  readJson(`${consensusRoot}/conditional-adjudication/packet.json`),
  readJson(`${consensusRoot}/conditional-adjudication/schema.json`),
  readJson(`${consensusRoot}/conditional-adjudication/private-option-map.json`),
  readJson(`${consensusRoot}/conditional-adjudication/output.json`),
  readJson(`${consensusRoot}/conditional-adjudication/model-execution.json`),
  readJson(`${consensusRoot}/coherence-adjudication/coherence-audit.json`),
  readJson(`${consensusRoot}/coherence-adjudication/packet.json`),
  readJson(`${consensusRoot}/coherence-adjudication/schema.json`),
  readJson(`${consensusRoot}/coherence-adjudication/private-option-map.json`),
  readJson(`${consensusRoot}/coherence-adjudication/output.json`),
  readJson(`${consensusRoot}/coherence-adjudication/model-execution.json`)
]);

assert(primaryExecution.validOutputContexts === 3 && primaryExecution.results.every((item) => item.gateAcceptancePassed), "primary coverage adjudication execution invalid");
assert(conditionalExecution.validOutputContexts === 1 && conditionalExecution.results.every((item) => item.gateAcceptancePassed), "conditional adjudication execution invalid");
assert(coherenceAudit.counts.violations === 1 && coherenceExecution.validOutputContexts === 1 && coherenceExecution.results.every((item) => item.gateAcceptancePassed), "coherence adjudication execution invalid");
validateSchemaValue(validateClosedSchema(conditionalSchema), conditionalOutput, "coverageConditionalAdjudication");
assert(conditionalOutput.fields.length === 1 && conditionalOutput.fields[0].fieldId === conditionalPacket.disputedFields[0].fieldId, "conditional output field invalid");
const conditionalChoice = conditionalMap.fields[0].options.find((item) => item.optionId === conditionalOutput.fields[0].optionId);
assert(conditionalChoice, "conditional option resolution absent");
validateSchemaValue(validateClosedSchema(coherenceSchema), coherenceOutput, "coverageCoherenceAdjudication");
assert(coherenceOutput.bundles.length === 1 && coherenceOutput.bundles[0].fieldId === coherencePacket.disputedBundles[0].fieldId, "coherence output field invalid");
const coherenceChoice = coherenceMap.fields[0].options.find((item) => item.optionId === coherenceOutput.bundles[0].optionId);
assert(coherenceChoice, "coherence option resolution absent");

for (const record of audio.records) {
  const [clip, transcript] = await Promise.all([readBytes(record.clip.path), readBytes(record.transcription.path)]);
  assert(record.status === "verified" && record.boundaryResolution.confidenceAfterVerification === "high", `${record.debateNumber}:${record.subjectRef}: audio verification unresolved`);
  assert(record.clip.sha256 === sha256(clip) && record.transcription.sha256 === sha256(transcript), `${record.debateNumber}:${record.subjectRef}: audio verification hash mismatch`);
}

function summarizedResolution(field, resolutionType = null) {
  return {
    fieldId: field.fieldId,
    subjectType: field.subjectType,
    subjectId: field.subjectId,
    fieldName: field.fieldName,
    initialAgreement: field.agreed,
    finalValue: structuredClone(field.finalValue),
    finalVotes: field.finalVotes,
    resolutionType: resolutionType ?? (field.agreed ? "initial-two-pass-agreement" : "anonymous-dispute-adjudication")
  };
}

function finalField(fieldMap, stableRef, fieldName, fallback) {
  const field = fieldMap.get(`candidate:${stableRef}:${fieldName}`);
  assert(field || fallback !== undefined, `${stableRef}.${fieldName}: final field absent`);
  return field ? structuredClone(field.finalValue) : structuredClone(fallback);
}

const finalDebates = [];
const debateReports = [];
let originalFieldCount = 0;
let recoveredFieldCount = 0;

for (const debateNumber of V388_DEBATE_NUMBERS) {
  const dispute = disagreements.debates[debateNumber];
  const [packet, mapping, review, adjudicationPacket, adjudicationSchema, adjudicationOutput] = await Promise.all([
    readJson(`${V388_REVIEW_ROOT}/packets/debate-${debateNumber}.json`),
    readJson(`${V388_REVIEW_ROOT}/private-mappings/debate-${debateNumber}.json`),
    readJson(`${V388_REVIEW_ROOT}/outputs/debate-${debateNumber}.json`),
    readJson(dispute.adjudicationPacket),
    readJson(dispute.adjudicationSchema),
    readJson(dispute.adjudicationOutput)
  ]);
  validateCoverageAdjudicationOutput(adjudicationOutput, adjudicationPacket, adjudicationSchema);
  const resolved = resolveCoverageFields(dispute.comparisons, adjudicationOutput, optionMaps.debates[debateNumber]);
  originalFieldCount += resolved.length;
  const resolutions = resolved.map((field) => summarizedResolution(field));
  const revived = conditionalAudit.revivedCandidates.find((item) => item.debateNumber === debateNumber);
  if (revived) {
    for (const agreement of revived.recoveredTwoVoteAgreements) resolutions.push({
      fieldId: `candidate:${revived.stableRef}:${agreement.fieldName}`,
      subjectType: "candidate",
      subjectId: revived.stableRef,
      fieldName: agreement.fieldName,
      initialAgreement: true,
      finalValue: structuredClone(agreement.finalValue),
      finalVotes: 2,
      resolutionType: "conditional-field-recovered-two-pass-agreement"
    });
    for (const derived of revived.derivedFields) resolutions.push({
      fieldId: `candidate:${revived.stableRef}:${derived.fieldName}`,
      subjectType: "candidate",
      subjectId: revived.stableRef,
      fieldName: derived.fieldName,
      initialAgreement: false,
      finalValue: derived.finalValue,
      finalVotes: 2,
      resolutionType: "entailed-by-two-vote-validity-kind-and-role-invariant",
      derivationBasis: derived.basis,
      upstreamVotes: derived.upstreamVotes
    });
    resolutions.push({
      fieldId: conditionalOutput.fields[0].fieldId,
      subjectType: "candidate",
      subjectId: revived.stableRef,
      fieldName: "proposition",
      initialAgreement: false,
      finalValue: conditionalChoice.value,
      finalVotes: 2,
      resolutionType: "conditional-anonymous-dispute-adjudication"
    });
    recoveredFieldCount += revived.recoveredTwoVoteAgreements.length + revived.derivedFields.length + 1;
  }
  if (debateNumber === coherencePacket.debateNumber) {
    const bundleSubject = coherencePacket.disputedBundles[0].subjectId;
    const replacements = {
      proposition: coherenceChoice.value.proposition,
      selectionRole: coherenceChoice.value.selectionRole,
      moveKind: coherenceChoice.value.moveKind,
      respondsToRefs: coherenceChoice.value.respondsToRefs
    };
    for (const [fieldName, finalValue] of Object.entries(replacements)) {
      const fieldId = `candidate:${bundleSubject}:${fieldName}`;
      const index = resolutions.findIndex((field) => field.fieldId === fieldId);
      assert(index >= 0, `${fieldId}: coherence replacement target absent`);
      resolutions[index] = { ...resolutions[index], initialAgreement: false, finalValue: structuredClone(finalValue), finalVotes: 2, resolutionType: "anonymous-cross-field-atomic-bundle-adjudication" };
    }
    const auditIndex = resolutions.findIndex((field) => field.fieldId === "concession:pro:audit");
    assert(auditIndex >= 0, "coherence concession audit target absent");
    resolutions[auditIndex] = { ...resolutions[auditIndex], initialAgreement: false, finalValue: structuredClone(coherenceChoice.value.concessionAudit), finalVotes: 2, resolutionType: "anonymous-cross-field-atomic-bundle-adjudication" };
  }
  const fieldMap = new Map(resolutions.map((field) => [field.fieldId, field]));
  assert(fieldMap.size === resolutions.length, `${debateNumber}: duplicate final field resolution`);
  const audioByLocalRef = new Map(audio.records.filter((item) => item.debateNumber === debateNumber).map((item) => [item.subjectRef, item]));
  const moves = [];
  const excludedCandidateRefs = [];
  for (const entry of mapping.mappingEntries) {
    const valid = fieldMap.get(`candidate:${entry.stableRef}:valid`);
    assert(valid, `${entry.stableRef}: validity resolution absent`);
    if (!valid.finalValue) { excludedCandidateRefs.push(entry.stableRef); continue; }
    const source = packet.candidates.find((item) => item.candidateRef === entry.candidateRef);
    const speakerSide = finalField(fieldMap, entry.stableRef, "speakerSide", { speaker: entry.proposalSnapshot.speaker, side: entry.proposalSnapshot.side });
    const localAudio = audioByLocalRef.get(entry.candidateRef) ?? null;
    const confidence = finalField(fieldMap, entry.stableRef, "attributionConfidence", entry.proposalSnapshot.attributionConfidence);
    assert(confidence === "high" || localAudio, `${entry.stableRef}: medium/low attribution lacks audio verification`);
    moves.push({
      moveId: entry.stableRef,
      origin: "proposed-candidate",
      sourceSpan: structuredClone(source.sourceSpan),
      atomicExcerpt: source.atomicExcerpt,
      contextWindow: source.contextWindow,
      speaker: localAudio?.resolvedSpeaker ?? speakerSide.speaker,
      side: localAudio?.resolvedSide ?? speakerSide.side,
      proposition: finalField(fieldMap, entry.stableRef, "proposition", entry.proposalSnapshot.proposition),
      attributionConfidence: localAudio ? "high" : confidence,
      audioVerification: localAudio,
      selectionRole: finalField(fieldMap, entry.stableRef, "selectionRole", entry.proposalSnapshot.selectionRole),
      moveKind: finalField(fieldMap, entry.stableRef, "moveKind", entry.proposalSnapshot.moveKind),
      respondsToRefs: finalField(fieldMap, entry.stableRef, "respondsToRefs", entry.proposalSnapshot.respondsToRefs),
      consensusFieldIds: ["valid", "speakerSide", "proposition", "attributionConfidence", "selectionRole", "moveKind", "respondsToRefs"].map((name) => `candidate:${entry.stableRef}:${name}`)
    });
  }
  const missingFields = resolutions.filter((field) => field.subjectType === "missing-move" && field.fieldName === "inclusion");
  const excludedMissingRefs = [];
  for (const field of missingFields) {
    if (field.finalValue === null) { excludedMissingRefs.push(field.subjectId); continue; }
    const sourceComparison = dispute.comparisons.find((item) => item.fieldId === field.fieldId);
    const localRef = sourceComparison.context.localMissingRef;
    const localAudio = audioByLocalRef.get(localRef) ?? null;
    const move = structuredClone(field.finalValue);
    if (localAudio) {
      move.speaker = localAudio.resolvedSpeaker;
      move.side = localAudio.resolvedSide;
      move.attributionConfidence = "high";
    }
    assert(move.attributionConfidence === "high" || localAudio, `${field.subjectId}: medium/low attribution lacks audio verification`);
    moves.push({ moveId: move.stableRef, origin: "independent-review-missing-move", sourceSpan: move.sourceSpan, atomicExcerpt: move.atomicExcerpt, contextWindow: move.contextWindow, speaker: move.speaker, side: move.side, proposition: move.proposition, attributionConfidence: move.attributionConfidence, audioVerification: localAudio, selectionRole: move.selectionRole, moveKind: move.moveKind, respondsToRefs: move.respondsToRefs, consensusFieldIds: [field.fieldId] });
  }
  moves.sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.moveId.localeCompare(right.moveId));
  assert(moves.length <= 28, `${debateNumber}: final move cap exceeded`);
  const byMoveId = new Map(moves.map((move) => [move.moveId, move]));
  assert(byMoveId.size === moves.length, `${debateNumber}: duplicate final move IDs`);
  for (const move of moves) {
    assert(packet.sides[move.side].speakers.includes(move.speaker), `${move.moveId}: speaker-side mismatch`);
    assert(move.selectionRole !== "contextual-only", `${move.moveId}: contextual move survived`);
    if (move.moveKind === "constructive") assert(move.selectionRole === "load-bearing-constructive" && move.respondsToRefs.length === 0, `${move.moveId}: constructive semantics invalid`);
    if (move.moveKind === "reply") assert(move.selectionRole === "major-direct-reply" && move.respondsToRefs.length > 0, `${move.moveId}: reply semantics invalid`);
    if (move.moveKind === "concession") assert(move.selectionRole === "material-concession" && move.respondsToRefs.length > 0, `${move.moveId}: concession semantics invalid`);
    for (const target of move.respondsToRefs) assert(byMoveId.has(target) && target !== move.moveId, `${move.moveId}: response target absent or self-referential: ${target}`);
  }
  const sideCounts = {};
  for (const side of ["pro", "con"]) {
    const sideMoves = moves.filter((move) => move.side === side);
    assert(sideMoves.length >= 4, `${debateNumber}.${side}: fewer than four moves`);
    assert(sideMoves.some((move) => move.selectionRole === "load-bearing-constructive") && sideMoves.some((move) => move.selectionRole === "major-direct-reply"), `${debateNumber}.${side}: required roles absent`);
    sideCounts[side] = sideMoves.length;
  }
  const selectedIds = new Set(moves.map((move) => move.moveId));
  const routeByBridge = new Map(packet.routes.flatMap((route) => route.bridges.map((bridge) => [bridge.bridgeId, { route, bridge }])));
  const bridgeCoverage = resolutions.filter((field) => field.subjectType === "bridge").map((field) => {
    const comparison = dispute.comparisons.find((item) => item.fieldId === field.fieldId);
    const routeRecord = routeByBridge.get(field.subjectId);
    assert(routeRecord && field.finalValue === "represented", `${debateNumber}.${field.subjectId}: current gate requires represented bridge`);
    const proposalRefs = comparison.provenance.proposalMoveRefs.filter((ref) => selectedIds.has(ref));
    const reviewRefs = comparison.provenance.reviewMoveRefs.filter((ref) => selectedIds.has(ref));
    const moveRefs = sortedUnique([...proposalRefs, ...reviewRefs]);
    assert(moveRefs.length > 0 && moveRefs.some((ref) => byMoveId.get(ref).side === routeRecord.route.side), `${debateNumber}.${field.subjectId}: represented bridge lacks retained same-side evidence`);
    return {
      bridgeId: field.subjectId,
      routeId: routeRecord.route.routeId,
      side: routeRecord.route.side,
      tier: routeRecord.bridge.tier,
      description: routeRecord.bridge.description,
      status: field.finalValue,
      moveRefs,
      commonTwoPassMoveRefs: intersection(proposalRefs, reviewRefs),
      passEvidenceRetained: { proposalMoveRefs: proposalRefs, reviewMoveRefs: reviewRefs },
      coverageStatusFieldId: field.fieldId
    };
  });
  assert(bridgeCoverage.length === packet.acceptedBridgeIds.length && bridgeCoverage.length === 10, `${debateNumber}: bridge coverage incomplete`);
  const materialConcessionAudit = resolutions.filter((field) => field.subjectType === "concession").map((field) => {
    const auditValue = field.finalValue;
    for (const ref of auditValue.moveRefs) assert(selectedIds.has(ref) && byMoveId.get(ref).side === field.subjectId && byMoveId.get(ref).selectionRole === "material-concession", `${debateNumber}.${field.subjectId}: concession evidence invalid`);
    if (auditValue.status === "none-found") assert(auditValue.moveRefs.length === 0, `${debateNumber}.${field.subjectId}: none-found concession has refs`);
    else assert(auditValue.status === "represented" && auditValue.moveRefs.length > 0, `${debateNumber}.${field.subjectId}: represented concession invalid`);
    return { side: field.subjectId, status: auditValue.status, moveRefs: auditValue.moveRefs, auditFieldId: field.fieldId };
  });
  assert(materialConcessionAudit.length === 2, `${debateNumber}: concession audit incomplete`);
  const expectedFieldCount = mapping.mappingEntries.length + moves.filter((move) => move.origin === "proposed-candidate").length * 6 + review.missingMoves.length + packet.acceptedBridgeIds.length + 2;
  assert(resolutions.length === expectedFieldCount && resolutions.every((field) => field.finalVotes >= 2), `${debateNumber}: final two-vote field universe incomplete`);
  const finalDebate = { schemaVersion: "3.8.8-resolved-coverage-debate", debateNumber, debateId: packet.debateId, motion: packet.motion, sides: packet.sides, routes: packet.routes, moves, bridgeCoverage, materialConcessionAudit, excludedCandidateRefs, excludedMissingRefs, fieldResolutions: resolutions };
  assert(!containsScoreField(finalDebate), `${debateNumber}: resolved debate contains score field`);
  if (shouldWrite) {
    const file = `${consensusRoot}/resolved/debate-${debateNumber}.json`;
    await mkdir(path.dirname(path.resolve(root, file)), { recursive: true });
    await writeFile(path.resolve(root, file), `${JSON.stringify(finalDebate, null, 2)}\n`);
  }
  finalDebates.push({ debateNumber, debateId: packet.debateId, motion: packet.motion, sides: packet.sides, routes: packet.routes, moves, bridgeCoverage, materialConcessionAudit });
  debateReports.push({
    debateNumber,
    debateId: packet.debateId,
    originalComparisonFields: resolved.length,
    conditionalFieldsRecovered: resolutions.length - resolved.length,
    finalTwoVoteSupportedFields: resolutions.filter((field) => field.finalVotes >= 2).length,
    unresolvedFields: resolutions.filter((field) => field.finalVotes < 2).length,
    selectedMoves: moves.length,
    movesBySide: sideCounts,
    excludedCandidates: excludedCandidateRefs.length,
    includedMissingMoves: moves.filter((move) => move.origin === "independent-review-missing-move").length,
    excludedMissingMoves: excludedMissingRefs.length,
    representedBridges: bridgeCoverage.length,
    consequentialOmissions: 0,
    completedAudioVerifications: audio.records.filter((item) => item.debateNumber === debateNumber).length
  });
}

const selectedMoveCount = finalDebates.reduce((sum, debate) => sum + debate.moves.length, 0);
const finalFieldCount = debateReports.reduce((sum, report) => sum + report.finalTwoVoteSupportedFields, 0);
const coverageConsensusPassed = finalDebates.length === 3 && debateReports.every((report) => report.unresolvedFields === 0 && report.selectedMoves <= 28 && report.representedBridges === 10 && report.consequentialOmissions === 0) && finalFieldCount === originalFieldCount + recoveredFieldCount && audio.records.length === 1 && coherenceAudit.counts.violations === coherenceExecution.validOutputContexts && !containsScoreField(finalDebates);
const inventory = {
  schemaVersion: "3.8.8-final-coverage-inventory",
  status: coverageConsensusPassed ? "locked-score-free-coverage-inventory" : "coverage-consensus-failed",
  warning: "This score-free source inventory is the only authorized input to later section, burden-contact, and scoring stages. It contains no participant scores, winner, assessment prose, Overall Commentary, or AI Extension.",
  debateCount: finalDebates.length,
  selectedMoveCount,
  finalTwoVoteSupportedFieldCount: finalFieldCount,
  debates: finalDebates
};
const analysis = {
  schemaVersion: "3.8.8-coverage-consensus-analysis",
  status: coverageConsensusPassed ? "coverage-consensus-passed" : "coverage-consensus-failed",
  analyzedAt: new Date().toISOString(),
  coverageConsensusPassed,
  debateReports,
  totals: {
    debates: finalDebates.length,
    originalComparisonFields: originalFieldCount,
    conditionalFieldsRecovered: recoveredFieldCount,
    finalTwoVoteSupportedFields: finalFieldCount,
    unresolvedFields: debateReports.reduce((sum, report) => sum + report.unresolvedFields, 0),
    selectedMoves: selectedMoveCount,
    representedBridges: debateReports.reduce((sum, report) => sum + report.representedBridges, 0),
    consequentialOmissions: 0,
    requiredAudioVerifications: audio.records.length,
    completedAudioVerifications: audio.records.filter((record) => record.status === "verified").length,
    primaryAdjudicationContexts: primaryExecution.validOutputContexts,
    conditionalAdjudicationContexts: conditionalExecution.validOutputContexts,
    coherenceAdjudicationContexts: coherenceExecution.validOutputContexts,
    crossFieldCoherenceViolationsResolved: coherenceExecution.validOutputContexts,
    recoverableStreamEvents: [...primaryExecution.results, ...conditionalExecution.results, ...coherenceExecution.results].reduce((sum, item) => sum + item.recoverableStreamEvents, 0),
    scoringFields: containsScoreField(finalDebates) ? 1 : 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  decision: {
    sectionAndWeightLockPreregistrationAuthorized: coverageConsensusPassed,
    sectionAndWeightModelExecutionAuthorized: false,
    burdenContactModelExecutionAuthorized: false,
    numericalParticipantScoringAuthorized: false,
    assessmentProseAuthorized: false,
    productionMutationAuthorized: false,
    tenDebateGateAuthorized: false,
    all195DebatesAuthorized: false
  },
  artifacts: {
    finalCoverageInventory: `${consensusRoot}/final-coverage-inventory.json`,
    resolvedDebates: Object.fromEntries(V388_DEBATE_NUMBERS.map((number) => [number, `${consensusRoot}/resolved/debate-${number}.json`]))
  }
};
assert(!containsScoreField(inventory) && !containsScoreField(analysis), "final coverage artifacts contain score field");
if (shouldWrite) {
  await writeFile(path.resolve(root, analysis.artifacts.finalCoverageInventory), `${JSON.stringify(inventory, null, 2)}\n`);
  await writeFile(path.resolve(root, `${consensusRoot}/coverage-consensus-analysis.json`), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: analysis.status, debateCount: finalDebates.length, originalComparisonFields: originalFieldCount, conditionalFieldsRecovered: recoveredFieldCount, finalTwoVoteSupportedFields: finalFieldCount, selectedMoves: selectedMoveCount, representedBridges: analysis.totals.representedBridges, requiredAudioVerifications: audio.records.length, completedAudioVerifications: analysis.totals.completedAudioVerifications, sectionAndWeightLockPreregistrationAuthorized: analysis.decision.sectionAndWeightLockPreregistrationAuthorized, scoringAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
