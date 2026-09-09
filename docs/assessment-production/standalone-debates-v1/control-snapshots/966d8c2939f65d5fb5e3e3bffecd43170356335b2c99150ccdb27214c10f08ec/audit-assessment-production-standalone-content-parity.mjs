#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { debates } from "../src/data/debates.js";

const ROOT = process.cwd();
const REGISTRY_PATH =
  "docs/assessment-production/standalone-debates-v1/registry.json";
const registry = JSON.parse(
  readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8")
);
const rawArgs = process.argv.slice(2);
const debateFlag = rawArgs.indexOf("--debate");
const requestedNumber = debateFlag >= 0 ? rawArgs[debateFlag + 1] : null;
const printMode = rawArgs.includes("--print");
for (let index = 0; index < rawArgs.length; index += 1) {
  if (rawArgs[index] === "--debate") {
    assert.match(rawArgs[index + 1] ?? "", /^\d{2,}$/);
    index += 1;
    continue;
  }
  assert.equal(rawArgs[index], "--print", `unknown argument: ${rawArgs[index]}`);
}

const wordCount = (value) =>
  String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
const roundedMean = (values) =>
  Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  );
const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : Number(((ordered[middle - 1] + ordered[middle]) / 2).toFixed(1));
};
const publishedMoves = (debate) =>
  debate.sections.flatMap((section) =>
    section.exchanges.flatMap((exchange) =>
      ["pro", "con"].flatMap((side) =>
        exchange[side] ? [exchange[side]] : []
      )
    )
  );
const extensionSides = (debate) =>
  ["pro", "con"].map((side) => debate.logicalExtension?.[side]);

function boilerplateProfile(debate, ngramSize = 6, documentShare = 0.25) {
  const tokenized = publishedMoves(debate).map((move) =>
    move.critique
      .toLowerCase()
      .replace(/[^a-z0-9/]+/g, " ")
      .trim()
      .split(/\s+/)
  );
  const minimumDocuments = Math.max(
    3,
    Math.ceil(tokenized.length * documentShare)
  );
  const documentCounts = new Map();
  for (const tokens of tokenized) {
    const seen = new Set();
    for (let index = 0; index <= tokens.length - ngramSize; index += 1) {
      seen.add(tokens.slice(index, index + ngramSize).join(" "));
    }
    for (const value of seen) {
      documentCounts.set(value, (documentCounts.get(value) ?? 0) + 1);
    }
  }
  const common = new Set(
    [...documentCounts]
      .filter(([, count]) => count >= minimumDocuments)
      .map(([value]) => value)
  );
  const ratios = tokenized.map((tokens) => {
    const covered = new Set();
    for (let index = 0; index <= tokens.length - ngramSize; index += 1) {
      if (!common.has(tokens.slice(index, index + ngramSize).join(" "))) {
        continue;
      }
      for (let offset = 0; offset < ngramSize; offset += 1) {
        covered.add(index + offset);
      }
    }
    return covered.size / tokens.length;
  });
  return {
    ngramSize,
    minimumDocuments,
    commonNgrams: common.size,
    meanCoveredRatio: Number(
      (ratios.reduce((sum, value) => sum + value, 0) / ratios.length).toFixed(3)
    ),
    maximumCoveredRatio: Number(Math.max(...ratios).toFixed(3))
  };
}

function contentMetrics(debate) {
  const moves = publishedMoves(debate);
  const extensions = extensionSides(debate);
  return {
    summaryWords: wordCount(debate.summary),
    motionWords: wordCount(debate.motion),
    sections: debate.sections.length,
    rows: debate.sections.reduce(
      (sum, section) => sum + section.exchanges.length,
      0
    ),
    moves: moves.length,
    argumentWordsMean: roundedMean(moves.map((move) => wordCount(move.words))),
    critiqueWordsMean: roundedMean(
      moves.map((move) => wordCount(move.critique))
    ),
    critiqueCharactersMean: roundedMean(
      moves.map((move) => move.critique.length)
    ),
    quoteWordsMean: roundedMean(
      ["pro", "con"].map((side) => wordCount(debate.quotes[side].text))
    ),
    quoteContextWordsMean: roundedMean(
      ["pro", "con"].map((side) => wordCount(debate.quotes[side].context))
    ),
    strengthWordsMean: roundedMean(
      ["pro", "con"].flatMap((side) =>
        debate.overall[side].strengths.map(wordCount)
      )
    ),
    blunderWordsMean: roundedMean(
      ["pro", "con"].flatMap((side) =>
        debate.overall[side].blunders.map((item) => wordCount(item.text))
      )
    ),
    extensionThesisWordsMean: roundedMean(
      extensions.map((extension) => wordCount(extension.finalArgument.thesis))
    ),
    extensionPremiseWordsMean: roundedMean(
      extensions.flatMap((extension) =>
        extension.finalArgument.premises.map(wordCount)
      )
    ),
    extensionConclusionWordsMean: roundedMean(
      extensions.map((extension) =>
        wordCount(extension.finalArgument.conclusion)
      )
    ),
    extensionNewArgumentWordsMean: roundedMean(
      extensions.flatMap((extension) =>
        extension.newArguments.map((item) => wordCount(item.text))
      )
    ),
    boilerplate: boilerplateProfile(debate)
  };
}

function referenceRanges(referenceDebates) {
  const profiles = referenceDebates.map(contentMetrics);
  return Object.fromEntries(
    Object.keys(profiles[0])
      .filter((key) => key !== "boilerplate")
      .map((key) => {
        const values = profiles.map((profile) => profile[key]);
        return [
          key,
          {
            minimum: Math.min(...values),
            median: median(values),
            maximum: Math.max(...values)
          }
        ];
      })
  );
}

function validateHardContract(debate, ranges) {
  const labels = [
    "Strongest feature:",
    "Principal limitation:",
    "Live burden:",
    "Locked score:"
  ];
  const moves = publishedMoves(debate);
  const argumentWordCounts = moves.map((move) => wordCount(move.words));
  const argumentWordsMean = roundedMean(argumentWordCounts);
  const minimumMean = Number(
    Math.max(20, ranges.argumentWordsMean.median - 1).toFixed(1)
  );
  const shortCardThresholdWords = 20;
  const shortCardCount = argumentWordCounts.filter(
    (count) => count < shortCardThresholdWords
  ).length;
  const shortCardShare = Number((shortCardCount / moves.length).toFixed(3));
  assert.ok(wordCount(debate.summary) >= 8 && wordCount(debate.summary) <= 35);
  assert.ok(debate.sections.length >= 4 && debate.sections.length <= 7);
  for (const move of moves) {
    assert.ok(wordCount(move.words) >= 8 && wordCount(move.words) <= 55);
    assert.ok(
      wordCount(move.critique) >= 105 && wordCount(move.critique) <= 130
    );
    assert.ok(move.critique.length >= 880);
    const parts = move.critique
      .split(/(?=Principal limitation:|Live burden:|Locked score:)/)
      .map((part) => part.trim());
    assert.equal(parts.length, 4);
    assert.ok(
      parts.every(
        (part, index) =>
          part.startsWith(labels[index]) && /[.!?]$/.test(part)
      )
    );
    assert.equal((move.critique.match(/[.!?](?=\s|$)/g) ?? []).length, 4);
    assert.equal(/[\u3400-\u9fff\uac00-\ud7af\ufffd]/u.test(move.critique), false);
  }
  assert.ok(
    argumentWordsMean >= minimumMean,
    `argument-card descriptions average ${argumentWordsMean} words; ` +
      `the independent benchmark requires at least ${minimumMean}`
  );
  assert.ok(
    shortCardShare <= 0.25,
    `${shortCardCount} of ${moves.length} argument-card descriptions are under ` +
      `${shortCardThresholdWords} words; at most one quarter may remain that short`
  );
  for (const side of ["pro", "con"]) {
    assert.ok(wordCount(debate.quotes[side].text) >= 3);
    assert.ok(wordCount(debate.quotes[side].text) <= 18);
    assert.ok(wordCount(debate.quotes[side].context) >= 12);
    assert.ok(wordCount(debate.quotes[side].context) <= 55);
    assert.ok(debate.overall[side].strengths.length >= 3);
    assert.ok(debate.overall[side].blunders.length >= 2);
    const extension = debate.logicalExtension[side];
    assert.ok(wordCount(extension.finalArgument.thesis) >= 12);
    assert.ok(extension.finalArgument.premises.length >= 4);
    assert.ok(extension.finalArgument.premises.length <= 6);
    assert.ok(
      extension.finalArgument.premises.every(
        (premise) => wordCount(premise) >= 12
      )
    );
    assert.ok(wordCount(extension.finalArgument.conclusion) >= 15);
    assert.ok(extension.newArguments.length >= 2);
    assert.ok(extension.newArguments.length <= 4);
    assert.ok(
      extension.newArguments.every(
        (item) => wordCount(item.text) >= 45 && wordCount(item.text) <= 130
      )
    );
  }
  const boilerplate = boilerplateProfile(debate);
  assert.ok(boilerplate.meanCoveredRatio <= 0.15);
  assert.ok(boilerplate.maximumCoveredRatio <= 0.25);
  return {
    status: "passed",
    summaryAndSectionLengths: true,
    argumentAndCritiqueLengths: true,
    argumentDescriptionDepth: {
      targetWords: [22, 28],
      actualMean: argumentWordsMean,
      independentReferenceMeanMedian: ranges.argumentWordsMean.median,
      minimumMean,
      shortCardThresholdWords,
      shortCardCount,
      shortCardShare,
      maximumShortCardShare: 0.25,
      status: "passed"
    },
    critiqueStructureAndCharacters: true,
    quotationLengths: true,
    overallCommentaryDepth: true,
    aiExtensionDepth: true,
    boilerplateGate: true
  };
}

const standaloneNumbers = new Set(
  registry.debates.map((record) => Number(record.debateNumber))
);
const selectedRecords = registry.debates.filter(
  (record) =>
    record.status === "published-and-frozen" &&
    (!requestedNumber || record.debateNumber === requestedNumber)
);
assert.ok(selectedRecords.length > 0, "no matching published standalone debates");

for (const record of selectedRecords) {
  const debate = debates.find((item) => item.number === record.debateNumber);
  assert.ok(debate, `Debate ${record.debateNumber}: production record missing`);
  const referenceDebates = debates
    .filter(
      (item) =>
        Number(item.number) < Number(record.debateNumber) &&
        !standaloneNumbers.has(Number(item.number))
    )
    .slice(-25);
  assert.equal(referenceDebates.length, 25);
  const metrics = contentMetrics(debate);
  const ranges = referenceRanges(referenceDebates);
  const expectedOutliers = Object.entries(ranges).flatMap(([metric, range]) => {
    const value = metrics[metric];
    if (value < range.minimum) {
      return [{ metric, direction: "below", value, ...range }];
    }
    if (value > range.maximum) {
      return [{ metric, direction: "above", value, ...range }];
    }
    return [];
  });
  const hardContract = validateHardContract(debate, ranges);
  const template = {
    schemaVersion: "1.0-standalone-content-parity-audit",
    status: "passed-content-parity-audit",
    debateNumber: record.debateNumber,
    debateId: record.debateId,
    referenceWindow: {
      count: referenceDebates.length,
      debateNumbers: referenceDebates.map((item) => item.number)
    },
    metrics,
    referenceRanges: ranges,
    relativeOutliers: expectedOutliers.map((outlier) => ({
      ...outlier,
      rationale: ""
    })),
    hardContract,
    audit: {
      judgmentChanges: 0,
      scoreChanges: 0,
      moveChanges: 0,
      tagChanges: 0
    }
  };
  if (printMode) {
    process.stdout.write(`${JSON.stringify(template, null, 2)}\n`);
    continue;
  }
  const auditPath = path.join(
    ROOT,
    record.root,
    "publication/content-parity-audit.json"
  );
  const stored = JSON.parse(readFileSync(auditPath, "utf8"));
  assert.equal(stored.schemaVersion, template.schemaVersion);
  assert.equal(stored.status, template.status);
  assert.equal(stored.debateNumber, template.debateNumber);
  assert.equal(stored.debateId, template.debateId);
  assert.deepEqual(stored.referenceWindow, template.referenceWindow);
  assert.deepEqual(stored.metrics, template.metrics);
  assert.deepEqual(stored.referenceRanges, template.referenceRanges);
  assert.equal(stored.relativeOutliers.length, expectedOutliers.length);
  stored.relativeOutliers.forEach((outlier, index) => {
    const { rationale, ...observed } = outlier;
    assert.deepEqual(observed, expectedOutliers[index]);
    assert.ok(
      wordCount(rationale) >= 12,
      `${outlier.metric}: outlier rationale must contain at least 12 words`
    );
  });
  assert.deepEqual(stored.hardContract, hardContract);
  assert.deepEqual(stored.audit, template.audit);
  console.log(
    `Standalone content parity passed: Debate ${record.debateNumber} against Debates ${referenceDebates[0].number}-${referenceDebates.at(-1).number}; ${metrics.moves} moves, ${metrics.sections} sections, ${expectedOutliers.length} justified relative outlier${expectedOutliers.length === 1 ? "" : "s"}.`
  );
}
