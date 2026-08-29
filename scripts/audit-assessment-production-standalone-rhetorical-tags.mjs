import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import {
  getReferenceDefinition,
  referenceFromUrl
} from "../src/data/references.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(
  readFileSync(
    path.join(
      ROOT,
      "docs/assessment-production/standalone-debates-v1/registry.json"
    ),
    "utf8"
  )
);

const json = (relativePath) =>
  JSON.parse(readFileSync(path.join(ROOT, relativePath), "utf8"));
const bytes = (relativePath) => readFileSync(path.join(ROOT, relativePath));
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const verifyFileRecord = (record) => {
  const value = bytes(record.path);
  assert.equal(record.sha256, sha256(value), `${record.path}: SHA-256 changed`);
  assert.equal(record.bytes, value.length, `${record.path}: byte count changed`);
};

const wordCount = (value) =>
  String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const moves = (debate) =>
  debate.sections
    .flatMap((section) => section.exchanges)
    .flatMap((exchange) => [exchange.pro, exchange.con])
    .filter(Boolean);

const publicTag = (move, tag) => ({
  moveId: move.ledgerMoveId,
  label: tag.label,
  type: tag.type,
  url: tag.url,
  context: tag.context
});

const baselineDebates = debates.filter(
  (debate) => Number(debate.number) >= 171 && Number(debate.number) <= 195
);
const baselinePerDebate = baselineDebates.map((debate) => {
  const debateMoves = moves(debate);
  return {
    debateNumber: debate.number,
    moves: debateMoves.length,
    taggedArguments: debateMoves.filter((move) => move.tags.length > 0).length,
    tags: debateMoves.reduce((sum, move) => sum + move.tags.length, 0)
  };
});
const baselineTotals = baselinePerDebate.reduce(
  (totals, debate) => ({
    moves: totals.moves + debate.moves,
    taggedArguments: totals.taggedArguments + debate.taggedArguments,
    tags: totals.tags + debate.tags
  }),
  { moves: 0, taggedArguments: 0, tags: 0 }
);
const sortedTagCounts = baselinePerDebate
  .map((debate) => debate.tags)
  .sort((left, right) => left - right);
const expectedBaseline = {
  debateCount: baselineDebates.length,
  debateNumbers: baselineDebates.map((debate) => debate.number),
  moves: baselineTotals.moves,
  taggedArguments: baselineTotals.taggedArguments,
  tags: baselineTotals.tags,
  taggedArgumentRate: Number(
    (baselineTotals.taggedArguments / baselineTotals.moves).toFixed(3)
  ),
  perDebateTagMinimum: sortedTagCounts[0],
  perDebateTagMedian: sortedTagCounts[Math.floor(sortedTagCounts.length / 2)],
  perDebateTagMaximum: sortedTagCounts.at(-1),
  zeroTagDebates: baselinePerDebate
    .filter((debate) => debate.tags === 0)
    .map((debate) => debate.debateNumber)
};

for (const record of registry.debates) {
  assert.ok(
    record.rhetoricalTagReview,
    `Debate ${record.debateNumber}: missing rhetorical-tag review registry entry`
  );
  const publication = json(`${record.root}/publication/output.json`).candidate;
  const production = debates.find(
    (debate) =>
      debate.number === record.debateNumber && debate.id === record.debateId
  );
  assert.ok(production, `Debate ${record.debateNumber}: production record missing`);
  const audit = json(record.rhetoricalTagReview.auditPath);
  const execution = json(record.rhetoricalTagReview.executionPath);
  const publicationMoves = moves(publication);
  const productionMoves = moves(production);

  assert.equal(audit.status, "passed-rhetorical-tag-review");
  assert.equal(audit.debateNumber, record.debateNumber);
  assert.equal(audit.debateId, record.debateId);
  assert.equal(
    execution.status,
    "passed-two-blind-reviews-adjudication-and-final-definition-check"
  );
  assert.equal(execution.debateNumber, record.debateNumber);
  assert.equal(execution.model.label, "5.6 Sol");
  assert.equal(execution.model.slug, "gpt-5.6-sol");
  assert.equal(execution.model.reasoningEffort, "low");
  assert.equal(execution.audit.blindReviews, 2);
  assert.equal(execution.audit.retries, 0);
  assert.equal(execution.isolation.existingTagsUnavailable, true);
  assert.equal(execution.isolation.reviewerOutputsUnavailableToOtherReviewer, true);
  assert.equal(execution.isolation.scoresUnavailable, true);
  verifyFileRecord(execution.catalogSnapshot);
  verifyFileRecord(execution.sourcePacket);
  execution.contexts.forEach((context) => {
    if (context.input) verifyFileRecord(context.input);
    verifyFileRecord(context.output);
    assert.equal(context.attempts, 1);
    assert.equal(context.retries, 0);
  });
  assert.equal(audit.independentReview.executionPath, record.rhetoricalTagReview.executionPath);
  assert.equal(
    audit.independentReview.executionSha256,
    sha256(bytes(record.rhetoricalTagReview.executionPath))
  );
  assert.deepEqual(audit.baselineComparison, expectedBaseline);
  assert.deepEqual(
    audit.reviewedMoveIds,
    publicationMoves.map((move) => move.ledgerMoveId),
    `Debate ${record.debateNumber}: rhetorical-tag review is not move-complete`
  );
  assert.equal(new Set(audit.reviewedMoveIds).size, publicationMoves.length);
  const blindPacket = json(execution.sourcePacket.path);
  assert.deepEqual(
    blindPacket.moves.map((move) => move.moveId),
    audit.reviewedMoveIds,
    `Debate ${record.debateNumber}: blind-review packet is not move-complete`
  );
  blindPacket.moves.forEach((move) => {
    assert.equal("tags" in move, false);
    assert.equal("references" in move, false);
  });
  const blindReviews = execution.contexts
    .filter((context) => context.role.startsWith("blind-review-"))
    .map((context) => json(context.output.path));
  assert.equal(blindReviews.length, 2);
  blindReviews.forEach((review) =>
    assert.deepEqual(review.reviewedMoveIds, audit.reviewedMoveIds)
  );
  const candidateUnion = new Set(
    blindReviews.flatMap((review) =>
      review.candidateReviews.map(
        (candidate) =>
          `${candidate.moveId}\u0000${candidate.type}\u0000${candidate.label}`
      )
    )
  );
  const auditedCandidates = new Set(
    audit.candidateReviews.map(
      (candidate) =>
        `${candidate.moveId}\u0000${candidate.type}\u0000${candidate.label}`
    )
  );
  assert.equal(auditedCandidates.size, audit.candidateReviews.length);
  assert.deepEqual(
    [...auditedCandidates].sort(),
    [...candidateUnion].sort(),
    `Debate ${record.debateNumber}: final definition check omitted a blind-review candidate`
  );

  const publishedTags = publicationMoves.flatMap((move) =>
    move.tags.map((tag) => publicTag(move, tag))
  );
  const productionTags = productionMoves.flatMap((move) =>
    move.tags.map((tag) => publicTag(move, tag))
  );
  assert.deepEqual(productionTags, publishedTags);
  assert.deepEqual(
    audit.acceptedTags.map(({ rationale, ...tag }) => tag),
    publishedTags,
    `Debate ${record.debateNumber}: accepted audit tags differ from publication`
  );

  const reviewedCandidates = new Set();
  for (const review of audit.candidateReviews) {
    assert.equal(audit.reviewedMoveIds.includes(review.moveId), true);
    assert.equal(["accepted", "rejected"].includes(review.decision), true);
    assert.equal(wordCount(review.rationale) >= 12, true);
    const key = `${review.moveId}\u0000${review.type}\u0000${review.label}`;
    assert.equal(reviewedCandidates.has(key), false, `duplicate candidate ${key}`);
    reviewedCandidates.add(key);
    if (review.decision === "accepted") {
      assert.equal(
        publishedTags.some(
          (tag) =>
            tag.moveId === review.moveId &&
            tag.type === review.type &&
            tag.label === review.label
        ),
        true,
        `Debate ${record.debateNumber}: accepted candidate is not published`
      );
    }
  }

  for (const accepted of audit.acceptedTags) {
    assert.equal(wordCount(accepted.context) >= 8, true);
    assert.equal(wordCount(accepted.context) <= 35, true);
    assert.equal(wordCount(accepted.rationale) >= 12, true);
    const reference = referenceFromUrl(accepted.url);
    assert.ok(reference, `${accepted.moveId}: unrecognized reference URL`);
    assert.equal(reference.type, accepted.type);
    const definition = getReferenceDefinition(reference.type, reference.slug);
    assert.ok(definition, `${accepted.moveId}: unknown reference definition`);
    assert.equal(definition.label, accepted.label);
    assert.equal(definition.externalUrl, accepted.url);
    assert.equal(
      reviewedCandidates.has(
        `${accepted.moveId}\u0000${accepted.type}\u0000${accepted.label}`
      ),
      true,
      `${accepted.moveId}: accepted tag lacks a candidate review`
    );
  }

  assert.equal(audit.audit.judgmentChanges, 0);
  assert.equal(audit.audit.scoreChanges, 0);
  assert.equal(audit.audit.moveChanges, 0);
  assert.equal(audit.audit.acceptedTagCount, publishedTags.length);
  assert.equal(
    audit.audit.rejectedCandidateCount,
    audit.candidateReviews.filter((review) => review.decision === "rejected").length
  );

  console.log(
    `Standalone rhetorical-tag review passed: Debate ${record.debateNumber}; ` +
      `${publicationMoves.length} moves reviewed, ${publishedTags.length} tags accepted, ` +
      `${audit.audit.rejectedCandidateCount} plausible candidates rejected.`
  );
}
