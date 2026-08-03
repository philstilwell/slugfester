#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const priorDirectory = "docs/calibration/v2.8/development/attempt-2";
const directory = "docs/calibration/v2.8/development/attempt-3";
const paths = {
  priorWorkflow: "docs/assessment-workflow-v2.8.1.md",
  workflow: "docs/assessment-workflow-v2.8.2.md",
  priorRubric: "docs/reassessment-rubric-v2.8.1.md",
  rubric: "docs/reassessment-rubric-v2.8.2.md",
  priorManual: `${priorDirectory}/annotation-manual.md`,
  manual: `${directory}/annotation-manual.md`,
  priorSchema: `${priorDirectory}/challenge-annotation-schema.json`,
  schema: `${directory}/challenge-annotation-schema.json`,
  priorInput: `${priorDirectory}/challenge-input.json`,
  input: `${directory}/challenge-input.json`,
  priorLedger: `${priorDirectory}/selection-ledger.json`,
  ledger: `${directory}/selection-ledger.json`,
  priorKey: `${priorDirectory}/challenge-key.json`,
  key: `${directory}/challenge-key.json`,
  keyLedger: `${directory}/key-carry-forward-ledger.md`,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = async (filePath) => readFile(path.resolve(root, filePath), "utf8");
const write = async (filePath, value) => writeFile(path.resolve(root, filePath), value);
const replaceVersion = (text) => text.replaceAll("v2.8.1", "v2.8.2").replaceAll("2.8.1", "2.8.2");

await mkdir(path.resolve(root, directory), { recursive: true });
const [priorWorkflow, priorRubric, priorManual, priorSchemaText, priorInputText, priorLedgerText, priorKeyText] = await Promise.all([
  read(paths.priorWorkflow), read(paths.priorRubric), read(paths.priorManual), read(paths.priorSchema),
  read(paths.priorInput), read(paths.priorLedger), read(paths.priorKey),
]);

const completionSection = `
## Non-degenerate challenge completion

The retired attempt-3 fixture set is intentionally known, before annotation, to contain at least three genuine instances of each rare feature needed for preflight. A pass is structurally incomplete unless its own annotations contain at least three object changes, three connected examples, twenty component contacts, six non-none diagnostic candidates, three derived diagnostic positives, three derived reframe positives, ten bridge contacts, and twenty unique case rationales. These are completion floors, not reliability thresholds and not permission to guess: every positive still requires exact evidence and must satisfy the semantic rule.

The validator calculates these counts without reading the hidden key and requires the pass audit to match. Repeated boilerplate or an all-default annotation is invalid. A read outside the five-file allowlist also invalidates the pass regardless of JSON validity.
`;
const workflowText = `${replaceVersion(priorWorkflow).trimEnd()}\n${completionSection}`;
const rubricText = `${replaceVersion(priorRubric).trimEnd()}\n${completionSection}`;
const manualText = `${replaceVersion(priorManual).trimEnd()}\n${completionSection}`;
await Promise.all([write(paths.workflow, workflowText), write(paths.rubric, rubricText), write(paths.manual, manualText)]);

const schema = JSON.parse(priorSchemaText);
schema.$id = "slugfester-v2.8.2-development-challenge-pass";
schema.properties.schemaVersion.const = "2.8.2-development-challenge-pass";
schema.properties.workflowVersion.const = "Slugfester Reassessment Workflow v2.8.2";
schema.properties.rubricVersion.const = "Slugfester Reassessment Rubric v2.8.2";
schema.properties.isolation.properties.method.enum = [
  "fresh-isolated-v2.8.2-development-challenge",
  "v2.8.1-independent-key-carried-forward-without-semantic-change",
];
schema.properties.audit.required.push("nonDefaultCounts");
schema.properties.audit.properties.nonDefaultCounts = {
  type: "object",
  additionalProperties: false,
  required: ["objectChanges", "connectedExamples", "componentContacts", "diagnosticCandidates", "diagnosticPositives", "reframePositives", "bridgeContacts", "uniqueRationales"],
  properties: Object.fromEntries(["objectChanges", "connectedExamples", "componentContacts", "diagnosticCandidates", "diagnosticPositives", "reframePositives", "bridgeContacts", "uniqueRationales"].map((name) => [name, { type: "integer", minimum: 0 }])),
};
const schemaText = `${JSON.stringify(schema, null, 2)}\n`;
await write(paths.schema, schemaText);

const input = JSON.parse(priorInputText);
input.schemaVersion = "2.8.2-development-challenge-input";
input.workflowVersion = "Slugfester Reassessment Workflow v2.8.2";
input.rubricVersion = "Slugfester Reassessment Rubric v2.8.2";
for (const challengeCase of input.cases) challengeCase.caseId = challengeCase.caseId.replace("v281-dev-", "v282-dev-");
const inputText = `${JSON.stringify(input, null, 2)}\n`;
await write(paths.input, inputText);

const ledger = JSON.parse(priorLedgerText);
ledger.schemaVersion = "2.8.2-development-selection-ledger";
ledger.createdAt = new Date().toISOString();
ledger.purpose = "Attempt-3 carry-forward of the pre-pass canonical fixture selection; semantic selection unchanged, completion validation strengthened.";
ledger.inputPath = paths.input;
ledger.inputSha256 = sha256(inputText);
const ledgerText = `${JSON.stringify(ledger, null, 2)}\n`;
await write(paths.ledger, ledgerText);

const sourceFiles = [paths.workflow, paths.rubric, paths.manual, paths.schema, paths.input];
const sourceTexts = await Promise.all(sourceFiles.map(read));
const key = JSON.parse(priorKeyText);
key.schemaVersion = "2.8.2-development-challenge-pass";
key.workflowVersion = "Slugfester Reassessment Workflow v2.8.2";
key.rubricVersion = "Slugfester Reassessment Rubric v2.8.2";
key.completedAt = new Date().toISOString();
key.isolation.method = "v2.8.1-independent-key-carried-forward-without-semantic-change";
key.isolation.allowedInputs = sourceFiles;
key.isolation.statement = "The independently readjudicated v2.8.1 semantic key was carried forward before blind passes because v2.8.2 changes only non-degenerate completion validation, not annotation semantics or fixture content.";
key.source = {
  inputPath: paths.input,
  inputSha256: sha256(sourceTexts[4]),
  workflowSha256: sha256(sourceTexts[0]),
  rubricSha256: sha256(sourceTexts[1]),
  manualSha256: sha256(sourceTexts[2]),
  schemaSha256: sha256(sourceTexts[3]),
};
for (const annotation of key.annotations) annotation.caseId = annotation.caseId.replace("v281-dev-", "v282-dev-");
const deriveDiagnostic = (annotation) => annotation.defectType !== "none" && annotation.defectObject !== null && annotation.impactMode === "inferential-consequence";
const deriveReframe = (annotation) => annotation.malformedDemandExplained && annotation.replacementDemandStated;
const nonDefaultCounts = (annotations) => ({
  objectChanges: annotations.filter((item) => item.targetObjectRelation === "changed").length,
  connectedExamples: annotations.filter((item) => item.mappingBasis === "connected-example").length,
  componentContacts: annotations.flatMap((item) => item.componentOperations).filter((item) => item.operation !== null).length,
  diagnosticCandidates: annotations.filter((item) => item.defectType !== "none").length,
  diagnosticPositives: annotations.filter(deriveDiagnostic).length,
  reframePositives: annotations.filter(deriveReframe).length,
  bridgeContacts: annotations.flatMap((item) => item.contactedBridges).length,
  uniqueRationales: new Set(annotations.map((item) => item.rationale.trim())).size,
});
key.audit.nonDefaultCounts = nonDefaultCounts(key.annotations);
const keyText = `${JSON.stringify(key, null, 2)}\n`;
await write(paths.key, keyText);
const keyLedgerText = `# v2.8.2 attempt-3 key carry-forward ledger

The semantic fixture content and annotation rules are unchanged from v2.8.1. v2.8.2 adds only validator-enforced non-degenerate completion floors and stricter read-isolation handling. Therefore the independently readjudicated v2.8.1 key annotations were carried forward before any attempt-3 blind pass, with case identifiers and source hashes updated mechanically.

- Prior key: \`${paths.priorKey}\`
- Prior key SHA-256: \`${sha256(priorKeyText)}\`
- Attempt-3 key: \`${paths.key}\`
- Fixture count: ${input.caseCount}
- Carried non-default counts: \`${JSON.stringify(key.audit.nonDefaultCounts)}\`

No semantic primitive, evidence span, component operation, diagnostic, impact, reframe, bridge contact, rationale, threshold, or fixture selection was changed.
`;
await write(paths.keyLedger, keyLedgerText);

const generatedScripts = [
  ["scripts/lib/v281-semantics.mjs", "scripts/lib/v282-semantics.mjs"],
  ["scripts/validate-v281-development-input.mjs", "scripts/validate-v282-development-input.mjs"],
  ["scripts/validate-v281-development-pass.mjs", "scripts/validate-v282-development-pass.mjs"],
  ["scripts/analyze-v281-development-challenge.mjs", "scripts/analyze-v282-development-challenge.mjs"],
  ["scripts/build-v281-challenge-manifest.mjs", "scripts/build-v282-challenge-manifest.mjs"],
  ["scripts/validate-v281-challenge-manifest.mjs", "scripts/validate-v282-challenge-manifest.mjs"],
];
for (const [priorPath, newPath] of generatedScripts) {
  let source = await read(priorPath);
  source = source.replaceAll("v281", "v282").replaceAll("v2.8.1", "v2.8.2").replaceAll("2.8.1", "2.8.2").replaceAll("attempt-2", "attempt-3");
  if (newPath.endsWith("validate-v282-development-pass.mjs")) {
    source = source.replace("canonicalBridges, deriveTargetDisposition", "canonicalBridges, deriveDiagnostic, deriveReframe, deriveTargetDisposition");
    source = source.replace('const expectedMethod = pass.pass === "KEY" ? "fresh-independent-v2.8.2-key-readjudication" : "fresh-isolated-v2.8.2-development-challenge";', 'const expectedMethod = pass.pass === "KEY" ? "v2.8.1-independent-key-carried-forward-without-semantic-change" : "fresh-isolated-v2.8.2-development-challenge";');
    source = source.replace('assert(seen.size === input.caseCount, "pass missing cases");', `assert(seen.size === input.caseCount, "pass missing cases");
const nonDefaultCounts = {
  objectChanges: pass.annotations.filter((item) => item.targetObjectRelation === "changed").length,
  connectedExamples: pass.annotations.filter((item) => item.mappingBasis === "connected-example").length,
  componentContacts: pass.annotations.flatMap((item) => item.componentOperations).filter((item) => item.operation !== null).length,
  diagnosticCandidates: pass.annotations.filter((item) => item.defectType !== "none").length,
  diagnosticPositives: pass.annotations.filter(deriveDiagnostic).length,
  reframePositives: pass.annotations.filter(deriveReframe).length,
  bridgeContacts: pass.annotations.flatMap((item) => item.contactedBridges).length,
  uniqueRationales: new Set(pass.annotations.map((item) => item.rationale.trim())).size,
};
const completionFloors = { objectChanges:3, connectedExamples:3, componentContacts:20, diagnosticCandidates:6, diagnosticPositives:3, reframePositives:3, bridgeContacts:10, uniqueRationales:20 };
for (const [name, floor] of Object.entries(completionFloors)) assert(nonDefaultCounts[name] >= floor, \`pass semantic completion failed: \${name} \${nonDefaultCounts[name]} < \${floor}\`);`);
    source = source.replace('["caseCount", "allCasesAnnotatedOnce", "componentSetErrors", "evidenceErrors", "diagnosticEligibilityErrors", "derivedFieldsPresent", "scoreFieldsPresent"]', '["caseCount", "allCasesAnnotatedOnce", "componentSetErrors", "evidenceErrors", "diagnosticEligibilityErrors", "derivedFieldsPresent", "scoreFieldsPresent", "nonDefaultCounts"]');
    source = source.replace('pass.audit.derivedFieldsPresent === false && pass.audit.scoreFieldsPresent === false', 'pass.audit.derivedFieldsPresent === false && pass.audit.scoreFieldsPresent === false && equal(pass.audit.nonDefaultCounts, nonDefaultCounts)');
  }
  if (newPath.endsWith("build-v282-challenge-manifest.mjs")) {
    source = source.replace('`${directory}/key-review-ledger.md`', '`${directory}/key-carry-forward-ledger.md`');
    source = source.replace('"scripts/build-v282-development-challenge.mjs"', '"scripts/build-v282-development-attempt.mjs"');
    source = source.replace('attempt: 2', 'attempt: 3');
  }
  if (newPath.endsWith("validate-v282-challenge-manifest.mjs")) source = source.replace('manifest.schemaVersion === "2.8.2-development-challenge-manifest"', 'manifest.schemaVersion === "2.8.2-development-challenge-manifest"');
  await write(newPath, source);
}

console.log(JSON.stringify({
  status: "written",
  attempt: 3,
  inputPath: paths.input,
  inputSha256: sha256(inputText),
  keyPath: paths.key,
  keySha256: sha256(keyText),
  caseCount: input.caseCount,
  nonDefaultCounts: key.audit.nonDefaultCounts,
  generatedScripts: generatedScripts.map(([, newPath]) => newPath),
}, null, 2));

