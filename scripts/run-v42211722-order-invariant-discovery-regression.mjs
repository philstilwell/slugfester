#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import { compileV422112CandidateBundle, validateV422112Discovery } from "./lib/v422112-simplified-discovery.mjs";
import { canonicalizeV42211722CandidateOrder, compileV42211722CandidateBundle, validateV42211722Discovery, V42211722_PROTOCOL_ID } from "./lib/v42211722-order-invariant-discovery.mjs";

const OUTPUT = "docs/calibration/v4.2.21.17.22/order-invariant-discovery-regression/regression.json";
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sources = [
  {
    label: "retired-simplified-discovery",
    preparation: "docs/calibration/v4.2.21.12/simplified-partition-discovery/preparation-manifest.json",
    execution: "docs/calibration/v4.2.21.12/simplified-partition-discovery/model-execution.json",
    expectedAvailableOutputs: 12,
  },
  {
    label: "first-failed-held-out-gate",
    preparation: "docs/calibration/v4.2.21.17.10/held-out-source-preparation/preparation-manifest.json",
    execution: "docs/calibration/v4.2.21.17.11/held-out-discovery/model-execution.json",
    expectedAvailableOutputs: 17,
  },
  {
    label: "replacement-failed-held-out-gate",
    preparation: "docs/calibration/v4.2.21.17.14/replacement-held-out-source-preparation/preparation-manifest.json",
    execution: "docs/calibration/v4.2.21.17.15/replacement-held-out-discovery/model-execution.json",
    expectedAvailableOutputs: 14,
  },
  {
    label: "hard-route-ordering-failed-gate",
    preparation: "docs/calibration/v4.2.21.17.19/hard-route-held-out-source-preparation/preparation-manifest.json",
    execution: "docs/calibration/v4.2.21.17.20/hard-route-held-out-discovery/model-execution.json",
    expectedAvailableOutputs: 20,
  },
];

function captureValidation(validator, output, args) {
  try {
    return { accepted: true, validation: validator(output, args), error: null };
  } catch (error) {
    return { accepted: false, validation: null, error: error.message };
  }
}

const rows = [];
const sourceSummaries = [];
let positiveFixture = null;
let replyFixture = null;
for (const source of sources) {
  const preparationBytes = await readFile(source.preparation);
  const executionBytes = await readFile(source.execution);
  const preparation = JSON.parse(preparationBytes);
  const execution = JSON.parse(executionBytes);
  let availableOutputs = 0;
  for (const debate of preparation.contexts) {
    const packet = JSON.parse(await readFile(debate.packet));
    const plan = JSON.parse(await readFile(debate.plan));
    const eventsBytes = await readFile(debate.originalEvents);
    const fullLedgerBytes = await readFile(debate.fullLedger);
    for (const chunk of debate.chunks) {
      if (!(await access(chunk.rawOutput).then(() => true, () => false))) continue;
      availableOutputs += 1;
      const rawBytes = await readFile(chunk.rawOutput);
      const output = JSON.parse(rawBytes);
      const args = {
        packet,
        chunk,
        plan,
        eventsDocument: JSON.parse(eventsBytes),
        eventsBytes,
        chunkBytes: await readFile(chunk.chunkLedgerPath),
        fullLedgerBytes,
      };
      const result = execution.results.find((item) => item.debateNumber === debate.debateNumber && item.chunkId === chunk.chunkId);
      assertV4(result, `${source.label}/${debate.debateNumber}/${chunk.chunkId}: execution record missing`);
      const strict = captureValidation(validateV422112Discovery, output, args);
      const hardened = captureValidation(validateV42211722Discovery, output, args);
      assertV4(strict.accepted === result.accepted, `${source.label}/${debate.debateNumber}/${chunk.chunkId}: strict replay differs from execution ledger`);
      const expectedHardenedAccepted = source.label === "hard-route-ordering-failed-gate"
        ? result.accepted || result.validationMessage?.includes("candidates are not chronological")
        : result.accepted;
      assertV4(hardened.accepted === expectedHardenedAccepted, `${source.label}/${debate.debateNumber}/${chunk.chunkId}: hardened disposition drifted`);
      const ordering = canonicalizeV42211722CandidateOrder(output).audit;
      rows.push({
        source: source.label,
        debateNumber: debate.debateNumber,
        chunkId: chunk.chunkId,
        rawOutput: chunk.rawOutput,
        rawOutputSha256: sha256(rawBytes),
        executionAccepted: result.accepted,
        strictAccepted: strict.accepted,
        strictError: strict.error,
        hardenedAccepted: hardened.accepted,
        hardenedError: hardened.error,
        rawChronologyCanonical: ordering.rawChronologyCanonical,
        canonicalOrderingAppliedForValidation: hardened.validation?.canonicalOrderingAppliedForValidation ?? false,
        candidateFieldsModified: hardened.validation?.candidateFieldsModified ?? false,
      });
      if (!positiveFixture && hardened.accepted && output.candidates.length >= 2) positiveFixture = { output, args };
      if (!replyFixture && hardened.accepted && output.candidates.some((candidate) => candidate.responseIntent.kind === "reply")) replyFixture = { output, args };
    }
  }
  assertV4(availableOutputs === source.expectedAvailableOutputs, `${source.label}: available output count drifted`);
  sourceSummaries.push({
    label: source.label,
    preparation: source.preparation,
    preparationSha256: sha256(preparationBytes),
    execution: source.execution,
    executionSha256: sha256(executionBytes),
    availableOutputs,
    strictAccepted: rows.filter((row) => row.source === source.label && row.strictAccepted).length,
    hardenedAccepted: rows.filter((row) => row.source === source.label && row.hardenedAccepted).length,
  });
}

assertV4(positiveFixture && replyFixture, "negative-control fixtures unavailable");
const reversed = structuredClone(positiveFixture.output);
reversed.candidates.reverse();
const reversedStrict = captureValidation(validateV422112Discovery, reversed, positiveFixture.args);
const reversedHardened = captureValidation(validateV42211722Discovery, reversed, positiveFixture.args);
assertV4(!reversedStrict.accepted && reversedHardened.accepted && reversedHardened.validation.canonicalOrderingAppliedForValidation, "ordering-only positive control failed");
const singleChunkPlan = { ...positiveFixture.args.plan, chunks: [positiveFixture.args.chunk] };
const originalBundle = compileV422112CandidateBundle({ packet: positiveFixture.args.packet, plan: singleChunkPlan, outputs: [positiveFixture.output] });
const reversedBundle = compileV42211722CandidateBundle({ packet: positiveFixture.args.packet, plan: singleChunkPlan, outputs: [reversed] });
assertV4(canonicalJson(originalBundle) === canonicalJson(reversedBundle), "ordering-only positive control changed compilation");

const negativeCases = [
  {
    name: "speaker-side-mismatch",
    fixture: positiveFixture,
    mutate(output, args) {
      const candidate = output.candidates[0];
      const otherSide = candidate.side === "pro" ? "con" : "pro";
      candidate.speaker = args.packet.sides[otherSide].speakers[0];
    },
    expected: /speaker\/side mismatch/,
  },
  {
    name: "source-ownership-bound",
    fixture: positiveFixture,
    mutate(output, args) { output.candidates[0].sourceSpan.startEvent = args.chunk.coreStartEvent - 1; },
    expected: /source span violates/,
  },
  {
    name: "duplicate-candidate-id",
    fixture: positiveFixture,
    mutate(output) { output.candidates[1].candidateId = output.candidates[0].candidateId; },
    expected: /invalid or duplicate candidate ID/,
  },
  {
    name: "short-proposition",
    fixture: positiveFixture,
    mutate(output) { output.candidates[0].proposition = "too short"; },
    expected: /proposition too short/,
  },
  {
    name: "short-reply-description",
    fixture: replyFixture,
    mutate(output) { output.candidates.find((candidate) => candidate.responseIntent.kind === "reply").responseIntent.earlierTargetDescription = "too short"; },
    expected: /too short/,
  },
  {
    name: "unknown-candidate-field",
    fixture: positiveFixture,
    mutate(output) { output.candidates[0].unknownField = true; },
    expected: /keys must be/,
  },
];
const negativeControls = negativeCases.map((testCase) => {
  const mutated = structuredClone(testCase.fixture.output);
  testCase.mutate(mutated, testCase.fixture.args);
  const result = captureValidation(validateV42211722Discovery, mutated, testCase.fixture.args);
  assertV4(!result.accepted && testCase.expected.test(result.error), `${testCase.name}: hardened validator admitted or misclassified negative control`);
  return { name: testCase.name, rejected: true, error: result.error };
});

assertV4(rows.length === 63, "retired regression output count drifted");
assertV4(rows.filter((row) => row.strictAccepted).length === 60, "strict baseline count drifted");
assertV4(rows.filter((row) => row.hardenedAccepted).length === 61, "hardened accepted count drifted");
assertV4(rows.filter((row) => !row.hardenedAccepted).length === 2, "hardened negative preservation count drifted");
assertV4(rows.filter((row) => row.canonicalOrderingAppliedForValidation).length === 1, "ordering-only recovery count drifted");
assertV4(rows.every((row) => !row.candidateFieldsModified), "candidate field mutation detected");

const regression = {
  schemaVersion: "4.2.21.17.22-order-invariant-simplified-discovery-regression",
  protocolId: V42211722_PROTOCOL_ID,
  status: "order-invariant-discovery-validator-retired-regression-passed",
  calibrationOnly: true,
  AIOnly: true,
  sourceSummaries,
  rows,
  totals: {
    availableRawOutputs: rows.length,
    strictAccepted: rows.filter((row) => row.strictAccepted).length,
    strictRejected: rows.filter((row) => !row.strictAccepted).length,
    hardenedAccepted: rows.filter((row) => row.hardenedAccepted).length,
    hardenedRejected: rows.filter((row) => !row.hardenedAccepted).length,
    orderingOnlyRecoveries: rows.filter((row) => row.canonicalOrderingAppliedForValidation).length,
    preservedKnownNonOrderingRejections: rows.filter((row) => !row.hardenedAccepted).length,
  },
  positiveControl: {
    reversedRawArrayStrictlyRejected: !reversedStrict.accepted,
    reversedRawArrayHardenedAccepted: reversedHardened.accepted,
    canonicalOrderingAppliedForValidation: reversedHardened.validation.canonicalOrderingAppliedForValidation,
    compiledBundleCanonicallyIdentical: true,
  },
  negativeControls,
  invariants: {
    rawOutputsRewritten: false,
    candidateFieldsModified: false,
    modelAuthoredLocalTargetIds: false,
    targetTopologyDeferredToIndependentJudgment: true,
    compilerCanonicalizesChronology: true,
    allNonOrderingValidationRulesRetained: true,
  },
  cost: {
    modelContextsExecuted: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0,
  },
  authorization: {
    freshHeldOutManifestPreparation: true,
    freshHeldOutModelExecution: false,
    independentJudgmentPacketPreparation: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false,
  },
};

if (shouldWrite) {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(regression, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: regression.status,
  totals: regression.totals,
  positiveControl: regression.positiveControl,
  negativeControls: regression.negativeControls.map(({ name, rejected }) => ({ name, rejected })),
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
