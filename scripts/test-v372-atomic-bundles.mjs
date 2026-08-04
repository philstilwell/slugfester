#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditCoverage, compileBundle, assert, V372_ROOT, V372_SPEC_PATH } from "./lib/v372-atomic-bundles.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), spec = JSON.parse(await readFile(path.resolve(root, V372_SPEC_PATH), "utf8"));
const fixtures = [
  { id: "target-any-contact", bundle: { bundleId: "f1", debateNumber: "x", family: "target", caseId: "x", compiler: "target-components", inputs: [{ fieldId: "component.c1.contactMode", auditId: "a" }], fixedFields: { relevantContraryCandidatePresent: true }, witnesses: [{ fieldId: "contrary.classification", auditId: "w", derivedFieldId: "contrary.classification" }] }, values: [["a", "distinction"], ["w", "component-contact-precludes-contrary"]], valid: true },
  { id: "target-no-contact", bundle: { bundleId: "f2", debateNumber: "x", family: "target", caseId: "x", compiler: "target-components", inputs: [{ fieldId: "component.c1.contactMode", auditId: "a" }], fixedFields: { relevantContraryCandidatePresent: true }, witnesses: [{ fieldId: "contrary.classification", auditId: "w", derivedFieldId: "contrary.classification" }] }, values: [["a", "none"], ["w", "relevant-no-component"]], valid: true },
  { id: "target-witness-mismatch", bundle: { bundleId: "f3", debateNumber: "x", family: "target", caseId: "x", compiler: "target-components", inputs: [{ fieldId: "component.c1.contactMode", auditId: "a" }], fixedFields: { relevantContraryCandidatePresent: true }, witnesses: [{ fieldId: "contrary.classification", auditId: "w", derivedFieldId: "contrary.classification" }] }, values: [["a", "none"], ["w", "component-contact-precludes-contrary"]], valid: false },
  { id: "reframe-dual-positive", bundle: { bundleId: "f4", debateNumber: "x", family: "reframe", caseId: "x", compiler: "reframe", inputs: [{ fieldId: "malformedDemand.explained", auditId: "a" }, { fieldId: "replacementDemand.stated", auditId: "b" }, { fieldId: "relationKind", auditId: "c" }], fixedFields: {}, witnesses: [] }, values: [["a", true], ["b", true], ["c", "contrastive"]], valid: true },
  { id: "reframe-missing-relation", bundle: { bundleId: "f5", debateNumber: "x", family: "reframe", caseId: "x", compiler: "reframe", inputs: [{ fieldId: "malformedDemand.explained", auditId: "a" }, { fieldId: "replacementDemand.stated", auditId: "b" }, { fieldId: "relationKind", auditId: "c" }], fixedFields: {}, witnesses: [] }, values: [["a", true], ["b", true], ["c", "none"]], valid: false },
  { id: "reframe-single-cue", bundle: { bundleId: "f6", debateNumber: "x", family: "reframe", caseId: "x", compiler: "reframe", inputs: [{ fieldId: "malformedDemand.explained", auditId: "a" }, { fieldId: "replacementDemand.stated", auditId: "b" }, { fieldId: "relationKind", auditId: "c" }], fixedFields: {}, witnesses: [] }, values: [["a", true], ["b", false], ["c", "none"]], valid: true },
  { id: "diagnostic-linked", bundle: { bundleId: "f7", debateNumber: "x", family: "diagnostic", caseId: "x", compiler: "diagnostic-linked-consequence", inputs: [{ fieldId: "defect.type", auditId: "a" }, { fieldId: "consequence.relationKind", auditId: "b" }], fixedFields: { consequenceStated: true }, witnesses: [] }, values: [["a", "scope-mismatch"], ["b", "explicit-negation"]], valid: true },
  { id: "diagnostic-linked-inactive", bundle: { bundleId: "f8", debateNumber: "x", family: "diagnostic", caseId: "x", compiler: "diagnostic-linked-consequence", inputs: [{ fieldId: "defect.type", auditId: "a" }, { fieldId: "consequence.relationKind", auditId: "b" }], fixedFields: { consequenceStated: true }, witnesses: [] }, values: [["a", "scope-mismatch"], ["b", "none"]], valid: false }
];
const results = fixtures.map((fixture) => {
  const compiled = compileBundle(fixture.bundle, new Map(fixture.values), fixture.id);
  assert(compiled.valid === fixture.valid, `${fixture.id}: validity mismatch`);
  return { id: fixture.id, expectedValid: fixture.valid, actualValid: compiled.valid, issues: compiled.issues };
});
const coverage = auditCoverage(spec);
assert(spec.bundleCount === 8 && spec.auditFieldCount === 14 && spec.independentScalarCount === 12 && spec.derivedWitnessCount === 2, "spec counts invalid");
assert(coverage.all.length === 14 && coverage.unique === 14 && coverage.duplicates.length === 0, "spec audit coverage invalid");
assert(coverage.independent.length === 12 && coverage.witnesses.length === 2, "independent/witness split invalid");
const output = { schemaVersion: "3.7.2-compiler-fixtures", passed: true, fixtureCount: results.length, bundleSpecCoverage: { bundles: spec.bundles.length, auditFields: coverage.all.length, independentScalars: coverage.independent.length, derivedWitnesses: coverage.witnesses.length }, modelContextsExecuted: 0, discretionaryRepairs: 0, results };
const text = `${JSON.stringify(output, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, `${V372_ROOT}/compiler-fixtures.json`), text);
console.log(text);
