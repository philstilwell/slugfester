import assert from "node:assert/strict";

// Explicit, recording-specific editor authority is distinct from the automatic
// 5% primary-speaker exception. Neither route silently grants the other.
export function validateEditorScopedSource({ authorization, sourceLock, inventory }) {
  const scope = authorization.identity.editorApprovedScope;
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
