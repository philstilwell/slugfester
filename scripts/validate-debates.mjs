import { debates } from "../src/data/debates.js";
import { getReferenceDefinition, referenceFromUrl } from "../src/data/references.js";
import { existsSync, readFileSync } from "node:fs";

const errors = [];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const debateNumberPattern = /^\d{2,}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const youtubePattern = /^https:\/\/(www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]+/;
const legacyAssessmentModel = "GPT 5.5 Extra High";
const currentAssessmentModel = "5.6 Terra Extra High";
const reassessmentRubric = "Slugfester Reassessment Rubric v2";
const terraAssessmentFirstDebate = 131;
const explicitTopicCategoryFirstDebate = 190;
const topicCategoryIds = new Set([
  "cosmological-arguments",
  "science-design",
  "scripture-jesus-resurrection",
  "meaning-purpose",
  "morality-ethics",
  "evil-suffering-hiddenness",
  "mind-consciousness-free-will",
  "logic-reason-presuppositions",
  "religion-society-public-reason",
  "god-theism-atheism",
  "broader-debate-questions"
]);

function pathLabel(parts) {
  return parts.join(".");
}

function addError(path, message) {
  errors.push(`${pathLabel(path)}: ${message}`);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function requireString(object, key, path, options = {}) {
  const value = object?.[key];
  if (typeof value !== "string" || !value.trim()) {
    addError([...path, key], "must be a non-empty string");
    return "";
  }

  if (options.pattern && !options.pattern.test(value)) {
    addError([...path, key], options.patternMessage || "has an invalid format");
  }

  if (options.minWords && wordCount(value) < options.minWords) {
    addError([...path, key], `must contain at least ${options.minWords} words`);
  }

  if (options.maxWords && wordCount(value) > options.maxWords) {
    addError([...path, key], `must contain no more than ${options.maxWords} words`);
  }

  return value;
}

function requireScore(object, key, path) {
  const value = object?.[key];
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    addError([...path, key], "must be an integer from 0 to 100");
  }
}

function requireArray(object, key, path, options = {}) {
  const value = object?.[key];
  if (!Array.isArray(value)) {
    addError([...path, key], "must be an array");
    return [];
  }

  if (options.minLength && value.length < options.minLength) {
    addError([...path, key], `must contain at least ${options.minLength} items`);
  }

  if (options.maxLength && value.length > options.maxLength) {
    addError([...path, key], `must contain no more than ${options.maxLength} items`);
  }

  return value;
}

function roundedWeightedScore(values) {
  return Math.round(values.reduce((total, [value, weight]) => total + value * weight, 0));
}

function validateReassessmentLedger(debate, path) {
  const ledgerUrl = new URL(
    `../docs/assessment-ledgers/${encodeURIComponent(debate.id)}.json`,
    import.meta.url
  );

  if (!existsSync(ledgerUrl)) {
    addError([...path, "assessmentRubric"], "requires a matching JSON assessment ledger");
    return;
  }

  let ledger;
  try {
    ledger = JSON.parse(readFileSync(ledgerUrl, "utf8"));
  } catch (error) {
    addError([...path, "assessmentRubric"], `ledger is not valid JSON: ${error.message}`);
    return;
  }

  if (ledger.debateId !== debate.id) {
    addError([...path, "assessmentRubric"], "ledger debateId must match the debate id");
  }
  if (ledger.model !== debate.assessmentModel) {
    addError([...path, "assessmentModel"], "must match the saved assessment ledger model");
  }
  if (ledger.rubric !== reassessmentRubric) {
    addError([...path, "assessmentRubric"], `ledger rubric must be ${reassessmentRubric}`);
  }

  const dimensions = [
    ["logicalCoherence", 0.25],
    ["evidenceWarrant", 0.2],
    ["responsiveness", 0.2],
    ["relevanceBurden", 0.15],
    ["precisionClarity", 0.1],
    ["calibrationCharity", 0.1]
  ];
  const centralityTotals = { pro: 0, con: 0 };
  let totalCentrality = 0;

  if (!Array.isArray(ledger.sections) || ledger.sections.length !== debate.sections?.length) {
    addError([...path, "sections"], "must have the same section count as the assessment ledger");
    return;
  }

  ledger.sections.forEach((ledgerSection, sectionIndex) => {
    const section = debate.sections[sectionIndex];
    const sectionPath = [...path, "sections", String(sectionIndex)];
    if (ledgerSection.title !== section?.title) {
      addError([...sectionPath, "title"], "must match the assessment ledger section title and order");
    }
    if (![1, 2, 3].includes(ledgerSection.centrality)) {
      addError([...sectionPath, "centrality"], "ledger centrality must be 1, 2, or 3");
      return;
    }
    totalCentrality += ledgerSection.centrality;

    ["pro", "con"].forEach((sideKey) => {
      const ledgerSide = ledgerSection.sides?.[sideKey];
      const sidePath = [...sectionPath, sideKey];
      const publishedMoves = section?.exchanges?.map((exchange) => exchange?.[sideKey]) || [];
      if (!ledgerSide || !Array.isArray(ledgerSide.moves)) {
        addError(sidePath, "must exist in the assessment ledger with a moves array");
        return;
      }
      if (ledgerSide.moves.length !== publishedMoves.length) {
        addError(sidePath, "must have the same move count as the assessment ledger");
        return;
      }

      const moveScores = ledgerSide.moves.map((move, moveIndex) => {
        const movePath = [...sidePath, "moves", String(moveIndex)];
        const computed = roundedWeightedScore(
          dimensions.map(([key, weight]) => {
            const value = move.dimensions?.[key];
            if (!Number.isInteger(value) || value < 0 || value > 100) {
              addError([...movePath, "dimensions", key], "must be an integer from 0 to 100");
              return [0, weight];
            }
            return [value, weight];
          })
        );
        if (move.score !== computed || publishedMoves[moveIndex]?.score !== computed) {
          addError([...movePath, "score"], `computed score ${computed} must match ledger and debate`);
        }
        return computed;
      });

      ["coverage", "burdenProgress", "coherence"].forEach((key) => {
        if (!Number.isInteger(ledgerSide[key]) || ledgerSide[key] < 0 || ledgerSide[key] > 100) {
          addError([...sidePath, key], "must be an integer from 0 to 100");
        }
      });
      const moveMean = moveScores.reduce((total, score) => total + score, 0) / moveScores.length;
      const computedSectionScore = roundedWeightedScore([
        [moveMean, 0.7],
        [ledgerSide.coverage, 0.1],
        [ledgerSide.burdenProgress, 0.1],
        [ledgerSide.coherence, 0.1]
      ]);
      if (ledgerSide.score !== computedSectionScore || section?.score?.[sideKey] !== computedSectionScore) {
        addError([...sidePath, "score"], `computed section score ${computedSectionScore} must match ledger and debate`);
      }
      centralityTotals[sideKey] += computedSectionScore * ledgerSection.centrality;
    });
  });

  ["pro", "con"].forEach((sideKey) => {
    const ledgerOverall = ledger.overall?.[sideKey];
    const overallPath = [...path, "overall", sideKey];
    if (!ledgerOverall) {
      addError(overallPath, "must exist in the assessment ledger");
      return;
    }
    ["caseCompletion", "rebuttalResilience", "globalCalibration"].forEach((key) => {
      if (!Number.isInteger(ledgerOverall[key]) || ledgerOverall[key] < 0 || ledgerOverall[key] > 100) {
        addError([...overallPath, key], "must be an integer from 0 to 100");
      }
    });
    const weightedSectionMean = centralityTotals[sideKey] / totalCentrality;
    const computedOverall = roundedWeightedScore([
      [weightedSectionMean, 0.7],
      [ledgerOverall.caseCompletion, 0.12],
      [ledgerOverall.rebuttalResilience, 0.1],
      [ledgerOverall.globalCalibration, 0.08]
    ]);
    if (
      ledgerOverall.score !== computedOverall ||
      debate.overall?.[sideKey]?.score !== computedOverall ||
      debate.score?.[sideKey] !== computedOverall
    ) {
      addError([...overallPath, "score"], `computed overall score ${computedOverall} must match ledger and debate`);
    }
  });
}

function validateTag(tag, path) {
  if (!isPlainObject(tag)) {
    addError(path, "must be an object");
    return;
  }

  requireString(tag, "label", path);
  const type = requireString(tag, "type", path);
  const url = requireString(tag, "url", path);
  requireString(tag, "context", path, { minWords: 8, maxWords: 35 });

  if (!["fallacy", "bias"].includes(type)) {
    addError([...path, "type"], "must be either fallacy or bias");
  }

  if (type === "fallacy" && !url.startsWith("https://logfall.com/fallacies/")) {
    addError([...path, "url"], "fallacy tags must link to LogFall fallacy pages");
  }

  if (type === "bias" && !url.startsWith("https://cogbias.site/biases/")) {
    addError([...path, "url"], "bias tags must link to CogBias bias pages");
  }

  const reference = referenceFromUrl(url);
  if (!reference || reference.type !== type) {
    addError([...path, "url"], "must resolve to a matching local reference page");
  } else if (!getReferenceDefinition(reference.type, reference.slug)) {
    addError([...path, "url"], "must have a local reference definition");
  }
}

function validateArgument(argument, path) {
  if (!isPlainObject(argument)) {
    addError(path, "must be an object");
    return;
  }

  requireString(argument, "time", path);
  requireString(argument, "role", path, { maxWords: 5 });
  requireString(argument, "words", path, { minWords: 8, maxWords: 55 });
  requireScore(argument, "score", path);

  const critique = requireString(argument, "critique", path);
  const critiqueWords = wordCount(critique);
  if (critiqueWords < 105 || critiqueWords > 130) {
    addError([...path, "critique"], `should be 105-130 words; found ${critiqueWords}`);
  }

  requireArray(argument, "tags", path).forEach((tag, index) => {
    validateTag(tag, [...path, "tags", String(index)]);
  });
}

function validateQuote(quote, path) {
  if (!isPlainObject(quote)) {
    addError(path, "must be an object");
    return;
  }

  requireString(quote, "text", path, { minWords: 3, maxWords: 18 });
  requireString(quote, "context", path, { minWords: 12, maxWords: 55 });
}

function validateSide(side, path) {
  if (!isPlainObject(side)) {
    addError(path, "must be an object");
    return;
  }

  requireString(side, "name", path);
  requireString(side, "speaker", path);
}

function validateOverall(overall, path) {
  if (!isPlainObject(overall)) {
    addError(path, "must be an object");
    return;
  }

  requireScore(overall, "score", path);
  requireArray(overall, "strengths", path, { minLength: 2 }).forEach((strength, index) => {
    if (typeof strength !== "string" || !strength.trim()) {
      addError([...path, "strengths", String(index)], "must be a non-empty string");
    }
  });

  requireArray(overall, "blunders", path, { minLength: 1 }).forEach((blunder, index) => {
    const blunderPath = [...path, "blunders", String(index)];
    if (!isPlainObject(blunder)) {
      addError(blunderPath, "must be an object");
      return;
    }

    requireString(blunder, "text", blunderPath, { minWords: 8 });
    requireArray(blunder, "links", blunderPath, { minLength: 1 }).forEach((link, linkIndex) => {
      const linkPath = [...blunderPath, "links", String(linkIndex)];
      if (!isPlainObject(link)) {
        addError(linkPath, "must be an object");
        return;
      }

      requireString(link, "label", linkPath);
      const url = requireString(link, "url", linkPath);
      if (!url.startsWith("https://logfall.com/") && !url.startsWith("https://cogbias.site/")) {
        addError([...linkPath, "url"], "must link to LogFall or CogBias");
      }

      const reference = referenceFromUrl(url);
      if (!reference || !getReferenceDefinition(reference.type, reference.slug)) {
        addError([...linkPath, "url"], "must have a local reference definition");
      }
    });
  });
}

function validateLogicalExtensionSide(extension, path) {
  if (!isPlainObject(extension)) {
    addError(path, "must be an object");
    return;
  }

  const finalArgument = extension.finalArgument;
  const finalArgumentPath = [...path, "finalArgument"];
  if (!isPlainObject(finalArgument)) {
    addError(finalArgumentPath, "must be an object");
  } else {
    requireString(finalArgument, "thesis", finalArgumentPath, { minWords: 12 });
    requireArray(finalArgument, "premises", finalArgumentPath, {
      minLength: 4,
      maxLength: 6
    }).forEach((premise, index) => {
      if (typeof premise !== "string" || wordCount(premise) < 12) {
        addError([...finalArgumentPath, "premises", String(index)], "must contain at least 12 words");
      }
    });
    requireString(finalArgument, "conclusion", finalArgumentPath, { minWords: 15 });
  }

  requireArray(extension, "newArguments", path, { minLength: 2, maxLength: 4 }).forEach(
    (argument, index) => {
      const argumentPath = [...path, "newArguments", String(index)];
      if (!isPlainObject(argument)) {
        addError(argumentPath, "must be an object");
        return;
      }

      requireString(argument, "title", argumentPath, { minWords: 2, maxWords: 8 });
      requireString(argument, "text", argumentPath, { minWords: 45, maxWords: 130 });
    }
  );
}

function validateLogicalExtension(extension, path) {
  if (!isPlainObject(extension)) {
    addError(path, "must be an object");
    return;
  }

  ["pro", "con"].forEach((sideKey) => {
    validateLogicalExtensionSide(extension[sideKey], [...path, sideKey]);
  });
}

function validateDebate(debate, index) {
  const path = ["debates", String(index)];
  if (!isPlainObject(debate)) {
    addError(path, "must be an object");
    return;
  }

  if (debate.draft || debate.sections?.some((section) => section?.__draft)) {
    return;
  }

  requireString(debate, "id", path, {
    pattern: slugPattern,
    patternMessage: "must be a lowercase URL slug"
  });
  requireString(debate, "number", path, {
    pattern: debateNumberPattern,
    patternMessage: "must be at least two digits and zero-padded below 100"
  });
  const debateNumber = Number.parseInt(debate.number, 10);
  const hasReassessmentRubric = debate.assessmentRubric !== undefined;
  if (hasReassessmentRubric) {
    const rubric = requireString(debate, "assessmentRubric", path);
    requireString(debate, "assessmentModel", path);
    if (rubric !== reassessmentRubric) {
      addError([...path, "assessmentRubric"], `must be ${reassessmentRubric}`);
    }
  } else if (debateNumber >= terraAssessmentFirstDebate) {
    const assessmentModel = requireString(debate, "assessmentModel", path);
    if (assessmentModel !== currentAssessmentModel) {
      addError(
        [...path, "assessmentModel"],
        `must be ${currentAssessmentModel} for Debate ${terraAssessmentFirstDebate} and later`
      );
    }
  } else if (
    debate.assessmentModel !== undefined &&
    debate.assessmentModel !== legacyAssessmentModel
  ) {
    addError(
      [...path, "assessmentModel"],
      `must be ${legacyAssessmentModel} when provided for debates before ${terraAssessmentFirstDebate}`
    );
  }
  const topicCategory = debate.topicCategory;
  if (topicCategory === undefined) {
    if (debateNumber >= explicitTopicCategoryFirstDebate) {
      addError(
        [...path, "topicCategory"],
        `must be set to a valid primary category for Debate ${explicitTopicCategoryFirstDebate} and later`
      );
    }
  } else {
    requireString(debate, "topicCategory", path);
    if (!topicCategoryIds.has(topicCategory)) {
      addError([...path, "topicCategory"], "must be a recognized Slugfester topic category ID");
    }
  }
  requireString(debate, "title", path, { minWords: 3 });
  requireString(debate, "label", path);
  requireString(debate, "date", path, {
    pattern: datePattern,
    patternMessage: "must use YYYY-MM-DD"
  });
  requireString(debate, "duration", path);
  requireString(debate, "youtubeUrl", path, {
    pattern: youtubePattern,
    patternMessage: "must be a YouTube watch URL"
  });
  requireString(debate, "motion", path, { minWords: 10 });
  requireString(debate, "summary", path, { minWords: 8, maxWords: 35 });
  requireString(debate, "sourceNote", path, { minWords: 10 });
  const scoringNote = requireString(debate, "scoringNote", path, { minWords: 18 });
  if (!/AI-generated/i.test(scoringNote)) {
    addError([...path, "scoringNote"], "must explicitly say the scores are AI-generated");
  }

  ["pro", "con"].forEach((sideKey) => {
    requireScore(debate.score, sideKey, [...path, "score"]);
    validateSide(debate.sides?.[sideKey], [...path, "sides", sideKey]);
    validateQuote(debate.quotes?.[sideKey], [...path, "quotes", sideKey]);
    validateOverall(debate.overall?.[sideKey], [...path, "overall", sideKey]);
  });

  if (debate.logicalExtension !== undefined) {
    validateLogicalExtension(debate.logicalExtension, [...path, "logicalExtension"]);
  }

  requireArray(debate, "sections", path, { minLength: 4, maxLength: 7 }).forEach(
    (section, sectionIndex) => {
      const sectionPath = [...path, "sections", String(sectionIndex)];
      if (!isPlainObject(section)) {
        addError(sectionPath, "must be an object");
        return;
      }

      requireString(section, "title", sectionPath, { minWords: 2, maxWords: 10 });
      requireString(section, "timebox", sectionPath);
      ["pro", "con"].forEach((sideKey) => {
        requireScore(section.score, sideKey, [...sectionPath, "score"]);
      });

      requireArray(section, "exchanges", sectionPath, { minLength: 1, maxLength: 3 }).forEach(
        (exchange, exchangeIndex) => {
          const exchangePath = [...sectionPath, "exchanges", String(exchangeIndex)];
          if (!isPlainObject(exchange)) {
            addError(exchangePath, "must be an object");
            return;
          }

          validateArgument(exchange.pro, [...exchangePath, "pro"]);
          validateArgument(exchange.con, [...exchangePath, "con"]);
        }
      );
    }
  );

  if (hasReassessmentRubric && debate.assessmentRubric === reassessmentRubric) {
    validateReassessmentLedger(debate, path);
  }
}

if (!Array.isArray(debates) || debates.length === 0) {
  addError(["debates"], "must export a non-empty array");
} else {
  const ids = new Set();
  const numbers = new Set();
  const labels = new Set();
  debates.forEach(validateDebate);
  debates.forEach((debate, index) => {
    if (debate?.id) {
      if (ids.has(debate.id)) {
        addError(["debates", String(index), "id"], "must be unique");
      }
      ids.add(debate.id);
    }

    if (debate?.number) {
      const expectedNumber = String(index + 1).padStart(2, "0");
      if (numbers.has(debate.number)) {
        addError(["debates", String(index), "number"], "must be unique");
      }
      if (debate.number !== expectedNumber) {
        addError(
          ["debates", String(index), "number"],
          `must be sequential in debate order; expected ${expectedNumber}`
        );
      }
      numbers.add(debate.number);
    }

    if (debate?.label) {
      if (labels.has(debate.label)) {
        addError(["debates", String(index), "label"], "must be unique");
      }
      labels.add(debate.label);
    }
  });
}

if (errors.length > 0) {
  console.error(`Debate validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validated ${debates.length} debate${debates.length === 1 ? "" : "s"}.`);
