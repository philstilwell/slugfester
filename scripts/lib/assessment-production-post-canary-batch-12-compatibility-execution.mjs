import { createHash } from "node:crypto";

export const POST_CANARY_BATCH_12_COMPATIBILITY_ACTIVATION_STATUS =
  "post-canary-batch-12-compatibility-execution-authorized-and-frozen";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function replaceExactOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: expected exactly one baseline anchor`);
  }
  return source.replace(before, after);
}

export function buildPostCanaryBatch12ValidatorSource(baselineSource) {
  let source = baselineSource;

  const batch11Import = `import {
  POST_CANARY_BATCH_11_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_11_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch11SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-11-compatibility.mjs";`;
  const batch12Import = `import {
  POST_CANARY_BATCH_12_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION,
  validatePostCanaryBatch12SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-12-compatibility.mjs";`;
  source = replaceExactOnce(
    source,
    batch11Import,
    `${batch11Import}\n${batch12Import}`,
    "Batch 12 compatibility import"
  );

  const adapterVersions = `    schemaVersion === CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION ||
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
    schemaVersion === POST_CANARY_BATCH_11_SITE_LEDGER_ADAPTER_VERSION`;
  source = replaceExactOnce(
    source,
    adapterVersions,
    `${adapterVersions} ||\n    schemaVersion === POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION`,
    "Batch 12 adapter-version route"
  );

  const routeFunctions = `export function validatePostCanaryBatch12LedgerAdapterRouteLocks({
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
      "${POST_CANARY_BATCH_12_COMPATIBILITY_ACTIVATION_STATUS}" ||
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
      \`docs/assessment-ledgers/\${debate.id}.json\` ||
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
    \`\${POST_CANARY_BATCH_12_COMPATIBILITY_ROOT}/packets/debate-\${debate.number}.json\`;
  const activationPath =
    \`\${POST_CANARY_BATCH_12_COMPATIBILITY_ROOT}/execution-activation.json\`;
  const packetText = readFileSync(
    new URL(\`../\${packetPath}\`, import.meta.url),
    "utf8"
  );
  const packet = JSON.parse(packetText);
  const activation = JSON.parse(
    readFileSync(new URL(\`../\${activationPath}\`, import.meta.url), "utf8")
  );
  const preparationText = readFileSync(
    new URL(\`../\${activation.preparation?.path}\`, import.meta.url),
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

`;
  source = replaceExactOnce(
    source,
    "function validateReassessmentLedger(debate, path) {",
    `${routeFunctions}function validateReassessmentLedger(debate, path) {`,
    "Batch 12 route functions"
  );

  const batch12Branch = `  if (
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
        \`Batch 12 ledger validation failed: \${error.message}\`
      );
    }
    return;
  }

`;
  source = replaceExactOnce(
    source,
    "  let calculated;\n",
    `${batch12Branch}  let calculated;\n`,
    "Batch 12 ledger branch"
  );

  validatePostCanaryBatch12ValidatorSource(source);
  return source;
}

export function validatePostCanaryBatch12ValidatorSource(source) {
  const required = [
    "POST_CANARY_BATCH_12_COMPATIBILITY_ROOT",
    "POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION",
    "validatePostCanaryBatch12SiteLedgerAdapter",
    "validatePostCanaryBatch12LedgerAdapterRouteLocks",
    "validatePostCanaryBatch12LedgerAdapterRoute",
    POST_CANARY_BATCH_12_COMPATIBILITY_ACTIVATION_STATUS,
    "Batch 12 production assessments require an AI Extension",
    "Batch 12 ledger validation failed"
  ];
  for (const text of required) {
    if (!source.includes(text)) {
      throw new Error(`proposed Batch 12 validator is missing ${text}`);
    }
  }
  if (
    !source.includes("CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_01_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_03_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_04_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_05_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_06_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_07_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_08_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_09_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_10_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("POST_CANARY_BATCH_11_SITE_LEDGER_ADAPTER_VERSION") ||
    !source.includes("validatePostCanaryBatch11LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch10LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch09LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch08LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch07LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch06LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch05LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch04LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch03LedgerAdapterRoute") ||
    !source.includes("validatePostCanaryBatch02LedgerAdapterRoute") ||
    !source.includes("calculateV2Ledger") ||
    !source.includes("calculateV21Ledger")
  ) {
    throw new Error("proposed Batch 12 validator weakens an existing route");
  }
  return {
    status: "passed",
    bytes: Buffer.byteLength(source),
    sha256: sha256(source)
  };
}
