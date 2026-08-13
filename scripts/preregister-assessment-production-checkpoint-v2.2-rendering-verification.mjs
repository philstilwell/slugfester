#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER,
  CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT,
  validateCheckpointV22RenderingVerificationPacket
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const preparationPath =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/preparation-manifest.json`;
const activationPath =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  !(await exists(activationPath)),
  `${activationPath} already exists; activation is immutable`
);

const preparationBytes = await readFile(path.resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status === "rendering-verification-plan-prepared-and-frozen" &&
    preparation.protocolId === CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID &&
    canonicalJson(preparation.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER) &&
    preparation.packets.length === 10 &&
    preparation.gateExpectations.viewportResults === 20 &&
    preparation.gateExpectations.screenshots === 40 &&
    preparation.authorization.renderingVerification === false &&
    preparation.authorization.productionMutation === false &&
    preparation.compatibilityBoundary.productionMutationBlocked === true,
  "frozen rendering-verification preparation changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `preparation source hash mismatch: ${file}`
  );
}
for (const item of preparation.packets) {
  const packetBytes = await readFile(path.resolve(item.path));
  assertV4(
    sha256(packetBytes) === item.sha256 && packetBytes.length === item.bytes,
    `${item.debateNumber}: rendering packet hash changed`
  );
  validateCheckpointV22RenderingVerificationPacket(JSON.parse(packetBytes));
}
for (const file of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(
    !(await exists(file)),
    `future rendering-verification output already exists: ${file}`
  );
}

const activation = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-rendering-verification-execution-activation",
  protocolId: CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
  status: "rendering-verification-execution-authorized-and-frozen",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  modelContexts: 0,
  directCostUsd: 0,
  preparation: preparationPath,
  preparationSha256: sha256(preparationBytes),
  inputs: preparation.inputs,
  explicitOrder: preparation.explicitOrder,
  viewports: preparation.viewports,
  packets: preparation.packets,
  browserPlan: preparation.browserPlan,
  gateExpectations: preparation.gateExpectations,
  failurePolicy: preparation.failurePolicy,
  compatibilityBoundary: preparation.compatibilityBoundary,
  artifacts: preparation.artifacts,
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  sourceHashes: {
    ...preparation.sourceHashes,
    [preparationPath]: sha256(preparationBytes),
    ...Object.fromEntries(
      preparation.packets.map((item) => [item.path, item.sha256])
    )
  },
  authorization: {
    browserControl: true,
    screenshotCapture: true,
    renderingVerification: true,
    renderingRepair: false,
    retry: false,
    modelExecution: false,
    scoreRecalculation: false,
    compatibilityRemedyPlanPreparation: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};

if (shouldWrite) {
  await writeFile(
    path.resolve(activationPath),
    `${JSON.stringify(activation, null, 2)}\n`
  );
}
console.log(JSON.stringify({
  status: shouldWrite
    ? activation.status
    : "rendering-verification-activation-preview",
  debates: activation.packets.length,
  viewportResults: activation.gateExpectations.viewportResults,
  screenshots: activation.gateExpectations.screenshots,
  modelContexts: 0,
  directCostUsd: 0,
  renderingVerificationAuthorized: true,
  renderingRepair: false,
  productionMutation: false
}, null, 2));
