import assert from "node:assert/strict";
import { validateEditorScopedSource } from "./lib/assessment-editor-scoped-source.mjs";

const scope = {
  protocolId: "editor-approved-moderator-context-v1",
  explicitDebateSpecificApproval: true,
  videoId: "fixture-video",
  userApproval: "The editor expressly approved this recording's moderator-context scope and primary-speaker replies.",
  originalRecordingIsStrictlyDyadic: false,
  automaticPrimarySpeakerExceptionClaimed: false,
  readerDisclosureRequired: true,
  requiredReaderDisclosure: "The moderator's independent challenges remain context and are not attributed to either primary participant. Only the primary participants are assessed, including their own answers. This recording-specific exception was explicitly approved.",
  primaryRepliesRemainEligible: true,
  moderatorArgumentsAssignableToPrimarySpeakers: false,
  moderatorScored: false,
  contextOnlyParticipants: ["Moderator"],
  assessedWindow: {startMs: 1000, endMs: 10000, durationMs: 9000}
};
const fixture = () => ({
  authorization: {identity: {videoId: "fixture-video", pro: {speaker: "Speaker A"}, con: {speaker: "Speaker B"}, editorApprovedScope: structuredClone(scope)}},
  sourceLock: {participants: {pro: "Speaker A", con: "Speaker B", editorApprovedScope: structuredClone(scope)}},
  inventory: {
    editorApprovedScope: structuredClone(scope),
    assessedDebateWindowMs: {start: 1000, end: 10000},
    moves: [{moveId: "primary-answer", side: "pro", speaker: "Speaker A", sourceSpan: {startEvent: 8, endEvent: 10, startMs: 4000, endMs: 7000}}],
    moderatorContextAudit: {
      protocolId: scope.protocolId, contextOnlyParticipants: ["Moderator"], primaryRepliesRemainEligible: true,
      noModeratorMoveSelected: true, allSelectedEvidenceOwnedByAssignedPrimarySpeaker: true,
      questioningAsymmetryTreatment: "The answer is selected for its own contribution to the motion; the other participant is not penalized for a question never directed to them.",
      moves: [{moveId: "primary-answer", hostArgumentNotCredited: true,
        scoredClaimOwnership: "Speaker A supplies the proposed justification in their answer; the moderator supplies only the challenge that elicits it.",
        moderatorPrompt: {startEvent: 5, endEvent: 7, summary: "The moderator challenges whether the proposed reason establishes the conclusion."}}]
    }
  }
});
assert.equal(validateEditorScopedSource(fixture()).primaryRepliesRemainEligible, true);
let rejected = 0;
const rejects = (label, mutate) => {
  const value = fixture(); mutate(value);
  assert.throws(() => validateEditorScopedSource(value), undefined, label);
  rejected++;
};
rejects("standing authority cannot replace explicit scope approval", x => x.authorization.identity.editorApprovedScope.explicitDebateSpecificApproval = false);
rejects("approval is bound to the supplied video", x => x.authorization.identity.videoId = "different-video");
rejects("source and inventory must share the exact scope", x => x.inventory.editorApprovedScope.primaryRepliesRemainEligible = false);
rejects("moderator cannot become a scored primary participant", x => x.inventory.moves[0].speaker = "Moderator");
rejects("host reasoning cannot be assigned to the primary side", x => x.inventory.moderatorContextAudit.moves[0].hostArgumentNotCredited = false);
rejects("every selected move needs an ownership review", x => x.inventory.moderatorContextAudit.moves = []);
rejects("question prompts must precede primary evidence", x => x.inventory.moderatorContextAudit.moves[0].moderatorPrompt.endEvent = 9);
rejects("primary evidence must remain inside the approved window", x => x.inventory.moves[0].sourceSpan.endMs = 10001);
rejects("unknown scope protocols cannot fall back to this exception", x => {
  for (const item of [x.authorization.identity.editorApprovedScope, x.sourceLock.participants.editorApprovedScope, x.inventory.editorApprovedScope]) item.protocolId = "unapproved-scope";
});
console.log(JSON.stringify({status: "passed", approvedPrimaryReplyAccepted: true, prohibitedCasesRejected: rejected}));
