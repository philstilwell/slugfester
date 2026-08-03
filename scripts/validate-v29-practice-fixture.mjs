#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const filePath = "docs/calibration/v2.9/development/attempt-1/practice-fixture.json";
const fixture = JSON.parse(await readFile(path.resolve(process.cwd(), filePath), "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(fixture.schemaVersion === "2.9-practice-fixture" && fixture.calibrationOnly === true, "practice identity invalid");
assert(fixture.examples.length === 4 && new Set(fixture.examples.map((item) => item.id)).size === 4, "practice examples invalid");
const byId = new Map(fixture.examples.map((item) => [item.id, item.expected]));
assert(byId.get("practice-diagnostic").diagnostic === true && byId.get("practice-diagnostic").consequenceStated === true, "diagnostic contrast invalid");
assert(byId.get("practice-reframe").reframe === true && byId.get("practice-reframe").burdenAdjustment === "replaced", "reframe contrast invalid");
assert(byId.get("practice-connected-example").originalTargetContact === true && byId.get("practice-connected-example").connectedExample === true && byId.get("practice-connected-example").exclusiveObjectSubstitution === false, "connected-example contrast invalid");
assert(byId.get("practice-exclusive-substitution").originalTargetContact === false && byId.get("practice-exclusive-substitution").exclusiveObjectSubstitution === true && byId.get("practice-exclusive-substitution").objectChangeType === "question-type", "substitution contrast invalid");
console.log(JSON.stringify({ status: "passed", kind: "v2.9-practice-fixture", exampleCount: fixture.examples.length }, null, 2));

