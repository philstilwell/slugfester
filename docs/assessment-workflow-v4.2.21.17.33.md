# Slugfester Hard-Route Publication Transport Repair v4.2.21.17.33

## Purpose

This revision repairs only the structured-output transport defect observed in the frozen v4.2.21.17.32 publication gate. The v17.32 authoring contract, evidence packets, deterministic content validator, score lock, isolation boundary, five-debate sample, model, reasoning effort, ramp, concurrency, timing thresholds, and no-retry rule remain unchanged.

## Observed failure

The first ramp context was rejected before inference because the response schema used `uniqueItems`, which the active OpenAI structured-output transport does not permit. Debate 51 produced no model output; Debates 63, 90, 153, and 165 were not attempted. The v17.32 execution and analysis artifacts remain immutable failure evidence.

## Repair

1. Remove `uniqueItems` from the transport schemas only.
2. Continue to enforce uniqueness in the repository validator. In particular, every AI Extension novelty mapping must contain distinct move IDs, and every AI Extension item ID must be unique within its side.
3. Run a deterministic structured-output-subset preflight over every repaired schema before an execution manifest can be frozen.
4. Classify an `invalid_json_schema` response as `schema-rejected`, not `result-missing`.
5. Use new output paths so no v17.32 artifact is overwritten or treated as a retry.

## Gate policy

The repaired gate is a new, preregistered calibration gate rather than a retry or correction context. It retains one attempt per debate, a one-context ramp, a maximum concurrency of two after the ramp, and zero correction prompts. Scores remain repository-owned and absent from model-writable fields.

