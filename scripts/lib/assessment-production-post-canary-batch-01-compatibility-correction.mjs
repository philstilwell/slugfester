import { createHash } from "node:crypto";

export const POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/production-compatibility/correction-1";
export const POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-01-compatibility-correction-1";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function serializedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function replaceExactOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) {
    throw new Error(`${label}: expected source fragment is absent`);
  }
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: expected source fragment is not unique`);
  }
  return source.replace(before, after);
}

export function buildPostCanaryBatch01CompatibilityCorrectedValidator(
  attemptedValidatorSource
) {
  let corrected = attemptedValidatorSource;
  corrected = replaceExactOnce(
    corrected,
    `  activation,\n  preparationText,\n  analysisText\n}) {`,
    `  activation,\n  preparationText\n}) {`,
    "remove mutable analysis argument from route-lock validator"
  );
  corrected = replaceExactOnce(
    corrected,
    `    sha256(preparationText) !== activation.preparation?.sha256 ||\n    sha256(analysisText) !== activation.preparationAnalysis?.sha256 ||\n`,
    `    sha256(preparationText) !== activation.preparation?.sha256 ||\n`,
    "remove mutable analysis hash comparison"
  );
  corrected = replaceExactOnce(
    corrected,
    `  const analysisText = readFileSync(\n    new URL(\`../\${activation.preparationAnalysis?.path}\`, import.meta.url),\n    "utf8"\n  );\n`,
    "",
    "remove mutable analysis file read"
  );
  corrected = replaceExactOnce(
    corrected,
    `    activation,\n    preparationText,\n    analysisText\n  });`,
    `    activation,\n    preparationText\n  });`,
    "remove mutable analysis argument from route call"
  );
  corrected = replaceExactOnce(
    corrected,
    `  const activationPath =\n    \`\${POST_CANARY_BATCH_01_COMPATIBILITY_ROOT}/execution-activation.json\`;`,
    `  const activationPath =\n    \`\${POST_CANARY_BATCH_01_COMPATIBILITY_ROOT}/correction-1/execution-activation.json\`;`,
    "route through the separately frozen correction activation"
  );
  corrected = replaceExactOnce(
    corrected,
    `      "post-canary-batch-01-compatibility-execution-authorized-and-frozen" ||`,
    `      "post-canary-batch-01-compatibility-correction-1-execution-authorized-and-frozen" ||`,
    "require the correction-specific activation status"
  );
  if (corrected.includes("analysisText")) {
    throw new Error("corrected validator still contains the mutable analysis binding");
  }
  if (
    !corrected.includes(
      "sha256(ledgerText) !== packetLock.proposedAdapterSha256"
    ) ||
    !corrected.includes(
      "sha256(preparationText) !== activation.preparation?.sha256"
    ) ||
    !corrected.includes(
      "validatePostCanaryBatch01SiteLedgerAdapter({"
    )
  ) {
    throw new Error("corrected validator lost a required immutable route control");
  }
  return corrected;
}
