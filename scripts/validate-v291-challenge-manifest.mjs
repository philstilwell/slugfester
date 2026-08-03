#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { deriveDiagnostic, deriveReframe, equal } from "./lib/v291-semantics.mjs";
const root=process.cwd(),directory="docs/calibration/v2.9/development/attempt-2",manifestPath=`${directory}/challenge-manifest.json`,inputPath=`${directory}/challenge-input.json`,keyPath=`${directory}/challenge-key.json`;
const sha256=v=>createHash("sha256").update(v).digest("hex"),assert=(c,m)=>{if(!c)throw new Error(m)};
const [manifestText,inputText,keyText]=await Promise.all([readFile(path.resolve(root,manifestPath),"utf8"),readFile(path.resolve(root,inputPath),"utf8"),readFile(path.resolve(root,keyPath),"utf8")]);
const manifest=JSON.parse(manifestText),input=JSON.parse(inputText),key=JSON.parse(keyText);
assert(manifest.schemaVersion==="2.9.1-development-challenge-manifest"&&manifest.status==="frozen-before-blind-passes"&&manifest.calibrationOnly===true&&manifest.heldOutTranscriptsOpened===false&&manifest.numericalScoringAuthorized===false&&manifest.productionMutationAuthorized===false,"manifest stop state invalid");
assert(manifest.workflowVersion===input.workflowVersion&&manifest.rubricVersion===input.rubricVersion&&manifest.caseCount===input.caseCount&&equal(manifest.laneCounts,input.laneCounts),"manifest input identity invalid");
const expected={originalTargetContactExact:0.90,scopeExact:0.90,burdenAdjustmentExact:0.90,componentContactMicroExact:0.90,coverageExact:0.85,coverageKappa:0.75,defectTypeExact:0.85,consequenceExact:0.90,diagnosticExact:0.90,reframeExact:0.90,burdenRelevanceExact:0.85,burdenRelevanceKappa:0.75,exactDerivedTupleExact:0.75,diagnosticPositiveRecall:0.80,reframePositiveRecall:0.80};
assert(equal(manifest.thresholds,expected),"manifest thresholds changed");
const counts={diagnosticPositive:key.annotations.filter(deriveDiagnostic).length,diagnosticNegative:key.annotations.filter(x=>!deriveDiagnostic(x)).length,reframePositive:key.annotations.filter(deriveReframe).length,reframeNegative:key.annotations.filter(x=>!deriveReframe(x)).length};
assert(equal(counts,manifest.keyFeatureCounts)&&counts.diagnosticPositive>=3&&counts.diagnosticNegative>=3&&counts.reframePositive>=3&&counts.reframeNegative>=3,"key feature counts invalid");
assert(manifest.passIsolation.allowedInputs.length===6&&!manifest.passIsolation.allowedInputs.includes(keyPath),"pass allowlist invalid");
for(const [file,hash] of Object.entries(manifest.sourceHashes)){const text=await readFile(path.resolve(root,file),"utf8");assert(sha256(text)===hash,`frozen source changed: ${file}`)}
assert(manifest.sourceHashes[inputPath]===sha256(inputText)&&manifest.sourceHashes[keyPath]===sha256(keyText),"input/key hash invalid");
console.log(JSON.stringify({status:"passed",kind:"v2.9.1-challenge-manifest",caseCount:manifest.caseCount,keyFeatureCounts:counts,sourceCount:Object.keys(manifest.sourceHashes).length,manifestSha256:sha256(manifestText)},null,2));

