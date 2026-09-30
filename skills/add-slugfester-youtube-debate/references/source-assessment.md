# Source and assessment

Read for intake, inventory, independent judgment, adjudication, or scoring. Repository controls and frozen run settings remain authoritative.

## 1. Repository and debate identity

1. Distinguish a new run from a resumed one before changing branches or files. For a new run, fetch `origin`, confirm the workspace is clean, switch to `main` if safe, and require equality among local `HEAD`, local `main`, and `origin/main`; create a dedicated topic branch before the first write. For a resumed run, use the preservation checks below instead.
2. Canonicalize the supplied YouTube URL to its video ID. Ignore time fragments and other tracking parameters for identity.
3. Search debate data, production ledgers, standalone records, URLs, video IDs, slugs, and speaker/motion metadata for a duplicate. An already-published duplicate is a successful no-op, not permission to rescore. An authorized unfinished run resumes its existing record; it is not a new addition.
4. Establish the public title, event year, neutral central question, speakers, and each side's relation to that question. Use the exact same question in authorization, inventory, publication, and production; add a validator that compares all four values byte-for-byte. Never expand it into a stronger affirmative proposition during publication. `pro` affirms the frozen question; `con` denies or criticizes it. Stop if the mapping remains genuinely ambiguous.
5. Ordinarily confirm exactly one substantive speaker per side. Moderator logistics are permitted; a moderator who advances arguments is a third participant unless the repository's primary-speaker scope exception is fully satisfied and frozen before judgment.
   - The source must be explicitly organized around exactly two named primary opponents who alone carry the central motion burdens; a team, panel, roundtable, third side, or recurring co-advocate remains ineligible.
   - Enumerate every substantive non-primary intervention and every directly dependent primary-speaker response as exact source intervals. The combined substantive non-primary duration must be no more than 5% of the assessed window.
   - Establish that each non-primary argument merely duplicates or prompts a line independently developed by a primary speaker and introduces no unique load-bearing motion argument. Uncertainty fails the exception.
   - Freeze a `primarySpeakerScopeAudit` before judgment, use the dedicated registry validation profile, exclude the enumerated material from moves, response links, quotations, and judgment evidence, and disclose the exclusion in the published source note. Neither primary side may receive credit or penalty for excluded material.
6. Derive the next sequential debate number from the validated repository ordering. Use the repository's current padding rule. Create a stable unique slug and a concise speaker-free label.
7. Use the assessment and rendering date for the debate's `date` field. Keep the original event year in the title, slug, and appropriate metadata.
8. Add the debate to the standalone registry immediately after authorization. Treat that record's debate number, root, video ID, validation profile, and ledger path as the only routing authority for reusable tooling. Assign accepted older records an explicit frozen legacy profile; use the current semantic, balance-aware profile for new records.

### Resume without rebuilding

Identify the existing run from its registry entry, authorization, working-copy root, branch, and execution records. Inspect tracked and untracked changes; authenticate completed artifacts and record the last valid phase, consumed attempts, explicit exceptions, costs, and next permitted step. Continue from those artifacts rather than reacquiring valid evidence or repeating completed judgments or scoring. A new chat, refreshed skill, interrupted command, or missing remote-tracking reference does not reset an attempt allowance.

Preserve current work; do not reset, stash, clean, or overwrite it to make the checkout appear new. If still on `main`, create the run's dedicated topic branch carrying its changes. Reuse an existing topic branch only after establishing that it belongs to this run. Fetch for comparison, but do not demand that a valid in-progress topic branch equal current `main`. Reconcile unrelated upstream changes without altering frozen assessment substance; stop for a material identity conflict, unexplained hash change, or exhausted attempt requiring new authority. Do not silently renumber a frozen run or replace its model, scoring controls, or accepted results.

## 2. Complete source acquisition

Prefer the repository's local caption acquisition path:

```bash
node scripts/acquire-youtube-captions.mjs "YOUTUBE_URL"
```

Require the cached transcript, timestamped events, and manifest under `.assessment-cache/captions/<videoId>/`. Validate video identity, language, duration, event ordering, event count, nonempty text, and all recorded hashes. Permit only light deterministic normalization that preserves words and timestamps.

Do not infer completeness merely because the chosen track is human-authored, nonempty, or internally valid. Compare its first timestamp, maximum event end, and material gaps with the source duration and the substantive debate window. When coverage is materially partial, enumerate the source's language-matching tracks and select the one that actually covers the full exchange, even if that means preferring an auto-generated track over an incomplete human track. Preserve the rejected partial acquisition separately when it matters to provenance, then rebuild and hash-lock the canonical cache from the complete track. Reach paid transcription only after the available public tracks have been exhausted.

If complete usable captions are unavailable:

1. Load the `transcribe` skill.
2. Obtain the current authorized transcription rate from an authoritative local or official OpenAI source.
3. Freeze the full-media and required-clip estimate, including the cost already incurred for this debate.
4. Report that estimate before the first paid call and proceed automatically only when the cumulative maximum is no more than $1.00.
5. Use one paid attempt per frozen media input or audio-verification clip and no paid retries unless the user grants a debate-specific exception.
6. Normalize a successful result with the repository's current transcript-normalization tool, presently `scripts/normalize-openai-diarized-transcript.mjs` where applicable.

Raw media and transcript cache may remain ignored. Commit durable provenance: canonical video ID and URL, acquisition method, hashes, duration, event and word counts, timestamp coverage, speaker-attribution basis, and bounded representative excerpts allowed by repository policy.

## 3. Standalone evidence package

Never assign a batch number or create Batch 18. Follow the newest accepted standalone post-campaign precedent. If the repository has no standalone structure yet, create the smallest reusable structure under:

```text
docs/assessment-production/standalone-debates-v1/
  registry.json
  debate-NNN/
    authorization.json
    manifest.json
    source/
    inventory/
    judgments/pass-a/
    judgments/pass-b/
    disagreements/
    audio/
    adjudication/
    final-ledger/
    score-pass/
    publication/
    rendering/
    validation-summary.json
    report.md
```

Before model work, freeze an authorization record and manifest covering the URL, video ID, source hashes, rubric and workflow hashes, score policy and code hashes, exact model settings, cost cap, allowed paths, one-score-pass rule, repair limits, repository baseline, and expected artifacts. Hash-lock completed gates as the workflow progresses.

When the primary-speaker scope exception is used, additionally hash-lock the repository's active exception amendment, name the dedicated validation profile in the registry, and carry the identical assessed window and exclusion intervals through authorization, source lock, inventory, publication, production ledger, and final audit.

### Output location and submission boundary

For new runs, use the maintained runner described in [single-debate-runbook.md](single-debate-runbook.md). Its lossless reader packet replaces duplicated reviewer files; tools remain hash-pinned but their source is not mandatory reading. Preserve an already frozen run’s original input and transport contract. Use the memory handoff for new plans: the controller reviews the candidate through bounded reads, then authorizes one exact-byte save. The semantic review and attempt boundary below remain unchanged.

Resolve the actual working-copy root and every worker's allowed output path to absolute paths before dispatch. Require the worker to confirm those destinations before writing; a shell command's working directory does not establish the file-editing tool's base directory. Keep isolated reviewers' outputs disjoint. If a destination already exists, authenticate it and stop rather than overwriting it or treating it as a fresh attempt.

Absolute destinations are execution instructions, not portable evidence references. For repository files recorded in manifests, aggregate audits, adapters, and registry evidence, use repository-relative paths with `/` separators. Verify containment within the intended repository and resolve each reference from that root to check its exact hash and byte count before freezing. Keep absolute allowed-output bindings distinct; do not globally rewrite paths in frozen worker plans or historical records. If a derived record is wrong, preserve its original bytes and correct only the permitted metadata and dependent references under the existing recovery rules.

For publication and repair work, supply a deterministic checker derived from the active contract and the exact allowed leaf fields. Within the already authorized attempt, check the candidate in memory or through standard input before its first saved submission: schema, identity, counts and order, word and character limits, required labels, permitted fields, and preservation of all frozen content. Use the same counting rules as the production validator. A checker or transport fault is not authority for another model attempt, and calling a saved result a draft does not exempt it from attempt accounting.

Before that first save, the publication worker must also review the complete candidate against the editorial requirements in Section 5, and the controller must inspect the unsaved prose for source fidelity, complete sentences, specific strengths and limitations, preserved burdens, and nonformulaic AI reasoning. Do not assemble prose by truncating judgment fragments, pad a passage to pass a counter, or substitute identical novelty explanations. Review the affected leaves and surrounding context for a bounded repair; recheck the full assembled candidate's invariants. A mechanical pass does not release a semantically defective candidate for submission.

Only after both checks pass, write the declared output once and stop authoring. The controller must independently validate the saved content, authenticate that it is the inspected candidate, and preserve its exact first-submission bytes and hashes before assembly. Unsaved review belongs to the already authorized context and attempt; it does not authorize a fresh model context, recursive retries, broader writable fields, or revision of judgment substance. Workers must not update submitted files after seeing validation feedback or sending their final message. Preserve any rejected saved output and diagnostics; use only the remaining authorized repair allowance, with new output paths and at most two declared leaf fields per repair shard. A later unauthorized revision must not replace the preserved first submission. These checks neither change the scoring mechanism nor grant additional attempts.

### Controller-reuse preflight

Treat a copied or recovered controller as untrusted scaffolding until it passes a current-debate identity sweep. Before executing any phase, search the controller's executable text and configuration for the prior debate's number, padded number, slug, video ID, title, motion, speakers, side labels, source timestamps, artifact roots, ledger path, expected section/move/dispute/tag counts, schema cardinalities, and manual override IDs or decisions. Also search for current-debate values and require each identity-bearing field to have exactly one explainable source of truth. A changed output directory is not enough: any stale executable value is a blocking failure.

Derive identities, paths, move IDs, and collection counts from the current standalone registry and already frozen artifacts wherever the phase permits. When a value must remain literal, assert it against those current artifacts before the first write. After each phase, recompute output identity and counts independently and reject any mismatch rather than repairing downstream files around it. Preserve a failed recovered controller and its diagnostic when repository controls require failure evidence; never treat its output as current-debate evidence.

Prefer existing repository validators, file-record helpers, and verified generic browser checks over new one-off replacements. Before a new or adapted helper operates on frozen records, test the interfaces it uses on disposable fixtures: path resolution, callback arguments, or output capture as applicable. Portable-reference checks must reject absolute and out-of-root artifact references. For browser assertions, inspect the actual rendered structure: a separately displayed year badge is not part of the title's plain text. Reuse the same verified assertions locally and live with the origin parameterized; do not relax a production requirement to repair a mistaken checker.

For rhetorical review specifically, initialize all controller-level acceptance, rejection, relabeling, and context overrides to empty. A later deterministic correction must be introduced only after the two current blind passes and current anonymous adjudication exist; it may reference only move IDs in the current locked inventory, must quote the exact applicable local catalog definition, and must appear in the final authenticated rhetorical audit. Reject any copied override, even one that happens to reference a syntactically valid current path.

## 4. Score-blind assessment

1. Inventory the entire source before judging it. Freeze substantive moves, speaker, side, timestamps, exact source spans, section assignments, reply links, inferential bridges, importance, and rubric weights.
   - Under the primary-speaker scope exception, include `primarySpeakerScopeAudit` with the assessed window, every excluded substantive host interval, every excluded response-to-host interval, duration totals, the derived percentage, duplication and burden-impact rationales, and a mechanical intersection audit. The controller must independently recompute interval durations and prove that every selected move and quotation lies outside every excluded interval before either primary judgment runs.
   - When cross-talk prevents reliable word-level turn boundaries, conservatively treat the complete continuous host-led exchange as the host interval and count all of it toward the 5% ceiling. Still enumerate directly dependent primary replies separately, permit those reply intervals to overlap the conservative host interval, and compute total excluded duration as the interval union so overlapping time is not double-counted.
   - Make each move's source span the smallest contiguous passage that states the claim and its load-bearing reason or inference. Do not copy broad transcript neighborhoods into every move merely because the complete source was reviewed. Apply the current transport ceiling mechanically, and require a source-specific rationale when a genuinely complete argument needs a longer span.
   - Give every section a unique descriptive semantic ID before locking it; generic IDs such as `s1` are not publication-ready. Validate uniqueness and the lowercase-slug syntax `[a-z0-9]+(?:-[a-z0-9]+)*` in both the inventory and production record.
   - Add a `selectionBalanceAudit` object to the inventory. Record total selected-move counts by side and counts by side within every section. When the total difference is at least three or any section's side-count difference is at least two, record a source-based rationale identifying why every asymmetric move is load-bearing. Validate the counts, threshold, and required rationale before locking the inventory. Do not manufacture symmetry or omit a material move.
   - Run a deterministic publication-capacity gate before launching either primary judgment. Independently derive total and per-section side counts from the move array; never trust the worker's stated count or `withinCapacity` flag without recomputation. Require exact equality between derived counts and both audit objects. Each section must contain no more than four selected moves per side, and every section reaching four on either side must carry the frozen fourth-row authorization required below.
   - If a section exceeds capacity or any reported count is wrong, preserve the complete invalid inventory and validator failure. While still score-blind, prefer a semantic resection that moves a coherent paired exchange together and preserves chronology and reply meaning; do not merely shift one side to make the arithmetic pass. Lock the corrected inventory, recompute every count again, and rerun the full validator before judgment. Never merge, delete, or reassign scored moves afterward merely to satisfy the display contract.
2. Give two fresh isolated promoted-model contexts the same score-blind packet. Store their outputs in disjoint paths and validate each independently. Freeze a judgment-execution record containing the exact model label and slug, reasoning effort, isolation method, allowed input hashes, output hashes, writable paths, attempt and retry counts, and direct incremental cost for both passes.
   - Each reviewer must check its own rationales against the frozen source exclusions and audio/attribution restrictions before submission. Before accepting either saved pass, the controller independently checks that compliance without disclosing the other pass, prescribing ratings, or changing either output.
3. Deterministically compare the judgments and extract every disagreement specified by the active workflow.
4. Perform every required below-high-confidence audio check before adjudication. Freeze clips, transcribe sequentially, never repeat successful calls, and record hashes, attribution decisions, and cost.
   - Require the triggered move IDs and completed check IDs to match the inventory's below-high-confidence move IDs exactly and in order.
   - Track `knownSuccessfulCallCostUsd` separately from the maximum possible total that includes a transport-uncertain or failed paid call. Never call an uncertain attempt free merely because no usable result arrived.
5. Give a fresh isolated adjudicator only the allowed dispute packet and frozen evidence. Validate every resolution, including compliance with the same frozen source restrictions.
6. Assemble the resolved final ledger. Complete and record the source-eligibility check below before freezing the score-pass manifest and running the repository calculator exactly once.
7. Preserve the calculator input, output, logs, hashes, and one-pass attestation. Never edit or rerun calculated scores.

### Source-eligibility check before scoring

Review the rationales and evidence links in both primary passes, the adjudication, and the resolved ledger against the frozen exclusions and uncertainty notes. Check specifically that no credit, penalty, inferred concession, or alleged failure to reply relies on excluded material, unresolved speaker ownership, or recognition-corrupted words, numbers, or references. Distinguish genuine uncertainty argued by a speaker from uncertainty introduced by transcription; neither a keyword match nor a blanket disclaimer establishes compliance. If a rationale uses prohibited material to justify a rating, or its influence cannot be separated, the check fails.

Record the checked artifact hashes, affected IDs if any, source restrictions, and disposition in the run's existing execution/validation evidence or an accompanying audit note. Reuse an earlier compliance review when its inputs are unchanged; recheck affected dependencies after an authorized correction. This is not a third primary assessment, new rubric dimension, score adjustment, or permission to rewrite accepted judgments. Preserve failed outputs and stop before calculation; use only a recovery already authorized by the frozen workflow, otherwise request narrowly scoped authority. Discovery after scoring still requires the existing exceptional-recovery boundary—never silently rerun the calculator.

On a transport or schema failure, preserve the artifact and diagnose it before using any recovery allowed by the active repository controls. Use the smallest fresh isolated field-disjoint recovery shard, one attempt per shard. A publication repair may modify only the explicitly listed unavailable fields and must pass the full contract again.

Preserve the exact rejected file and validator output before authorizing a repair. Require a new repair output; only the controller may replace a derived assembled candidate after validation, while retaining the immutable first submission. Do not rely on an after-the-fact description of overwritten bytes.
