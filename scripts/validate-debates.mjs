import { debates } from "../src/data/debates.js";
import { getReferenceDefinition, referenceFromUrl } from "../src/data/references.js";
import { existsSync, readFileSync } from "node:fs";
import {
  calculateV2Ledger,
  calculateV21Ledger,
  V2_RUBRIC,
  V21_RUBRIC
} from "./lib/reassessment-scoring.mjs";
import {
  CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT,
  CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION,
  sha256,
  validateCheckpointV22SiteLedgerAdapter
} from "./lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs";
import {
  POST_CANARY_BATCH_01_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_01_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch01SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-01-compatibility.mjs";
import {
  POST_CANARY_BATCH_02_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch02SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-02-compatibility.mjs";
import {
  POST_CANARY_BATCH_03_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_03_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch03SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-03-compatibility.mjs";
import {
  POST_CANARY_BATCH_04_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_04_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch04SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-04-compatibility.mjs";
import {
  POST_CANARY_BATCH_05_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_05_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch05SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-05-compatibility.mjs";
import {
  POST_CANARY_BATCH_06_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_06_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch06SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-06-compatibility.mjs";
import {
  POST_CANARY_BATCH_07_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_07_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch07SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-07-compatibility.mjs";
import {
  POST_CANARY_BATCH_08_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_08_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch08SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-08-compatibility.mjs";
import {
  POST_CANARY_BATCH_09_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_09_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch09SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-09-compatibility.mjs";
import {
  POST_CANARY_BATCH_10_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_10_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch10SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-10-compatibility.mjs";
import {
  POST_CANARY_BATCH_11_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_11_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch11SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-11-compatibility.mjs";
import {
  POST_CANARY_BATCH_12_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch12SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-12-compatibility.mjs";
import {
  POST_CANARY_BATCH_17_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_17_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch17SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-17-compatibility.mjs";
import {
  POST_CANARY_BATCH_16_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_16_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch16SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-16-compatibility.mjs";
import {
  POST_CANARY_BATCH_15_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_15_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch15SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-15-compatibility.mjs";
import {
  POST_CANARY_BATCH_14_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_14_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch14SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-14-compatibility.mjs";
import {
  POST_CANARY_BATCH_13_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_13_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch13SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-13-compatibility.mjs";
import {
  CALIBRATION_PROMOTION_ROOT,
  CALIBRATION_PROMOTION_SITE_LEDGER_ADAPTER_VERSION,
  validateCalibrationPromotionSiteLedgerAdapter
} from "./lib/assessment-production-calibration-promotion-v1.mjs";
import {
  STANDALONE_ROOT,
  STANDALONE_SITE_LEDGER_ADAPTER_VERSION,
  validateStandaloneSiteLedgerAdapter
} from "./lib/assessment-production-standalone-debate-v1.mjs";

const errors = [];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const debateNumberPattern = /^\d{2,}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const youtubePattern = /^https:\/\/(www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]+/;
const internalDebateMetadataPattern =
  /(?:SHA-?256|\.assessment-cache|locally cached|timestamped events|below-high-confidence|audio checks?|adjudicated-consensus|disputed-field adjudication|quote-eligible|locked source spans?|repository code|isolated judgments?|source-exact|manifest\.json|transcript\.txt|events\.json)/i;
const legacyAssessmentModel = "GPT 5.5 Extra High";
const currentAssessmentModel = "5.6 Terra Extra High";
const reassessmentRubrics = new Set([V2_RUBRIC, V21_RUBRIC]);
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

function validateNoInternalDebateMetadata(value, path) {
  if (typeof value === "string") {
    if (internalDebateMetadataPattern.test(value)) {
      addError(path, "must use reader-facing language without internal workflow data");
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateNoInternalDebateMetadata(item, [...path, String(index)]);
    });
    return;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, item]) => {
      validateNoInternalDebateMetadata(item, [...path, key]);
    });
  }
}

export function isAdjudicatedConsensusLedgerAdapterVersion(schemaVersion) {
  return (
    schemaVersion === CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_01_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_03_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_04_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_05_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_06_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_07_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_08_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_09_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_10_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_11_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_17_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_16_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_15_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_14_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === POST_CANARY_BATCH_13_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === CALIBRATION_PROMOTION_SITE_LEDGER_ADAPTER_VERSION ||
    schemaVersion === STANDALONE_SITE_LEDGER_ADAPTER_VERSION
  );
}

function usesAdjudicatedConsensusLedgerAdapter(debate) {
  if (!debate?.id) return false;
  const ledgerUrl = new URL(
    `../docs/assessment-ledgers/${encodeURIComponent(debate.id)}.json`,
    import.meta.url
  );
  if (!existsSync(ledgerUrl)) return false;
  try {
    return isAdjudicatedConsensusLedgerAdapterVersion(
      JSON.parse(readFileSync(ledgerUrl, "utf8")).schemaVersion
    );
  } catch {
    return false;
  }
}

function usesStandaloneLedgerAdapter(debate) {
  if (!debate?.id) return false;
  const ledgerUrl = new URL(
    `../docs/assessment-ledgers/${encodeURIComponent(debate.id)}.json`,
    import.meta.url
  );
  if (!existsSync(ledgerUrl)) return false;
  try {
    return JSON.parse(readFileSync(ledgerUrl, "utf8")).schemaVersion ===
      STANDALONE_SITE_LEDGER_ADAPTER_VERSION;
  } catch {
    return false;
  }
}

export function validatePostCanaryBatch01LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-01-compatibility-correction-1-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.productionLedger !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.proposedAdapterSha256
  ) {
    throw new Error(
      "Batch 1 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch01LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_01_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_01_COMPATIBILITY_ROOT}/correction-1/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch01LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch01SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 1 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch02LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-02-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 2 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch02LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch02LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch02SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 2 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch03LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-03-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 3 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch03LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_03_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_03_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch03LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch03SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 3 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch04LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-04-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 4 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch04LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_04_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_04_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch04LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch04SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 4 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch05LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-05-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 5 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch05LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_05_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_05_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch05LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch05SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 5 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch06LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-06-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 6 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch06LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_06_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_06_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch06LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch06SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 6 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch07LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-07-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 7 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch07LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch07LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch07SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 7 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch08LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-08-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 8 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch08LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_08_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_08_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch08LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch08SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 8 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch09LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-09-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 9 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch09LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_09_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_09_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch09LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch09SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 9 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch10LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-10-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 10 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch10LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_10_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_10_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch10LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch10SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 10 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch11LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-11-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 11 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch11LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_11_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_11_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch11LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch11SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 11 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch12LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-12-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 12 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch12LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_12_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_12_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch12LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch12SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 12 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch13LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-13-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 13 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch13LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_13_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_13_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch13LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch13SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 13 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch14LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-14-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 14 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch14LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_14_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_14_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch14LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch14SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 14 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch15LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-15-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 15 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch15LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_15_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_15_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch15LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch15SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 15 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch16LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-16-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 16 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch16LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_16_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_16_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch16LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch16SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 16 production assessments require an AI Extension");
  }
  return validation;
}

export function validatePostCanaryBatch17LedgerAdapterRouteLocks({
  debate,
  ledgerText,
  packetPath,
  packetText,
  packet,
  activation,
  preparationText
}) {
  const packetLock = activation.packetHashes?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    activation.status !==
      "post-canary-batch-17-compatibility-execution-authorized-and-frozen" ||
    !activation.authorization?.compatibilityExecution ||
    !activation.authorization?.validatorMigration ||
    !activation.authorization?.stagingLedgerWrite ||
    sha256(preparationText) !== activation.preparation?.sha256 ||
    !packetLock ||
    packetLock.path !== packetPath ||
    packetLock.debateId !== debate.id ||
    sha256(packetText) !== packetLock.sha256 ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.futurePaths?.stagedLedger !== packetLock.stagedLedgerPath ||
    packet.futurePaths?.productionLedger !== packetLock.productionLedgerPath ||
    packetLock.productionLedgerPath !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
    packetLock.stagedLedgerSha256 !== packetLock.proposedAdapterSha256 ||
    sha256(ledgerText) !== packetLock.stagedLedgerSha256
  ) {
    throw new Error(
      "Batch 17 adapter, packet, or activation differs from its frozen route"
    );
  }
  return packetLock;
}

export function validatePostCanaryBatch17LedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const packetPath =
    `${POST_CANARY_BATCH_17_COMPATIBILITY_ROOT}/packets/debate-${debate.number}.json`;
  const activationPath =
    `${POST_CANARY_BATCH_17_COMPATIBILITY_ROOT}/execution-activation.json`;
  const packetText = readFileSync(
    new URL(`../${packetPath}`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(`../${activationPath}`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(`../${activation.preparation?.path}`, import.meta.url),
    "utf8"
  );
  validatePostCanaryBatch17LedgerAdapterRouteLocks({
    debate,
    ledgerText,
    packetPath,
    packetText,
    packet,
    activation,
    preparationText
  });
  const validation = validatePostCanaryBatch17SiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("Batch 17 production assessments require an AI Extension");
  }
  return validation;
}

export function validateCalibrationPromotionLedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const manifestPath = `${CALIBRATION_PROMOTION_ROOT}/manifest.json`;
  const packetPath = `${CALIBRATION_PROMOTION_ROOT}/packets/debate-${debate.number}.json`;
  const manifestText = readFileSync(new URL(`../${manifestPath}`, import.meta.url), "utf8");
  const packetText = readFileSync(new URL(`../${packetPath}`, import.meta.url), "utf8");
  const manifest = JSON.parse(manifestText);
  const packet = JSON.parse(packetText);
  const lock = manifest.debates?.find((item) => item.debateNumber === debate.number);
  if (
    manifest.status !== "frozen-calibration-promotion-manifest" ||
    manifest.batch18Selected !== false ||
    !lock ||
    lock.debateId !== debate.id ||
    lock.packet.path !== packetPath ||
    sha256(packetText) !== lock.packet.sha256 ||
    packet.status !== "frozen-calibration-promotion-packet" ||
    packet.debateNumber !== debate.number ||
    packet.debateId !== debate.id ||
    packet.outputs.productionLedger !== `docs/assessment-ledgers/${debate.id}.json` ||
    packet.outputs.stagedLedger.sha256 !== lock.stagedLedger.sha256 ||
    sha256(ledgerText) !== lock.stagedLedger.sha256
  ) {
    throw new Error("calibration-promotion adapter, packet, or manifest differs from its frozen route");
  }
  const validation = validateCalibrationPromotionSiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    expectedSourceLocks: packet.sourceLocks
  });
  if (!debate.logicalExtension) {
    throw new Error("calibration-promotion assessments require an AI Extension");
  }
  return validation;
}

export function validateStandaloneLedgerAdapterRoute({
  debate,
  ledger,
  ledgerText
}) {
  const registryPath = `${STANDALONE_ROOT}/registry.json`;
  const registry = JSON.parse(
    readFileSync(new URL(`../${registryPath}`, import.meta.url), "utf8")
  );
  const record = registry.debates?.find(
    (item) => item.debateNumber === debate.number
  );
  if (
    registry.status !== "active" ||
    registry.campaignBoundary?.batch18Permitted !== false ||
    !record ||
    record.status !== "published-and-frozen" ||
    record.debateId !== debate.id ||
    record.videoId !== new URL(debate.youtubeUrl).searchParams.get("v") ||
    record.productionLedger?.path !==
      `docs/assessment-ledgers/${debate.id}.json` ||
    record.productionLedger?.sha256 !== sha256(ledgerText)
  ) {
    throw new Error(
      "standalone adapter or registry differs from its frozen route"
    );
  }
  const validation = validateStandaloneSiteLedgerAdapter({
    adapter: ledger,
    candidate: debate,
    repositoryOnly: true,
    root: process.cwd()
  });
  if (!debate.logicalExtension) {
    throw new Error("standalone production assessments require an AI Extension");
  }
  return validation;
}

function validateReassessmentLedger(debate, path) {
  const isV21 = debate.assessmentRubric === V21_RUBRIC;
  const ledgerUrl = new URL(
    `../docs/assessment-ledgers/${encodeURIComponent(debate.id)}.json`,
    import.meta.url
  );

  if (!existsSync(ledgerUrl)) {
    addError([...path, "assessmentRubric"], "requires a matching JSON assessment ledger");
    return;
  }

  let ledger;
  let ledgerText;
  try {
    ledgerText = readFileSync(ledgerUrl, "utf8");
    ledger = JSON.parse(ledgerText);
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
  const ledgerRubric = isV21 ? ledger.rubricVersion : ledger.rubric;
  if (ledgerRubric !== debate.assessmentRubric) {
    addError([...path, "assessmentRubric"], `ledger rubric must be ${debate.assessmentRubric}`);
  }
  if (isV21 && ledger.calibrationOnly !== false) {
    addError([...path, "assessmentRubric"], "published v2.1 ledgers must set calibrationOnly to false");
  }

  if (ledger.schemaVersion === CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION) {
    try {
      const packetUrl = new URL(
        `../${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/packets/debate-${encodeURIComponent(debate.number)}.json`,
        import.meta.url
      );
      const activationUrl = new URL(
        `../${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/execution-activation.json`,
        import.meta.url
      );
      const packetText = readFileSync(packetUrl, "utf8");
      const packet = JSON.parse(packetText);
      const activation = JSON.parse(readFileSync(activationUrl, "utf8"));
      const packetLock = activation.packetHashes?.find(
        (item) => item.debateNumber === debate.number
      );
      if (
        activation.status !==
          "compatibility-remedy-execution-authorized-and-frozen" ||
        !activation.authorization?.compatibilityRemedyExecution ||
        !packetLock ||
        packetLock.path !==
          `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/packets/debate-${debate.number}.json` ||
        sha256(packetText) !== packetLock.sha256 ||
        packet.proposedAdapterSha256 !== packetLock.proposedAdapterSha256 ||
        sha256(ledgerText) !== packetLock.proposedAdapterSha256
      ) {
        throw new Error("checkpoint adapter or packet hash differs from its frozen activation");
      }
      validateCheckpointV22SiteLedgerAdapter({
        adapter: ledger,
        candidate: debate,
        expectedSourceLocks: packet.sourceLocks
      });
      if (!debate.logicalExtension) {
        throw new Error("checkpoint production assessments require an AI Extension");
      }
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `checkpoint ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_01_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch01LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 1 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch02LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 2 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_03_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch03LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 3 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_04_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch04LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 4 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_05_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch05LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 5 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_06_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch06LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 6 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_07_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch07LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 7 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_08_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch08LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 8 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_09_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch09LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 9 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_10_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch10LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 10 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_11_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch11LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 11 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch12LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 12 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_13_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch13LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 13 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_14_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch14LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 14 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_15_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch15LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 15 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_16_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch16LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 16 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === POST_CANARY_BATCH_17_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validatePostCanaryBatch17LedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Batch 17 ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (
    ledger.schemaVersion === CALIBRATION_PROMOTION_SITE_LEDGER_ADAPTER_VERSION
  ) {
    try {
      validateCalibrationPromotionLedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Calibration promotion ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  if (ledger.schemaVersion === STANDALONE_SITE_LEDGER_ADAPTER_VERSION) {
    try {
      validateStandaloneLedgerAdapterRoute({
        debate,
        ledger,
        ledgerText
      });
    } catch (error) {
      addError(
        [...path, "assessmentRubric"],
        `Standalone ledger validation failed: ${error.message}`
      );
    }
    return;
  }

  let calculated;
  try {
    calculated = isV21 ? calculateV21Ledger(ledger) : calculateV2Ledger(ledger);
  } catch (error) {
    addError([...path, "assessmentRubric"], `ledger calculation failed: ${error.message}`);
    return;
  }

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
    ["pro", "con"].forEach((sideKey) => {
      const ledgerSide = ledgerSection.sides?.[sideKey];
      const calculatedSide = calculated.sections[sectionIndex].sides[sideKey];
      const sidePath = [...sectionPath, sideKey];
      const publishedMoves =
        section?.exchanges?.map((exchange) => exchange?.[sideKey]).filter(Boolean) || [];
      if (!ledgerSide || !Array.isArray(ledgerSide.moves)) {
        addError(sidePath, "must exist in the assessment ledger with a moves array");
        return;
      }
      if (ledgerSide.moves.length !== publishedMoves.length) {
        addError(sidePath, "must have the same move count as the assessment ledger");
        return;
      }

      ledgerSide.moves.forEach((move, moveIndex) => {
        const movePath = [...sidePath, "moves", String(moveIndex)];
        const computedMove = calculatedSide.moves[moveIndex];
        const computed = isV21 ? computedMove.finalScore : computedMove.score;
        const stored = isV21 ? move.finalScore : move.score;
        if (stored !== computed || publishedMoves[moveIndex]?.score !== computed) {
          addError([...movePath, "score"], `computed score ${computed} must match ledger and debate`);
        }
        if (isV21 && publishedMoves[moveIndex]?.ledgerMoveId !== move.id) {
          addError(
            [...movePath, "id"],
            "published move ledgerMoveId must match the stable v2.1 ledger move ID"
          );
        }
      });

      if (!isV21 && ledgerSide.moveMean !== calculatedSide.moveMean) {
        addError([...sidePath, "moveMean"], `must equal computed move mean ${calculatedSide.moveMean}`);
      }
      if (ledgerSide.score !== calculatedSide.score || section?.score?.[sideKey] !== calculatedSide.score) {
        addError([...sidePath, "score"], `computed section score ${calculatedSide.score} must match ledger and debate`);
      }
    });
  });

  ["pro", "con"].forEach((sideKey) => {
    const ledgerOverall = ledger.overall?.[sideKey];
    const overallPath = [...path, "overall", sideKey];
    if (!ledgerOverall) {
      addError(overallPath, "must exist in the assessment ledger");
      return;
    }
    const calculatedOverall = calculated.overall[sideKey];
    if (ledgerOverall.weightedSectionMean !== calculatedOverall.weightedSectionMean) {
      addError(
        [...overallPath, "weightedSectionMean"],
        `must equal computed weighted section mean ${calculatedOverall.weightedSectionMean}`
      );
    }
    if (
      ledgerOverall.score !== calculatedOverall.score ||
      debate.overall?.[sideKey]?.score !== calculatedOverall.score ||
      debate.score?.[sideKey] !== calculatedOverall.score
    ) {
      addError([...overallPath, "score"], `computed overall score ${calculatedOverall.score} must match ledger and debate`);
    }
  });

  if (isV21 && !debate.logicalExtension) {
    addError([...path, "logicalExtension"], "v2.1 production assessments require an AI Extension");
  }
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

function validateArgument(
  argument,
  path,
  { requireLedgerMoveId = false, requirePublicationContract = false } = {}
) {
  if (!isPlainObject(argument)) {
    addError(path, "must be an object");
    return;
  }

  requireString(argument, "time", path);
  requireString(argument, "role", path, { maxWords: 5 });
  requireString(argument, "words", path, { minWords: 8, maxWords: 55 });
  requireScore(argument, "score", path);
  if (requireLedgerMoveId) requireString(argument, "ledgerMoveId", path);

  const critique = requireString(argument, "critique", path);
  const critiqueWords = wordCount(critique);
  if (critiqueWords < 105 || critiqueWords > 130) {
    addError([...path, "critique"], `should be 105-130 words; found ${critiqueWords}`);
  }
  if (requirePublicationContract) {
    if (critique.length < 880) {
      addError(
        [...path, "critique"],
        `should contain at least 880 characters; found ${critique.length}`
      );
    }
    const critiqueLabels = [
      "Strongest feature:",
      "Principal limitation:",
      "Live burden:",
      "Locked score:"
    ];
    const critiqueParts = critique
      .split(/(?=Principal limitation:|Live burden:|Locked score:)/)
      .map((part) => part.trim());
    const sentenceEnds = critique.match(/[.!?](?=\s|$)/g) || [];
    if (
      critiqueParts.length !== critiqueLabels.length ||
      !critiqueParts.every(
        (part, index) =>
          part.startsWith(critiqueLabels[index]) && /[.!?]$/.test(part)
      ) ||
      sentenceEnds.length !== critiqueLabels.length
    ) {
      addError(
        [...path, "critique"],
        "must contain exactly four terminally punctuated sentences with the ordered publication labels"
      );
    }
    if (/[\u3400-\u9fff\uac00-\ud7af\ufffd]/u.test(critique)) {
      addError(
        [...path, "critique"],
        "must not contain unexpected CJK, Hangul, or replacement characters"
      );
    }
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

function validateOverall(overall, path, { minimumBlunders = 1 } = {}) {
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

  requireArray(overall, "blunders", path, { minLength: minimumBlunders }).forEach((blunder, index) => {
    const blunderPath = [...path, "blunders", String(index)];
    if (!isPlainObject(blunder)) {
      addError(blunderPath, "must be an object");
      return;
    }

    requireString(blunder, "text", blunderPath, { minWords: 8 });
    requireArray(blunder, "links", blunderPath).forEach((link, linkIndex) => {
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

function logicalExtensionText(extension) {
  if (typeof extension === "string") return extension;
  if (Array.isArray(extension)) return extension.map(logicalExtensionText).join(" ");
  if (isPlainObject(extension)) {
    return Object.values(extension).map(logicalExtensionText).join(" ");
  }
  return "";
}

function validateAiContributionPunctuationCorpus(records) {
  const audited = records
    .map((debate, index) => {
      const text = logicalExtensionText(debate?.logicalExtension);
      const words = wordCount(text);
      const commas = (text.match(/,/g) ?? []).length;
      return { debate, index, words, commas, commaDensity: words ? commas / words : 0 };
    })
    .filter(({ debate, words }) =>
      !debate?.draft && !debate?.sections?.some((section) => section?.__draft) && words >= 300
    );

  if (audited.length < 5) return;

  const densities = audited.map(({ commaDensity }) => commaDensity).sort((a, b) => a - b);
  const corpusMedian = densities[Math.floor(densities.length / 2)];
  const strippedPunctuationThreshold = corpusMedian / 4;

  audited.forEach(({ index, words, commas, commaDensity }) => {
    if (commaDensity < strippedPunctuationThreshold) {
      addError(
        ["debates", String(index), "logicalExtension"],
        `appears to have stripped internal punctuation (${commas} commas across ${words} words; corpus median density ${corpusMedian.toFixed(4)})`
      );
    }
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

  validateNoInternalDebateMetadata(debate, path);

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
  const hasAdjudicatedConsensusLedgerAdapter =
    usesAdjudicatedConsensusLedgerAdapter(debate);
  const hasStandaloneLedgerAdapter = usesStandaloneLedgerAdapter(debate);
  if (hasReassessmentRubric) {
    const rubric = requireString(debate, "assessmentRubric", path);
    requireString(debate, "assessmentModel", path);
    if (!reassessmentRubrics.has(rubric)) {
      addError(
        [...path, "assessmentRubric"],
        `must be ${V2_RUBRIC} or ${V21_RUBRIC}`
      );
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
  const motion = requireString(debate, "motion", path, { minWords: 3, maxWords: 35 });
  if (hasStandaloneLedgerAdapter && !motion.trim().endsWith("?")) {
    addError(
      [...path, "motion"],
      "must preserve the neutral central-question format used by standalone debates"
    );
  }
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
    validateOverall(debate.overall?.[sideKey], [...path, "overall", sideKey], {
      minimumBlunders: hasStandaloneLedgerAdapter ? 2 : 1
    });
  });

  if (debate.logicalExtension === undefined) {
    addError([...path, "logicalExtension"], "must provide an AI Contribution for both sides");
  } else {
    validateLogicalExtension(debate.logicalExtension, [...path, "logicalExtension"]);
  }

  const publishedSectionIds = new Set();
  requireArray(debate, "sections", path, { minLength: 4, maxLength: 7 }).forEach(
    (section, sectionIndex) => {
      const sectionPath = [...path, "sections", String(sectionIndex)];
      if (!isPlainObject(section)) {
        addError(sectionPath, "must be an object");
        return;
      }

      if (hasStandaloneLedgerAdapter) {
        const sectionId = requireString(section, "sectionId", sectionPath, {
          pattern: slugPattern,
          patternMessage: "must be a lowercase slug"
        });
        if (publishedSectionIds.has(sectionId)) {
          addError([...sectionPath, "sectionId"], "must be unique within the debate");
        }
        publishedSectionIds.add(sectionId);
      }
      requireString(section, "title", sectionPath, { minWords: 2, maxWords: 10 });
      requireString(section, "timebox", sectionPath);
      ["pro", "con"].forEach((sideKey) => {
        requireScore(section.score, sideKey, [...sectionPath, "score"]);
      });

      // Three rows remain the ordinary display limit. A fourth is permitted
      // for evidence-led asymmetry, or for a standalone source-locked section
      // in which both sides have four distinct cards. The standalone adapter
      // separately proves move uniqueness and complete ledger mapping, so the
      // balanced case does not need a debate-number-specific exception.
      const maximumExchanges = hasAdjudicatedConsensusLedgerAdapter ? 4 : 3;
      const exchanges = requireArray(section, "exchanges", sectionPath, {
        minLength: 1,
        maxLength: maximumExchanges
      });
      if (exchanges.length === 4) {
        const sideCounts = ["pro", "con"].map(
          (sideKey) => exchanges.filter((exchange) => exchange?.[sideKey]).length
        );
        const sidesWithFourCards = sideCounts.filter((count) => count === 4).length;
        const isEvidenceLedAsymmetry = sidesWithFourCards === 1;
        const isBalancedStandaloneOverflow =
          hasStandaloneLedgerAdapter && sidesWithFourCards === 2;
        if (!isEvidenceLedAsymmetry && !isBalancedStandaloneOverflow) {
          addError(
            [...sectionPath, "exchanges"],
            "may use a fourth row only for locked one-sided overflow or balanced standalone locked-card overflow"
          );
        }
      }
      exchanges.forEach(
        (exchange, exchangeIndex) => {
          const exchangePath = [...sectionPath, "exchanges", String(exchangeIndex)];
          if (!isPlainObject(exchange)) {
            addError(exchangePath, "must be an object");
            return;
          }

          if (
            debate.assessmentRubric === V21_RUBRIC ||
            hasAdjudicatedConsensusLedgerAdapter
          ) {
            if (!exchange.pro && !exchange.con) {
              addError(
                exchangePath,
                hasAdjudicatedConsensusLedgerAdapter
                  ? "must contain at least one adjudicated-consensus argument move"
                  : "must contain at least one v2.1 argument move"
              );
            }
            if (exchange.pro) {
              validateArgument(exchange.pro, [...exchangePath, "pro"], {
                requireLedgerMoveId: true,
                requirePublicationContract: true
              });
            }
            if (exchange.con) {
              validateArgument(exchange.con, [...exchangePath, "con"], {
                requireLedgerMoveId: true,
                requirePublicationContract: true
              });
            }
          } else {
            validateArgument(exchange.pro, [...exchangePath, "pro"]);
            validateArgument(exchange.con, [...exchangePath, "con"]);
          }
        }
      );
    }
  );

  if (hasReassessmentRubric && reassessmentRubrics.has(debate.assessmentRubric)) {
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
  validateAiContributionPunctuationCorpus(debates);
}

if (errors.length > 0) {
  console.error(`Debate validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validated ${debates.length} debate${debates.length === 1 ? "" : "s"}.`);
