import assert from "node:assert/strict";

// Explicit, recording-specific editor authority is distinct from the automatic
// 5% primary-speaker exception. Neither route silently grants the other.
export function validateEditorScopedSource({ authorization, sourceLock, inventory }) {
  const scope = authorization.identity.editorApprovedScope;
  if (scope?.protocolId === "editor-approved-moderator-context-v1") {
    return validateModeratorContextSource({ authorization, sourceLock, inventory });
  }
  assert.equal(scope?.protocolId, "editor-approved-moderator-exclusion-v1");
  assert.equal(scope.explicitDebateSpecificApproval, true);
  assert.equal(scope.videoId, authorization.identity.videoId);
  assert.equal(typeof scope.userApproval, "string");
  assert(scope.userApproval.trim());
  assert.deepEqual(sourceLock.participants.editorApprovedScope, scope);
  assert.deepEqual(inventory.editorApprovedScope, scope);
  assert.equal(scope.originalRecordingIsStrictlyDyadic, false);
  assert.equal(scope.automaticPrimarySpeakerExceptionClaimed, false);
  assert.equal(scope.readerDisclosureRequired, true);
  assert(scope.requiredReaderDisclosure.length >= 80);
  const window = scope.assessedWindow;
  assert(Number.isInteger(window.startMs) && Number.isInteger(window.endMs));
  assert(window.startMs >= 0 && window.endMs > window.startMs);
  assert.equal(window.durationMs, window.endMs - window.startMs);
  assert.deepEqual(inventory.assessedDebateWindowMs, {start: window.startMs, end: window.endMs});
  assert.equal(sourceLock.participants.pro, authorization.identity.pro.speaker);
  assert.equal(sourceLock.participants.con, authorization.identity.con.speaker);
  assert(scope.excludedIntervals.length > 0);
  let previousEnd = window.startMs;
  let excludedDurationMs = 0;
  const ids = new Set();
  for (const interval of scope.excludedIntervals) {
    assert(!ids.has(interval.intervalId));
    ids.add(interval.intervalId);
    assert(Number.isInteger(interval.startMs) && Number.isInteger(interval.endMs));
    assert(interval.startMs >= previousEnd && interval.endMs > interval.startMs);
    assert(interval.endMs <= window.endMs);
    assert.equal(interval.durationMs, interval.endMs - interval.startMs);
    assert(interval.reason.length >= 80);
    assert.equal(interval.dependentRepliesReviewed, true);
    assert.equal(interval.noCreditOrPenalty, true);
    previousEnd = interval.endMs;
    excludedDurationMs += interval.durationMs;
  }
  assert.equal(scope.excludedDurationMs, excludedDurationMs);
  assert.equal(scope.excludedShareOfAssessedWindow, excludedDurationMs / window.durationMs);
  for (const move of inventory.moves) {
    const span = move.sourceSpan;
    assert(span.startMs >= window.startMs && span.endMs <= window.endMs);
    for (const interval of scope.excludedIntervals) {
      assert(!(span.startMs < interval.endMs && span.endMs > interval.startMs),
        `${move.moveId}: evidence intersects editor-excluded ${interval.intervalId}`);
    }
  }
  return { status: "passed", excludedDurationMs, excludedShareOfAssessedWindow: scope.excludedShareOfAssessedWindow };
}

// This lane requires its own explicit recording-specific authority. It keeps
// primary-speaker answers eligible while assigning no host argument to a side.
export function validateModeratorContextSource({ authorization, sourceLock, inventory }) {
  const scope = authorization.identity.editorApprovedScope;
  assert.equal(scope?.protocolId, "editor-approved-moderator-context-v1");
  assert.equal(scope.explicitDebateSpecificApproval, true);
  assert.equal(scope.videoId, authorization.identity.videoId);
  assert.equal(typeof scope.userApproval, "string");
  assert(scope.userApproval.trim().length >= 40);
  assert.deepEqual(sourceLock.participants.editorApprovedScope, scope);
  assert.deepEqual(inventory.editorApprovedScope, scope);
  assert.equal(scope.originalRecordingIsStrictlyDyadic, false);
  assert.equal(scope.automaticPrimarySpeakerExceptionClaimed, false);
  assert.equal(scope.readerDisclosureRequired, true);
  assert(scope.requiredReaderDisclosure.length >= 160);
  assert.equal(scope.primaryRepliesRemainEligible, true);
  assert.equal(scope.moderatorArgumentsAssignableToPrimarySpeakers, false);
  assert.equal(scope.moderatorScored, false);
  const primary = [authorization.identity.pro.speaker, authorization.identity.con.speaker];
  assert.equal(new Set(primary).size, 2);
  assert.equal(sourceLock.participants.pro, primary[0]);
  assert.equal(sourceLock.participants.con, primary[1]);
  assert(Array.isArray(scope.contextOnlyParticipants) && scope.contextOnlyParticipants.length > 0);
  assert.equal(new Set(scope.contextOnlyParticipants).size, scope.contextOnlyParticipants.length);
  assert(scope.contextOnlyParticipants.every(name => typeof name === "string" && name.trim() && !primary.includes(name)));
  const window = scope.assessedWindow;
  assert(Number.isInteger(window.startMs) && Number.isInteger(window.endMs));
  assert(window.startMs >= 0 && window.endMs > window.startMs);
  assert.equal(window.durationMs, window.endMs - window.startMs);
  assert.deepEqual(inventory.assessedDebateWindowMs, {start: window.startMs, end: window.endMs});
  const audit = inventory.moderatorContextAudit;
  assert.equal(audit?.protocolId, scope.protocolId);
  assert.deepEqual(audit.contextOnlyParticipants, scope.contextOnlyParticipants);
  assert.equal(audit.primaryRepliesRemainEligible, true);
  assert.equal(audit.noModeratorMoveSelected, true);
  assert.equal(audit.allSelectedEvidenceOwnedByAssignedPrimarySpeaker, true);
  assert(typeof audit.questioningAsymmetryTreatment === "string" && audit.questioningAsymmetryTreatment.length >= 80);
  assert.deepEqual(audit.moves.map(move => move.moveId), inventory.moves.map(move => move.moveId));
  for (const [index, move] of inventory.moves.entries()) {
    assert.equal(move.speaker, authorization.identity[move.side].speaker);
    assert(move.sourceSpan.startMs >= window.startMs && move.sourceSpan.endMs <= window.endMs);
    const ownership = audit.moves[index];
    assert.equal(ownership.hostArgumentNotCredited, true);
    assert(typeof ownership.scoredClaimOwnership === "string" && ownership.scoredClaimOwnership.length >= 60);
    const prompt = ownership.moderatorPrompt;
    assert(prompt === null || (Number.isInteger(prompt?.startEvent) &&
      Number.isInteger(prompt.endEvent) && prompt.startEvent >= 0 &&
      prompt.endEvent >= prompt.startEvent && prompt.endEvent < move.sourceSpan.startEvent &&
      typeof prompt.summary === "string" && prompt.summary.length >= 40));
  }
  return {status: "passed", protocolId: scope.protocolId, primaryRepliesRemainEligible: true,
    contextOnlyParticipants: scope.contextOnlyParticipants, scoredPrimaryMoves: inventory.moves.length};
}
