#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = "scripts/validate-v29-development-pass.mjs";
const outputPath = "scripts/validate-v291-development-pass.mjs";
let source = await readFile(path.resolve(root, sourcePath), "utf8");
source = source
  .replaceAll("v2.9", "v2.9.1")
  .replaceAll("v29", "v291")
  .replaceAll("attempt-1", "attempt-2")
  .replace("BURDEN_ADJUSTMENTS, BURDEN_TIERS, DEFECT_TYPES, OBJECT_CHANGE_TYPES, SCOPE_RELATIONS,", "BURDEN_ADJUSTMENTS, BURDEN_TIERS, DEFECT_TYPES, SCOPE_RELATIONS,")
  .replace(', "exclusiveObjectSubstitution", "objectChangeType", "substitutionEvidence"', "")
  .replace(' && typeof annotation.exclusiveObjectSubstitution === "boolean"', "")
  .replace(/\n  if \(annotation\.exclusiveObjectSubstitution\)[\s\S]*?substitution defaults invalid`\);/, "")
  .replace("if (annotation.exclusiveObjectSubstitution || !annotation.originalTargetContact)", "if (!annotation.originalTargetContact)")
  .replace(/\n  exclusiveSubstitutions: pass\.annotations\.filter\(\(item\) => item\.exclusiveObjectSubstitution\)\.length,/, "")
  .replace("connectedExamples:3, exclusiveSubstitutions:3, componentContacts:20", "connectedExamples:3, componentContacts:20")
  .replace("originalTargetContacts:15", "originalTargetContacts:17")
  .replace("uniqueRationales:20", "uniqueRationales:22");
source = source
  .replaceAll("docs/calibration/v2.9.1/development/attempt-2", "docs/calibration/v2.9/development/attempt-2")
  .replace('pass.schemaVersion === "2.9-development-challenge-pass"', 'pass.schemaVersion === "2.9.1-development-challenge-pass"');
if (source.includes("exclusiveObjectSubstitution") || source.includes("OBJECT_CHANGE_TYPES")) throw new Error("exclusive-substitution code remained in generated validator");
await writeFile(path.resolve(root, outputPath), source);
console.log(JSON.stringify({ status: "written", sourcePath, outputPath }, null, 2));
