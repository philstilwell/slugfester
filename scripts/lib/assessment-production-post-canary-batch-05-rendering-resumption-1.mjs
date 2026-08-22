import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_RENDERING_ORDER,
  POST_CANARY_BATCH_05_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_05_RENDERING_ROOT,
  validatePostCanaryBatch05RenderingPacket
} from "./assessment-production-post-canary-batch-05-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT =
  `${POST_CANARY_BATCH_05_RENDERING_ROOT}/resumption-1`;
export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID =
  `${POST_CANARY_BATCH_05_RENDERING_PROTOCOL_ID}-transport-readiness-resumption-1`;
export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE =
  `${POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT}/transport-failure-diagnosis.json`;
export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION =
  `${POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT}/preparation-manifest.json`;
export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION =
  `${POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT}/execution-activation.json`;
export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_EXECUTION =
  `${POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT}/execution.json`;
export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ANALYSIS =
  `${POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT}/analysis.json`;
export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT =
  `${POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT}/rendering-audit.json`;

export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_APPROVED_SCOPE =
  "Deterministically diagnose, prepare, freeze, activate, and execute one Batch 5 rendering transport-readiness correction/resumption at $0; record the bootstrap-only failure; load required browser diagnostic instructions before execution; permit one replacement attempt for Debate 158 desktop and one attempt for the remaining nineteen frozen viewports; allow no further retries or timeout extensions; stop after validation, analysis, commit, and push or immediately upon further failure; execute no models or paid services and perform no production mutation or next-batch selection.";

export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_DOCUMENTATION =
  Object.freeze([
    "capabilities/browser/viewport",
    "capabilities/tab/cdp"
  ]);

export const POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_VIEWPORT_PLAN =
  Object.freeze(
    POST_CANARY_BATCH_05_RENDERING_ORDER.flatMap((debateNumber) =>
      ["desktop", "mobile"].map((viewportName) => ({
        ordinal:
          POST_CANARY_BATCH_05_RENDERING_ORDER.indexOf(debateNumber) * 2 +
          (viewportName === "desktop" ? 1 : 2),
        debateNumber,
        viewportName,
        attemptClassification:
          debateNumber === "158" && viewportName === "desktop"
            ? "authorized-replacement-of-bootstrap-only-attempt"
            : "first-candidate-rendering-attempt"
      }))
    )
  );

export const sha256Batch05RenderingResumption1 = (value) =>
  createHash("sha256").update(value).digest("hex");

export function validatePostCanaryBatch05RenderingResumption1Plan(plan) {
  assertV4(
    canonicalJson(plan) ===
      canonicalJson(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_VIEWPORT_PLAN) &&
      plan.length === 20 &&
      plan.filter(
        (row) =>
          row.attemptClassification ===
          "authorized-replacement-of-bootstrap-only-attempt"
      ).length === 1 &&
      plan[0].debateNumber === "158" &&
      plan[0].viewportName === "desktop",
    "Batch 5 rendering resumption viewport plan changed"
  );
  return plan;
}

export async function loadPostCanaryBatch05RenderingResumption1Packets(
  preparation
) {
  validatePostCanaryBatch05RenderingResumption1Plan(preparation.viewportPlan);
  const packets = new Map();
  for (const row of preparation.packets) {
    const bytes = await readFile(path.resolve(row.path));
    assertV4(
      sha256Batch05RenderingResumption1(bytes) === row.sha256 &&
        bytes.length === row.bytes,
      `${row.debateNumber}: frozen Batch 5 rendering packet changed`
    );
    const packet = validatePostCanaryBatch05RenderingPacket(JSON.parse(bytes));
    packets.set(row.debateNumber, packet);
  }
  assertV4(packets.size === 10, "ten frozen Batch 5 rendering packets required");
  return packets;
}
