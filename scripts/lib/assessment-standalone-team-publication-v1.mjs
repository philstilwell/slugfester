import assert from "node:assert/strict";
import { MULTI_SPEAKER_RUBRIC } from "./assessment-production-multi-speaker-approximation-v1.mjs";
const sides = ["pro", "con"];
const time=ms=>{const seconds=Math.floor(ms/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
export function validateTeamCandidate(candidate, inventory, scores, diagnostics) {
  assert.equal(candidate.id, inventory.debateId);
  assert.equal(candidate.number, inventory.debateNumber);
  assert.equal(candidate.motion, inventory.motion);
  assert.equal(candidate.assessmentFormat, "team");
  assert.equal(candidate.assessmentRubric, MULTI_SPEAKER_RUBRIC);
  assert.equal(candidate.assessmentModel, "5.6 Sol");
  assert.equal(candidate.interlocutorRankingEligible, false);
  assert.deepEqual(candidate.teamDiagnostics, diagnostics);
  assert.equal(diagnostics.interlocutorRankingEligible, false);
  assert.equal(diagnostics.speakerContributionScoresPublishable, false);
  assert.equal(candidate.sections.length, inventory.sections.length);
  assert.equal(candidate.score.winner,scores.winner);
  const byId = new Map(inventory.moves.map(m=>[m.moveId,m]));
  const seen = new Set();
  for (const side of sides) {
    assert.deepEqual(candidate.sides[side].speakers, inventory.sides[side].speakers);
    assert.equal(candidate.sides[side].speaker, inventory.sides[side].speakers.join(" & "));
    assert.notEqual(candidate.sides[side].name, candidate.sides[side].speaker);
    assert.equal(candidate.score[side], scores.overall[side].score);
    assert.equal(candidate.overall[side].score, scores.overall[side].score);
    assert(candidate.overall[side].strengths.length>=3 && candidate.overall[side].blunders.length>=2);
  }
  candidate.sections.forEach((section,index)=>{
    const expected = scores.sections[index];
    assert.equal(section.sectionId, inventory.sections[index].sectionId);
    assert.equal(section.title, expected.title);
    const selected=inventory.moves.filter(m=>m.sectionId===section.sectionId);
    assert.equal(section.timebox,`${time(Math.min(...selected.map(m=>m.sourceSpan.startMs)))}–${time(Math.max(...selected.map(m=>m.sourceSpan.endMs)))}`);
    for(const side of sides) {
      assert.equal(section.score[side],expected.sides[side].score);
      const cards=section.exchanges.map(row=>row[side]).filter(Boolean);
      assert.deepEqual(cards.map(c=>c.ledgerMoveId),expected.sides[side].moves.map(m=>m.moveId));
      cards.forEach((card,i)=>{
        const move=byId.get(card.ledgerMoveId);
        assert(move && !seen.has(move.moveId));seen.add(move.moveId);
        assert.equal(card.speaker,move.speaker);
        assert.equal(card.time,time(move.sourceSpan.startMs));
        assert.equal(card.score,expected.sides[side].moves[i].score);
      });
    }
  });
  assert.equal(seen.size,inventory.moves.length);
  for(const side of sides) {
    const quote=candidate.quotes[side];
    assert(inventory.moves.some(m=>m.side===side && m.speaker===quote.speaker && m.quoteEligibleExactSpans.some(s=>s.includes(quote.text))),"representative quote must identify its actual speaker and exact source");
  }
  return {status:"passed",mappedMoves:seen.size};
}
