import { debates } from "../src/data/debates.js";
import { getReferenceDefinition, referenceFromUrl } from "../src/data/references.js";

const errors = [];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const youtubePattern = /^https:\/\/(www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]+/;

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

function validateDebate(debate, index) {
  const path = ["debates", String(index)];
  if (!isPlainObject(debate)) {
    addError(path, "must be an object");
    return;
  }

  requireString(debate, "id", path, {
    pattern: slugPattern,
    patternMessage: "must be a lowercase URL slug"
  });
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
}

if (!Array.isArray(debates) || debates.length === 0) {
  addError(["debates"], "must export a non-empty array");
} else {
  const ids = new Set();
  const labels = new Set();
  debates.forEach(validateDebate);
  debates.forEach((debate, index) => {
    if (debate?.id) {
      if (ids.has(debate.id)) {
        addError(["debates", String(index), "id"], "must be unique");
      }
      ids.add(debate.id);
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
