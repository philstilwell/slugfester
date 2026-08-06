#!/usr/bin/env node
import { runIsolatedPrimaryGate } from "./lib/run-isolated-primary-gate.mjs";
import { V4220_ROOT, compileV4220PrimaryOutput, validateV4220SourceLedger } from "./lib/v4220-source-span-rendering.mjs";

await runIsolatedPrimaryGate({
  root: V4220_ROOT,
  manifestStatus: "frozen-three-source-span-primary-contexts-authorized",
  executionSchemaVersion: "4.2.20.1-source-span-primary-model-execution",
  passedStatus: "three-source-span-primary-contexts-passed",
  failedStatus: "three-source-span-primary-contexts-failed",
  logTag: "v4.2.20.1-primary",
  validateScript: "scripts/validate-v4220-primary-output.mjs",
  validateSourceLedger: validateV4220SourceLedger,
  compilePrimaryOutput: compileV4220PrimaryOutput,
  promptForContext: (context) => `Read rubric-base.md, rubric-derived.md, rubric-bounded.md, manual.md, packet.json, schema.json, and every line of source-ledger.jsonl; read nothing else. Act only as the isolated v4.2.20.1 primary judge for fresh Debate ${context.debateNumber}. The rubrics define semantic standards; manual.md and schema.json exclusively allocate model and repository fields. Emit one source-chronological move inventory. For every reply, verify that every named target is an already emitted earlier move; never anticipate a later target. Supply only inclusive source-event spans, never an evidence cue, excerpt, quotation, or milliseconds. Never emit a response class, absolute responsiveness rating, scores, a winner, tags, Overall Commentary, AI Extension material, or publication prose. Silently verify all schema and rubric rules. Return exactly one schema-conforming JSON object.`
});
