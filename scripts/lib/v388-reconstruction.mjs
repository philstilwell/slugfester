import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const V388_RECON_ROOT = "docs/calibration/v3.8.8/reconstruction";
export const V388_RECON_PROTOCOL = "v3.8.8-recovered-diagnostic-reconstruction";
export const V388_RECON_BYLINE = "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.";
export const V388_RECON_MODEL = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" };

export function assertV388Recon(condition, message) {
  if (!condition) throw new Error(message);
}

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const readJson = async (root, relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
export const readBytes = (root, relativePath) => readFile(path.resolve(root, relativePath));

const str = (minLength = 1) => ({ type: "string", minLength });
const score = { type: "integer", minimum: 0, maximum: 100 };
const novelty = {
  type: "object",
  additionalProperties: false,
  required: ["classification", "sourceMoveIds", "explanation"],
  properties: {
    classification: { type: "string", enum: ["extends", "repairs", "introduces"] },
    sourceMoveIds: { type: "array", items: str(), uniqueItems: true },
    explanation: str(20)
  }
};
const extensionItem = {
  type: "object",
  additionalProperties: false,
  required: ["id", "text", "novelty"],
  properties: { id: str(), text: str(), novelty }
};
const newArgument = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "text", "novelty"],
  properties: { id: str(), title: str(), text: str(), novelty }
};
const tag = {
  type: "object",
  additionalProperties: false,
  required: ["label", "type", "slug", "context"],
  properties: {
    label: str(),
    type: { type: "string", enum: ["fallacy", "bias"] },
    slug: str(),
    context: str(20)
  }
};
const argument = {
  type: "object",
  additionalProperties: false,
  required: ["moveId", "time", "role", "words", "score", "critique", "tags"],
  properties: {
    moveId: str(), time: str(), role: str(), words: str(), score, critique: str(),
    tags: { type: "array", maxItems: 2, items: tag }
  }
};
const nullableArgument = { anyOf: [{ type: "null" }, argument] };
const sideScores = {
  type: "object", additionalProperties: false, required: ["pro", "con"],
  properties: { pro: score, con: score }
};

export function buildV388ReconstructionSchema(debate, quotes) {
  const quoteSchema = (side) => ({
    type: "object", additionalProperties: false,
    required: ["text", "context", "sourceMoveId", "audioVerified"],
    properties: {
      text: { type: "string", const: quotes[side].text }, context: str(20),
      sourceMoveId: { type: "string", const: quotes[side].sourceMoveId }, audioVerified: { type: "boolean", const: true }
    }
  });
  const side = (color) => ({
    type: "object", additionalProperties: false, required: ["name", "speaker", "color"],
    properties: { name: str(), speaker: str(), color: { type: "string", const: color } }
  });
  const blunder = {
    type: "object", additionalProperties: false, required: ["text", "tags"],
    properties: { text: str(20), tags: { type: "array", maxItems: 2, items: tag } }
  };
  const overallSide = {
    type: "object", additionalProperties: false, required: ["score", "strengths", "blunders"],
    properties: {
      score, strengths: { type: "array", minItems: 3, maxItems: 6, items: str(20) },
      blunders: { type: "array", minItems: 1, maxItems: 4, items: blunder }
    }
  };
  const extensionSide = {
    type: "object", additionalProperties: false, required: ["thesis", "premises", "conclusion", "newArguments"],
    properties: {
      thesis: extensionItem,
      premises: { type: "array", minItems: 4, maxItems: 6, items: extensionItem },
      conclusion: extensionItem,
      newArguments: { type: "array", minItems: 2, maxItems: 4, items: newArgument }
    }
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: `Slugfester v3.8.8 recovered reconstruction Debate ${debate.debateNumber}`,
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "assessmentModel", "calibrationOnly", "completedAt", "scorecard", "aiExtension", "displayContract"],
    properties: {
      schemaVersion: { type: "string", const: "3.8.8-assessment-reconstruction" },
      protocolId: { type: "string", const: V388_RECON_PROTOCOL },
      debateNumber: { type: "string", const: debate.debateNumber },
      debateId: { type: "string", const: debate.debateId },
      assessmentModel: { type: "string", const: V388_RECON_MODEL.label },
      calibrationOnly: { type: "boolean", const: true },
      completedAt: { type: "string" },
      scorecard: {
        type: "object", additionalProperties: false,
        required: ["title", "label", "date", "duration", "youtubeUrl", "motion", "summary", "sourceNote", "scoringNote", "quotes", "sides", "score", "sections", "overall"],
        properties: {
          title: str(), label: str(), date: { type: "string", const: "2026-08-04" }, duration: str(), youtubeUrl: str(), motion: str(), summary: str(), sourceNote: str(), scoringNote: str(),
          quotes: { type: "object", additionalProperties: false, required: ["pro", "con"], properties: { pro: quoteSchema("pro"), con: quoteSchema("con") } },
          sides: { type: "object", additionalProperties: false, required: ["pro", "con"], properties: { pro: side("teal"), con: side("coral") } },
          score: sideScores,
          sections: {
            type: "array", minItems: debate.sections.length, maxItems: debate.sections.length,
            items: {
              type: "object", additionalProperties: false, required: ["sectionId", "title", "timebox", "score", "exchanges"],
              properties: {
                sectionId: str(), title: str(), timebox: str(), score: sideScores,
                exchanges: {
                  type: "array", minItems: 1, maxItems: 3,
                  items: { type: "object", additionalProperties: false, required: ["pro", "con"], properties: { pro: nullableArgument, con: nullableArgument } }
                }
              }
            }
          },
          overall: { type: "object", additionalProperties: false, required: ["pro", "con"], properties: { pro: overallSide, con: overallSide } }
        }
      },
      aiExtension: {
        type: "object", additionalProperties: false, required: ["aiGenerated", "disclaimer", "pro", "con"],
        properties: { aiGenerated: { type: "boolean", const: true }, disclaimer: str(40), pro: extensionSide, con: extensionSide }
      },
      displayContract: {
        type: "object", additionalProperties: false,
        required: ["sectionTitle", "placement", "defaultCollapsed", "visualVariant", "byline", "prohibitedLanguageScanPassed"],
        properties: {
          sectionTitle: { type: "string", const: "AI Extension" },
          placement: { type: "string", const: "immediately-after-overall-commentary" },
          defaultCollapsed: { type: "boolean", const: true },
          visualVariant: { type: "string", const: "ai-distinct" },
          byline: { type: "string", const: V388_RECON_BYLINE },
          prohibitedLanguageScanPassed: { type: "boolean", const: true }
        }
      }
    }
  };
}

export const wordCount = (value) => String(value).trim().split(/\s+/).filter(Boolean).length;
export function displayedLanguagePasses(value) {
  const text = JSON.stringify(value).toLowerCase();
  return !text.includes("unassailable") && !/(immune to rational objection|rationally invulnerable|incapable of revision)/i.test(text);
}
