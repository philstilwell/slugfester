import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEditorScopedSource} from './lib/assessment-editor-scoped-source.mjs';

function fixture() {
  const scope = {
    protocolId: 'editor-approved-moderator-exclusion-v1',
    explicitDebateSpecificApproval: true,
    videoId: 'test-source',
    userApproval: 'Approve this recording-specific exclusion.',
    originalRecordingIsStrictlyDyadic: false,
    automaticPrimarySpeakerExceptionClaimed: false,
    readerDisclosureRequired: true,
    requiredReaderDisclosure: 'This scoped assessment excludes the moderator argument and all directly dependent replies; neither primary participant receives credit or penalty for them.',
    assessedWindow: {startMs: 100, endMs: 1100, durationMs: 1000},
    excludedIntervals: [{intervalId: 'host-branch', startMs: 400, endMs: 600, durationMs: 200,
      reason: 'The moderator introduces a separate substantive challenge; the entire challenge and both directly dependent participant replies are excluded together.',
      dependentRepliesReviewed: true, noCreditOrPenalty: true}],
    excludedDurationMs: 200, excludedShareOfAssessedWindow: 0.2
  };
  return {
    authorization: {identity: {videoId: 'test-source', pro: {speaker: 'A'}, con: {speaker: 'B'}, editorApprovedScope: scope}},
    sourceLock: {participants: {pro: 'A', con: 'B', editorApprovedScope: structuredClone(scope)}},
    inventory: {editorApprovedScope: structuredClone(scope), assessedDebateWindowMs: {start: 100, end: 1100},
      moves: [{moveId: 'before', sourceSpan: {startMs: 100, endMs: 400}}, {moveId: 'after', sourceSpan: {startMs: 600, endMs: 1100}}]}
  };
}

test('explicit editorial scope allows exact non-overlapping boundary moves', () => {
  assert.deepEqual(validateEditorScopedSource(fixture()), {status: 'passed', excludedDurationMs: 200, excludedShareOfAssessedWindow: 0.2});
});

for (const [name, change] of [
  ['missing explicit approval', x => {x.authorization.identity.editorApprovedScope.explicitDebateSpecificApproval = false;}],
  ['wrong recording identity', x => {x.authorization.identity.videoId = 'different';}],
  ['source scope drift', x => {x.sourceLock.participants.editorApprovedScope.excludedIntervals[0].endMs++;}],
  ['inventory scope drift', x => {x.inventory.editorApprovedScope.excludedDurationMs++;}],
  ['unapproved automatic exception claim', x => {x.authorization.identity.editorApprovedScope.automaticPrimarySpeakerExceptionClaimed = true;}],
  ['missing reader disclosure', x => {x.authorization.identity.editorApprovedScope.requiredReaderDisclosure = '';}],
  ['assessed window drift', x => {x.inventory.assessedDebateWindowMs.start--;}],
  ['wrong participant', x => {x.sourceLock.participants.pro = 'Host';}],
  ['move crossing excluded start', x => {x.inventory.moves[0].sourceSpan.endMs++;}],
  ['move crossing excluded end', x => {x.inventory.moves[1].sourceSpan.startMs--;}],
  ['move outside assessed start', x => {x.inventory.moves[0].sourceSpan.startMs--;}],
  ['move outside assessed end', x => {x.inventory.moves[1].sourceSpan.endMs++;}]
]) test(`rejects ${name}`, () => {const x = fixture(); change(x); assert.throws(() => validateEditorScopedSource(x));});

for (const [name, change] of [
  ['incorrect duration', s => {s.excludedDurationMs++;}],
  ['incorrect share', s => {s.excludedShareOfAssessedWindow = 0.05;}],
  ['overlapping exclusions', s => {s.excludedIntervals.push({...s.excludedIntervals[0], intervalId: 'second'});}],
  ['duplicate interval IDs', s => {s.excludedIntervals.push({...s.excludedIntervals[0], startMs: 600, endMs: 800});}],
  ['unreviewed dependent replies', s => {s.excludedIntervals[0].dependentRepliesReviewed = false;}],
  ['credit or penalty on excluded material', s => {s.excludedIntervals[0].noCreditOrPenalty = false;}]
]) test(`rejects internally matching but invalid scope: ${name}`, () => {
  const x = fixture(); change(x.authorization.identity.editorApprovedScope);
  x.sourceLock.participants.editorApprovedScope = structuredClone(x.authorization.identity.editorApprovedScope);
  x.inventory.editorApprovedScope = structuredClone(x.authorization.identity.editorApprovedScope);
  assert.throws(() => validateEditorScopedSource(x));
});
