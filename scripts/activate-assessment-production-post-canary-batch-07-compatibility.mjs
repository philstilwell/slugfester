#!/usr/bin/env node

import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_07_COMPATIBILITY_ORDER,
  POST_CANARY_BATCH_07_COMPATIBILITY_ROOT,
  serializedJson
} from "./lib/assessment-production-post-canary-batch-07-compatibility.mjs";
import {
  POST_CANARY_BATCH_07_COMPATIBILITY_ACTIVATION_STATUS,
  buildPostCanaryBatch07ValidatorSource,
  sha256,
  validatePostCanaryBatch07ValidatorSource
} from "./lib/assessment-production-post-canary-batch-07-compatibility-execution.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const activatedAtIndex = args.indexOf("--activated-at");
const requestedActivatedAt =
  activatedAtIndex >= 0 ? args[activatedAtIndex + 1] : null;
const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const fileSha256 = async (relativePath) =>
  sha256(await readFile(resolve(relativePath)));

const paths = {
  preparation: `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/preparation-manifest.json`,
  preparationAnalysis: `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/analysis.json`,
  activation: `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/execution-activation.json`,
  execution: `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/execution.json`,
  stagedLedgerRoot:
    `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/output-bundle/staged-ledgers`,
  validator: "scripts/validate-debates.mjs",
  debates: "src/data/debates.js",
  references: "src/data/references.js",
  productionLedgerRoot: "docs/assessment-ledgers",
  compatibilityLibrary:
    "scripts/lib/assessment-production-post-canary-batch-07-compatibility.mjs",
  executionLibrary:
    "scripts/lib/assessment-production-post-canary-batch-07-compatibility-execution.mjs",
  activationScript:
    "scripts/activate-assessment-production-post-canary-batch-07-compatibility.mjs",
  activationTest:
    "scripts/test-assessment-production-post-canary-batch-07-compatibility-activation.mjs",
  executionScript:
    "scripts/run-assessment-production-post-canary-batch-07-compatibility.mjs",
  executionTest:
    "scripts/test-assessment-production-post-canary-batch-07-compatibility-execution.mjs"
};

const ledgerInventory = async () => {
  const names = (await readdir(resolve(paths.productionLedgerRoot)))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const records = await Promise.all(
    names.map(async (name) => {
      const relativePath = `${paths.productionLedgerRoot}/${name}`;
      return { path: relativePath, sha256: await fileSha256(relativePath) };
    })
  );
  return {
    files: records.length,
    digest: sha256(serializedJson(records))
  };
};

const preparationBytes = await readFile(resolve(paths.preparation));
const preparation = JSON.parse(preparationBytes);
const preparationAnalysis = await readJson(paths.preparationAnalysis);
assertV4(
  preparation.status ===
      "post-canary-batch-07-compatibility-plan-prepared-and-frozen" &&
    preparation.planningOnly === true &&
    preparation.directIncrementalCostCapUsd === 0 &&
    preparation.authorization.compatibilityPlanPreparation === true &&
    preparation.authorization.compatibilityExecution === false &&
    preparation.authorization.validatorMigration === false &&
    preparation.authorization.productionMutation === false &&
    preparation.nextAuthorizedAction ===
      "activate-and-execute-one-batch-07-production-compatibility-pass-under-standing-authorization",
  "frozen Batch 7 compatibility preparation is unavailable"
);
assertV4(
  preparationAnalysis.status ===
      "post-canary-batch-07-compatibility-plan-freeze-passed" &&
    preparationAnalysis.preparation.sha256 === sha256(preparationBytes) &&
    preparationAnalysis.finding.executed === false,
  "frozen Batch 7 compatibility preparation analysis is unavailable"
);
for (const [sourcePath, expectedHash] of Object.entries(
  preparation.frozenSources
)) {
  assertV4(
    (await fileSha256(sourcePath)) === expectedHash,
    `frozen source changed before activation: ${sourcePath}`
  );
}

const existingActivation = (await exists(paths.activation))
  ? await readJson(paths.activation)
  : null;
const activatedAt = existingActivation?.activatedAt ?? requestedActivatedAt;
assertV4(
  typeof activatedAt === "string" && !Number.isNaN(Date.parse(activatedAt)),
  "a stable --activated-at ISO timestamp is required for the first Batch 7 compatibility activation write"
);
assertV4(
  !(await exists(paths.execution)) && !(await exists(paths.stagedLedgerRoot)),
  "Batch 7 compatibility execution already exists; activation blocked"
);

const packetHashes = [];
for (const record of preparation.artifacts.packets) {
  const packetBytes = await readFile(resolve(record.path));
  const packet = JSON.parse(packetBytes);
  assertV4(
    sha256(packetBytes) === record.sha256 &&
      packet.debateNumber === record.debateNumber &&
      packet.debateId === record.debateId &&
      packet.proposedAdapterSha256 === record.proposedAdapterSha256 &&
      packet.authorization.compatibilityExecution === false &&
      packet.authorization.stagingLedgerWrite === false,
    `${record.debateNumber}: frozen compatibility packet changed`
  );
  const adapterBytes = serializedJson(packet.proposedAdapterExactOutput);
  assertV4(
    sha256(adapterBytes) === packet.proposedAdapterSha256,
    `${record.debateNumber}: proposed adapter hash changed`
  );
  packetHashes.push({
    debateNumber: record.debateNumber,
    debateId: record.debateId,
    path: record.path,
    sha256: record.sha256,
    proposedAdapterSha256: record.proposedAdapterSha256,
    stagedLedgerPath: packet.futurePaths.stagedLedger,
    stagedLedgerSha256: packet.proposedAdapterSha256,
    stagedLedgerBytes: Buffer.byteLength(adapterBytes),
    productionLedgerPath: packet.futurePaths.productionLedger
  });
}
assertV4(
  canonicalJson(packetHashes.map((item) => item.debateNumber)) ===
    canonicalJson(POST_CANARY_BATCH_07_COMPATIBILITY_ORDER),
  "Batch 7 compatibility activation packet order changed"
);

const baselineValidator = await readFile(resolve(paths.validator), "utf8");
assertV4(
  sha256(baselineValidator) ===
    preparation.proposedValidatorRoute.currentValidatorSha256,
  "active validator differs from the frozen Batch 7 baseline"
);
const proposedValidator = buildPostCanaryBatch07ValidatorSource(
  baselineValidator
);
const proposedValidatorValidation =
  validatePostCanaryBatch07ValidatorSource(proposedValidator);

const executionToolPaths = [
  paths.compatibilityLibrary,
  paths.executionLibrary,
  paths.activationScript,
  paths.activationTest,
  paths.executionScript,
  paths.executionTest
];
const executionToolHashes = Object.fromEntries(
  await Promise.all(
    executionToolPaths.map(async (toolPath) => [
      toolPath,
      await fileSha256(toolPath)
    ])
  )
);
const productionLedgerInventory = await ledgerInventory();
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-compatibility-execution-activation",
  protocolId: preparation.protocolId,
  status: POST_CANARY_BATCH_07_COMPATIBILITY_ACTIVATION_STATUS,
  activatedAt,
  productionCanary: false,
  batchNumber: 7,
  directIncrementalCostCapUsd: 0,
  userAuthorization: {
    instruction:
      "The Batch 7 standing authorization covers activation and exactly one deterministic compatibility staging pass.",
    scopeInterpretation:
      "Activate the frozen Batch 7 compatibility manifest and execute exactly one validator-and-staged-ledger compatibility pass with no reruns, models, paid services, production ledger publication, production data mutation, or Batch 8 selection."
  },
  preparation: {
    path: paths.preparation,
    sha256: sha256(preparationBytes)
  },
  preparationAnalysis: {
    path: paths.preparationAnalysis,
    sha256: sha256(serializedJson(preparationAnalysis)),
    snapshot: preparationAnalysis
  },
  validator: {
    path: paths.validator,
    baselineSha256: sha256(baselineValidator),
    proposedSha256: proposedValidatorValidation.sha256,
    proposedBytes: proposedValidatorValidation.bytes,
    exactTransformationLibrary: paths.executionLibrary,
    routeCredentialStatus: POST_CANARY_BATCH_07_COMPATIBILITY_ACTIVATION_STATUS
  },
  packetHashes,
  executionToolHashes,
  protectedProduction: {
    debates: {
      path: paths.debates,
      sha256: await fileSha256(paths.debates)
    },
    references: {
      path: paths.references,
      sha256: await fileSha256(paths.references)
    },
    productionLedgers: productionLedgerInventory
  },
  executionDiscipline: {
    compatibilityPassesMaximum: 1,
    attemptsPerPass: 1,
    rerunsAllowed: false,
    retriesAllowed: false,
    automaticRepairsAllowed: false,
    packetRewritesAllowed: false,
    adapterRewritesAllowed: false,
    timeoutExtensionsAllowed: false
  },
  requiredRegressions: [
    "Batch 7 route positive and negative controls",
    "checkpoint v2.2 route and score replay",
    "Batch 1 route and score replay",
    "Batch 2 route and score replay",
    "Batch 3 route and score replay",
    "Batch 4 route and score replay",
    "Batch 5 route and score replay",
    "Batch 6 route and score replay",
    "legacy Rubric v2 and v2.1 calculations",
    "reference validation",
    "full repository check"
  ],
  authorization: {
    executionActivation: true,
    compatibilityExecution: true,
    validatorMigration: true,
    stagingLedgerWrite: true,
    compatibilityPasses: 1,
    compatibilityRerun: false,
    packetRewrite: false,
    adapterRewrite: false,
    modelExecution: false,
    paidServices: false,
    scoreDerivation: false,
    scoreRerun: false,
    proseRewrite: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "execute-one-frozen-batch-07-production-compatibility-staging-pass-no-reruns"
};
const activationBytes = serializedJson(activation);

if (write) {
  assertV4(!existingActivation, "Batch 7 compatibility is already activated");
  await writeFile(resolve(paths.activation), activationBytes);
} else {
  assertV4(
    existingActivation &&
      canonicalJson(existingActivation) === canonicalJson(activation),
    "stored Batch 7 compatibility activation differs from deterministic replay"
  );
}

console.log(
  JSON.stringify(
    {
      status: activation.status,
      write,
      activatedAt,
      packets: packetHashes.length,
      stagedAdapterBytes: packetHashes.reduce(
        (sum, item) => sum + item.stagedLedgerBytes,
        0
      ),
      baselineValidatorSha256: activation.validator.baselineSha256,
      proposedValidatorSha256: activation.validator.proposedSha256,
      compatibilityPassesAuthorized: 1,
      rerunsAllowed: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
