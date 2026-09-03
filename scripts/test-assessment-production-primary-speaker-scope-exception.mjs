import assert from "node:assert/strict";

import {
  PRIMARY_SPEAKER_SCOPE_PROTOCOL_ID,
  validatePrimarySpeakerScopeException
} from "./lib/assessment-production-standalone-debate-v1.mjs";

const scope = {
  enabled: true,
  protocolId: PRIMARY_SPEAKER_SCOPE_PROTOCOL_ID,
  assessedWindow: { startMs: 1000, endMs: 101000, durationMs: 100000 },
  maximumHostAdvocacyShare: 0.05,
  primarySpeakers: { pro: "Primary Pro", con: "Primary Con" },
  nonPrimarySpeakers: [{ name: "Host", role: "host" }],
  excludedIntervals: [
    {
      intervalId: "host-1",
      kind: "host-advocacy",
      speaker: "Host",
      startMs: 10000,
      endMs: 13000,
      durationMs: 3000,
      summary: "The host advances an incidental premise already developed by the affirmative speaker.",
      burdenImpactRationale: "Removing this prompt leaves both primary speakers' central motion burdens independently stated.",
      uniqueLoadBearingArgument: false
    },
    {
      intervalId: "reply-1",
      kind: "dependent-response",
      speaker: "Primary Con",
      startMs: 13000,
      endMs: 15000,
      durationMs: 2000,
      summary: "The negative speaker answers only the host's excluded intervention during this interval.",
      burdenImpactRationale: "The directly dependent answer is removed so neither side gains or loses assessment credit.",
      uniqueLoadBearingArgument: false
    }
  ]
};

const audit = {
  ...structuredClone(scope),
  status: "complete-and-frozen-before-judgment",
  derivedDurations: {
    hostAdvocacyMs: 3000,
    dependentResponseMs: 2000,
    totalExcludedMs: 5000,
    hostAdvocacyShare: 0.03
  },
  allHostInterventionsEnumerated: true,
  noDistinctSideIntroduced: true,
  noUniqueLoadBearingArgumentIntroduced: true,
  noSelectedEvidenceIntersectsExclusions: true,
  neitherSideCreditedOrPenalized: true,
  readerDisclosureRequired: true
};

const makeFixture = () => ({
  authorization: {
    identity: {
      pro: { speaker: "Primary Pro" },
      con: { speaker: "Primary Con" },
      primarySpeakerScopeException: structuredClone(scope)
    }
  },
  sourceLock: {
    participants: {
      pro: "Primary Pro",
      con: "Primary Con",
      primarySpeakerScopeException: structuredClone(scope)
    }
  },
  inventory: {
    primarySpeakerScopeAudit: structuredClone(audit),
    moves: [
      { moveId: "pro-1", sourceSpan: { startMs: 2000, endMs: 9000 } },
      { moveId: "con-1", sourceSpan: { startMs: 16000, endMs: 22000 } }
    ]
  }
});

assert.equal(validatePrimarySpeakerScopeException(makeFixture()).status, "passed");

const overlappingFixture = makeFixture();
overlappingFixture.inventory.primarySpeakerScopeAudit.excludedIntervals[1].startMs = 12000;
overlappingFixture.inventory.primarySpeakerScopeAudit.excludedIntervals[1].endMs = 14000;
overlappingFixture.inventory.primarySpeakerScopeAudit.excludedIntervals[1].durationMs = 2000;
overlappingFixture.inventory.primarySpeakerScopeAudit.derivedDurations.totalExcludedMs = 4000;
overlappingFixture.authorization.identity.primarySpeakerScopeException.excludedIntervals =
  structuredClone(overlappingFixture.inventory.primarySpeakerScopeAudit.excludedIntervals);
overlappingFixture.sourceLock.participants.primarySpeakerScopeException.excludedIntervals =
  structuredClone(overlappingFixture.inventory.primarySpeakerScopeAudit.excludedIntervals);
assert.equal(
  validatePrimarySpeakerScopeException(overlappingFixture).status,
  "passed"
);

const expectFailure = (mutate, messagePattern) => {
  const fixture = makeFixture();
  mutate(fixture);
  assert.throws(
    () => validatePrimarySpeakerScopeException(fixture),
    messagePattern
  );
};

expectFailure((fixture) => {
  const interval = fixture.inventory.primarySpeakerScopeAudit.excludedIntervals[0];
  interval.endMs = 17000;
  interval.durationMs = 7000;
  const reply = fixture.inventory.primarySpeakerScopeAudit.excludedIntervals[1];
  reply.startMs = 17000;
  reply.endMs = 19000;
  reply.durationMs = 2000;
  fixture.inventory.primarySpeakerScopeAudit.derivedDurations.hostAdvocacyMs = 7000;
  fixture.inventory.primarySpeakerScopeAudit.derivedDurations.totalExcludedMs = 9000;
  fixture.inventory.primarySpeakerScopeAudit.derivedDurations.hostAdvocacyShare = 0.07;
  fixture.authorization.identity.primarySpeakerScopeException.excludedIntervals =
    structuredClone(fixture.inventory.primarySpeakerScopeAudit.excludedIntervals);
  fixture.sourceLock.participants.primarySpeakerScopeException.excludedIntervals =
    structuredClone(fixture.inventory.primarySpeakerScopeAudit.excludedIntervals);
}, /5% threshold/);

expectFailure((fixture) => {
  fixture.inventory.moves[0].sourceSpan = { startMs: 9000, endMs: 11000 };
}, /selected evidence intersects exclusions/);

expectFailure((fixture) => {
  fixture.sourceLock.participants.primarySpeakerScopeException.assessedWindow.endMs = 100000;
}, /boundaries differ/);

expectFailure((fixture) => {
  const interval = fixture.inventory.primarySpeakerScopeAudit.excludedIntervals[0];
  interval.uniqueLoadBearingArgument = true;
  fixture.authorization.identity.primarySpeakerScopeException.excludedIntervals[0].uniqueLoadBearingArgument = true;
  fixture.sourceLock.participants.primarySpeakerScopeException.excludedIntervals[0].uniqueLoadBearingArgument = true;
}, /invalid excluded interval/);

expectFailure((fixture) => {
  fixture.inventory.primarySpeakerScopeAudit.excludedIntervals[0].speaker = "Primary Pro";
  fixture.authorization.identity.primarySpeakerScopeException.excludedIntervals[0].speaker = "Primary Pro";
  fixture.sourceLock.participants.primarySpeakerScopeException.excludedIntervals[0].speaker = "Primary Pro";
}, /not attributed to a frozen non-primary participant/);

console.log("Primary-speaker scope exception fixtures passed.");
