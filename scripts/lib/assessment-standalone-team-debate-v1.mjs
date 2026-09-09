import assert from "node:assert/strict";
import { validateMultiSpeakerInventory } from "./assessment-production-multi-speaker-approximation-v1.mjs";

export const TEAM_PROFILE = "team-approximation-v1";
const sides = ["pro", "con"];
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;

// These are additional new-record gates, not changes to the frozen historical lane.
export function validateTeamSelection(inventory, authorization) {
  assert.equal(authorization.validationProfile, TEAM_PROFILE);
  assert.equal(inventory.debateNumber, authorization.identity.debateNumber);
  assert.equal(inventory.debateId, authorization.identity.debateId);
  assert.equal(inventory.motion, authorization.identity.motion);
  assert.equal(inventory.formatFitness.twoSidedFit, "clear");
  assert.equal(inventory.formatFitness.publicFormat, "debate");
  assert.equal(inventory.formatFitness.scorecardEligible, true);
  const byId = new Map(inventory.moves.map(move => [move.moveId, move]));
  assert.equal(byId.size, inventory.moves.length, "duplicate move ID");
  for (const side of sides) {
    assert.deepEqual(inventory.sides[side].speakers, authorization.identity[side].speakers);
  }
  const counts = Object.fromEntries(sides.map(side => [side, inventory.moves.filter(m => m.side === side).length]));
  assert.deepEqual(inventory.selectionBalanceAudit.totalBySide, counts);
  const sectionCounts = inventory.sections.map(section => ({
    sectionId: section.sectionId,
    ...Object.fromEntries(sides.map(side => [side, inventory.moves.filter(m => m.sectionId === section.sectionId && m.side === side).length]))
  }));
  assert.deepEqual(inventory.selectionBalanceAudit.sections, sectionCounts);
  for (const section of inventory.sections) {
    assert.match(section.sectionId, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const count = sectionCounts.find(c => c.sectionId === section.sectionId);
    assert(count.pro >= 1 && count.con >= 1 && count.pro <= 4 && count.con <= 4, "section exceeds team card capacity");
    if (count.pro === 4 || count.con === 4) {
      assert.equal(section.fourthRowAudit?.lockedBeforeJudgment, true);
      assert(nonempty(section.fourthRowAudit?.distinctContributionRationale));
      assert.deepEqual(section.fourthRowAudit.moveIds, inventory.moves.filter(m => m.sectionId === section.sectionId).map(m => m.moveId));
    }
  }
  if (Math.abs(counts.pro - counts.con) >= 3 || sectionCounts.some(c => Math.abs(c.pro - c.con) >= 2)) {
    assert(nonempty(inventory.selectionBalanceAudit.asymmetryRationale));
  }
  const window = inventory.sourceScope?.assessedWindow;
  assert(Number.isInteger(window?.startMs) && Number.isInteger(window?.endMs) && window.startMs >= 0 && window.endMs > window.startMs);
  assert(Array.isArray(inventory.sourceScope.excludedIntervals));
  for (const interval of inventory.sourceScope.excludedIntervals) {
    assert(Number.isInteger(interval.startMs) && Number.isInteger(interval.endMs) && interval.startMs >= 0 && interval.endMs > interval.startMs);
    assert(nonempty(interval.reason));
  }
  const groups = new Map();
  for (const move of inventory.moves) {
    assert(sides.includes(move.side) && inventory.sides[move.side].speakers.includes(move.speaker), "unknown team member");
    assert(move.sourceSpan.startMs >= window.startMs && move.sourceSpan.endMs <= window.endMs, "selected evidence outside assessed window");
    assert(!inventory.sourceScope.excludedIntervals.some(x => move.sourceSpan.startMs < x.endMs && move.sourceSpan.endMs > x.startMs), "selected evidence enters excluded interval");
    assert(nonempty(move.inferenceGroupId));
    assert(nonempty(move.incrementalContribution));
    const key = `${move.side}:${move.inferenceGroupId}`;
    const previous = groups.get(key);
    if (previous) {
      assert.equal(move.repeatedInferenceOnly, false, "repetition cannot earn a second score");
      assert.deepEqual(move.extendsMoveIds, [previous.moveId], "reused inference group needs an explicit prior contribution link");
      assert.notEqual(move.incrementalContribution, previous.incrementalContribution, "duplicate contribution");
    } else {
      assert.deepEqual(move.extendsMoveIds, []);
    }
    groups.set(key, move);
  }
  assert(Array.isArray(inventory.excludedRepetitions));
  for (const repetition of inventory.excludedRepetitions) {
    const kept = byId.get(repetition.retainedMoveId);
    assert(kept && inventory.sides[kept.side].speakers.includes(repetition.speaker), "repetition must map to its own team's move");
    assert(Number.isInteger(repetition.startMs) && Number.isInteger(repetition.endMs) && repetition.endMs > repetition.startMs);
    assert(nonempty(repetition.rationale));
  }
  return { status: "passed", totalBySide: counts, sections: sectionCounts, excludedRepetitions: inventory.excludedRepetitions.length };
}

export function validateStandaloneTeamInventory(inventory, events, authorization) {
  const base = validateMultiSpeakerInventory(inventory, events);
  return { ...base, teamSelection: validateTeamSelection(inventory, authorization) };
}
