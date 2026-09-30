# Maintained runner

Run from the SLUGFESTER checkout. The runner is local, uses existing repository calculators/validators, and makes no model or paid calls. It does not choose ratings, approve its own prose, retry failures, publish to GitHub, or replace semantic review.

```bash
node scripts/standalone-workflow.mjs help
node scripts/standalone-workflow.mjs status --debate NNN
```

Use the registry as the identity/path authority. `status` reports existing artifacts and unfinished timing intervals; presence alone is not validation. Writes to a `published-and-frozen` assessment are refused. Inspect and authenticate completed work, then continue its next permitted phase.

## 1. Prepare inputs once

First freeze the phase's contract and checker from the current repository schema. Source and packet preparation remains subject to [source controls](source-assessment.md) and [publication controls](publication-review.md). This is setup, not a new assessment context. Do not copy debate-specific source statements, counts, exclusions, or overrides into a shared tool.

The runner recognizes these phase folders and checker interfaces:

| Phase | Required phase inputs, in addition to full indexed transcript and source restrictions | Checker |
|---|---|---|
| `inventory` | `inventory/contract.md` | `inventory/check-inventory.mjs --debate NNN` |
| `primary` | judgment contract/packet, inventory, current rubric | `judgments/check-judgment.mjs pass-a\|pass-b --debate NNN` |
| `adjudication` | adjudication contract/packet, inventory, audio verification, rubric | `adjudication/check-adjudication.mjs --debate NNN` |
| `publication` | publication contract/build packet/skeleton, inventory, final ledger, scores, reference metrics | `publication/check-publication.mjs --debate NNN` |
| `rhetorical` | tag contract/source packet/catalog | `publication/rhetorical-tag-review-1/check-review.mjs --debate NNN --packet PATH` |
| `rhetorical-adjudication` | tag contract/source packet/catalog and anonymous candidate-union packet | Same tag checker with adjudication packet |

Tag per-pass packet files must already define their expected publication-order move IDs. Their checker reads these as pinned tool inputs. Do not expose either blind output to the other reviewer. Contracts contain the output schema and full semantic obligations; checker implementation is executable tool input, not required reading.

```bash
node scripts/standalone-workflow.mjs prepare --debate NNN --phase primary --dry-run
node scripts/standalone-workflow.mjs prepare --debate NNN --phase primary
```

`prepare` creates a lossless packet and readable companion under the debate's `workflow/PHASE/`, and disjoint execution plans in the ordinary worker folders. Primary passes receive identical evidence. Existing plans/submissions are never overwritten. Shared blocks are exact repeated values, not summaries; the runner reconstructs every source document and checks equality. Both the original files and packed files are hash-pinned. Reading must cover all documents and all shared blocks. Byte savings are measured rather than assumed.

For each fresh worker, provide its execution plan, model/effort from the frozen manifest, and permission to run only the pinned reading/checking tools. Use `fork_turns="none"`. The two primary contexts and later two tag contexts run concurrently; adjudicators remain fresh and receive only their permitted packets.

```bash
node scripts/standalone-workflow.mjs read --debate NNN --plan PLAN --start 1 --count 120
node scripts/standalone-workflow.mjs authenticate --debate NNN --plan PLAN --session SESSION --agent AGENT --stage reading --output READING_RELEASE
```

The authenticator verifies the actual model/effort, input hashes, and complete untruncated tool-visible reading from the local session. The controller still inspects tool access for isolation; a content hash is not proof that the model understood the evidence. Raw session files remain local and uncommitted. Never present protocol isolation as an operating-system sandbox.

## 2. Hold, review, then save exact bytes

The reviewer creates the actual candidate in memory and sends its exact UTF-8 JSON bytes through stdin to:

```bash
node scripts/standalone-workflow.mjs handoff hold --debate NNN --plan PLAN
```

Do not create an unapproved candidate file to supply stdin. Use the worker's existing in-memory value and a subprocess input argument. The handoff checks the candidate, keeps it only in memory, and prints a hash/size receipt. A private local socket allows bounded controller inspection:

```bash
node scripts/standalone-workflow.mjs handoff read --debate NNN --plan PLAN --start 0 --count 16000
node scripts/standalone-workflow.mjs handoff status --debate NNN --plan PLAN
```

After reviewing the complete candidate against source, exclusions, and the applicable prose/definition contract, the controller writes a durable release with:

```json
{
  "status": "approved-first-submission",
  "candidateSha256": "the held candidate hash",
  "plan": {"path": "repository-relative plan", "sha256": "exact hash", "bytes": 123},
  "readingEvidence": {"path": "authenticated reading release", "sha256": "exact hash", "bytes": 123},
  "sourceEditorialReview": {"status": "passed", "notes": "Actual source-specific review findings and qualifications."}
}
```

```bash
node scripts/standalone-workflow.mjs handoff release --debate NNN --plan PLAN --approval RELEASE --sha256 HASH
node scripts/standalone-workflow.mjs authenticate --debate NNN --plan PLAN --session SESSION --agent AGENT --stage complete --output EXECUTION
```

The controller owns the release; the worker cannot self-approve. The writer rechecks pinned evidence, tools, authenticated reading and the approved hash, then creates the output once without overwriting or altering whitespace. It preserves a handoff receipt beside the output. An interruption loses the in-memory candidate and preserves diagnostic status; do not silently start another context or delete the attempt record. A failed semantic review is not permission to save the candidate. Continue the same authorized unsaved context only within its existing limits, preserving diagnostics and using an explicitly reviewed handoff recovery if needed.

For interruption recovery, inspect both status commands and retain the metadata, frozen plan, source hashes, and session evidence. `interrupted-unsaved` means no submission was made by that holder; `unreachable-held-candidate` requires checking whether the process still exists before concluding its memory was lost. If the same authorized worker still retains the exact candidate, the controller can authorize a documented transport-only recovery after verifying its hash and unchanged inputs. Preserve the original metadata under an immutable recovery record before retiring its runtime address; never delete it to reset an attempt. If the candidate/context is lost or an output already exists, follow the existing attempt/replacement rules and obtain new authority where required. The runner intentionally has no automatic restart command.

## 3. Existing deterministic stages

The `mechanical` command also replaces recurring helper construction: `inventory` freezes reviewed inventory parts, `publication-skeleton` builds structure from locked scores, `source-eligibility` verifies the resolved ledger against the already completed source reviews, `rhetorical-packets` extracts blind evidence or the anonymous union, `tags` applies authenticated decisions, and `integrate` appends the validated publication. Use `--check-only` to verify an existing fixture without changing it. Each maintained tool derives current identity from the registry and preserves its original gate requirements.

Inventory requires `--input PATH --approved-sha HASH`, where the hash is SHA-256 of `JSON.stringify` of the approved parsed parts. The memory-handoff byte hash remains separate. Skeleton preparation requires `--date YYYY-MM-DD --source-note-file PATH`; keep the reviewed note in a file instead of interpolating prose into a shell command. Rhetorical packet preparation requires `--phase blind` or `--phase adjudication`; then run `prepare` to make the corresponding compact reviewer plans. Inspect `mechanical` output and its existing audit records before proceeding.

```bash
node scripts/standalone-workflow.mjs stage --debate NNN --stage judgment-packet
node scripts/standalone-workflow.mjs stage --debate NNN --stage disagreements
node scripts/standalone-workflow.mjs stage --debate NNN --stage assemble-ledger
node scripts/standalone-workflow.mjs stage --debate NNN --stage score-once
node scripts/standalone-workflow.mjs stage --debate NNN --stage build-adapter
```

Each invokes the existing registry-driven repository stage, records its command/result/log and elapsed time, and refuses a duplicate attempt. Respect dependencies: reviewed inventory before judgments, both authenticated judgments before disputes, required audio plus adjudication before ledger, source-eligibility review before the sole score call, and fully reviewed publication before adapter. The runner does not infer that a semantic gate passed from the existence of a file. For frozen records, call the existing read-only `audit-assessment-production-standalone-v1.mjs --audit --debate NNN --repository-only` directly.

## 4. One local/live publication check

After integration and page generation, before the first publication commit:

```bash
node scripts/standalone-workflow.mjs graph --debate NNN
npm run site:standalone:check
node scripts/standalone-workflow.mjs browser --debate NNN --origin http://127.0.0.1:PORT --output .assessment-cache/local-replay.js
```

Use the Playwright skill to run that generated adapter through its CLI. The adapter contains the maintained replay with registry-derived configuration, not copied debate constants. It checks every applicable scope notice with JavaScript off before checking the interactive assessment, exact scores/cards/quotes/timestamps/tags/AI text, pointer and keyboard controls, mobile distant-control behavior, profiles, discovery routes, sitemap, and every graph bucket. Graph inputs are published section-side values, retaining duplicates; no score calculation is invoked. Screenshots are saved under `output/playwright` for direct review and hashed preservation.

After the required deployment gates pass, generate the same adapter with the live origin and a distinct output/prefix. Close owned browsers/servers and retire generated adapters. Keep reusable repository tools and required evidence. All remaining release gates are in [validation-release.md](validation-release.md).

## 5. Measure work and waiting

```bash
node scripts/standalone-workflow.mjs time --debate NNN --stage judgments --kind active --event start --id primary-a
node scripts/standalone-workflow.mjs time --debate NNN --stage judgments --kind active --event stop --id primary-a
```

Use unique IDs for concurrent workers and each active/wait/repair interval. Record actual work boundaries, mark waiting for user input or deployment as `wait`, and record recovery work as `repair`. Deterministic stages time themselves. `status` reports overlap-aware elapsed time and summed worker activity separately, flags unfinished intervals, and leaves untracked time unattributed. Do not add parallel durations and report the sum as wall time. Do not time an entire phase as active if it includes an approval wait.

`trackedWallMs` is the union of recorded intervals, `summedWorkMs` sums active and repair work only, `waitingWallMs` is elapsed waiting, and `summedIntervalMs` includes all intervals including waits. Per-stage/per-kind details retain concurrent worker effort.

For new work, use focused checks during editing. Full checks remain mandatory at their specified publication boundaries; no cached result substitutes for committed-package replay or required online checks. Repeat a passed check when relevant inputs change or a required boundary calls for a fresh execution, not simply because another routine step completed.
