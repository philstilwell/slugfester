---
name: add-slugfester-youtube-debate
description: Assess and publish one new YouTube debate to SLUGFESTER using locked evidence, isolated judgments, adjudication, deterministic scores, and checked publication. Resume unfinished additions; treat published duplicates as a no-op. Not for rescoring or panels.
---

# Add a SLUGFESTER YouTube debate

Complete one audited addition through verified live publication. Use the repository's current controls and the run's frozen settings. Use the maintained `scripts/standalone-workflow.mjs` runner; do not reconstruct temporary controllers from a previous debate.

## Start or resume

Read applicable `AGENTS.md`, the installed `reassess-slugfester-debates` skill, and [the runner guide](references/single-debate-runbook.md). Read phase references only when entering that phase; do not load the entire workflow into every reviewer.

1. Canonicalize the video ID and check the catalogue and standalone registry. A published duplicate is a successful no-op. Resume an unfinished run with its existing branch, hashes, costs, exclusions, and consumed attempts; never restart assessment to repair publication.
2. For a new run, establish a clean checkout with `HEAD`, local `main`, and fetched `origin/main` equal, then create a topic branch. Preserve unrelated work. For a resumed run, authenticate the existing checkout and inspect upstream changes without resetting it.
3. Read current production workflow, rubric, publication contract, score policy, schemas, relevant validators, package commands, registry, and newest accepted standalone record. Freeze exact model, effort, source/control hashes, allowed outputs, cost estimate, and attempt limits before assessment.

## Phase routing

| Phase | Read and do |
|---|---|
| Source, inventory, judgments, scoring | [Source and assessment](references/source-assessment.md). Resolve source eligibility before launching reviewers. |
| Writing, fallacies, cognitive biases | [Publication and rhetorical review](references/publication-review.md). Start only after scores lock. |
| Pages, graph, validation, publication | [Validation and release](references/validation-release.md). Test static and interactive pages before the first publication commit. |
| Explicitly authorized two-team recording | [Team runbook](references/team-debate-runbook.md), plus repository team controls. Use its dedicated assessment tools. |

## Authority and safeguards

- Ordinarily require one substantive advocate per side. The repository's primary-speaker exception requires incidental host advocacy at most 5% of the assessed window, no unique load-bearing motion argument, enumerated host/dependent-response exclusions frozen before judging, and reader-facing disclosure. An ambiguous third side is ineligible. Explicit team authorization uses the separate team lane.
- Prefer complete public captions. Inspect timed coverage, alternate tracks, both closings, speaker attribution, and material gaps. Use `transcribe` only when recovery or audio verification requires it. Report a frozen cumulative estimate before paid work; the default transcription cap remains $1.00 unless explicitly overridden for the run. No other paid service, automatic paid retries, or avatars.
- Continue ordinary authorized steps without repeated user approvals. Ask only for a material scope decision, new spending/attempt authority, or a substantive change to frozen assessment. Internal reading and submission releases are controller work, not user approvals.
- Preserve the complete source, qualifications, exclusions, and exact quotations. Give no credit, penalty, or absence inference from excluded material. Keep the motion byte-identical and positions distinct from speaker names.
- Freeze inventory, semantic sections, burden links, balanced-selection rationale, and independently checked row capacity before judgment. Never drop or rearrange scored moves to fit publication.
- Use two fresh mutually blind primary reviewers on identical evidence, in parallel. Preserve isolation and authenticated reading. A fresh adjudicator resolves only the deterministically extracted disputes after required audio checks. Review source eligibility before running the unchanged calculator exactly once. No manual scores or automatic reruns.
- After scores and critiques freeze, use two fresh mutually blind move-complete tag reviews in parallel, then fresh anonymous adjudication of their entire candidate union. Source-specific no-tag reasoning matters. Tags never change scores; overrides start empty.
- Mechanical checks do not replace source/editorial review. Inspect unsaved candidate prose before first submission. The memory handoff saves exactly the reviewed bytes once; saved failures consume their attempt. Preserve rejected bytes. Subsequent repairs remain limited to authorized shards of at most two fields with one attempt each.
- Preserve frozen historical campaign, calibration, and prior-debate evidence. Route reusable tools by explicit `--debate NNN`; derive identity and counts from the registry, never copied constants.

## Efficient execution and completion

Use lossless role packets: each shared evidence block is present once and fully read, with reversible references where duplicated. Keep executable checker source hash-pinned as tool input; reviewers need its result and contract, not repeated implementation reads. Never compact by summarizing away source evidence or exposing peer judgments.

Record active work, waiting, and repairs with stage timers. Overlapping worker time is reported separately from elapsed time. Use focused checks during edits and the required full checks at release boundaries. Preserve an interrupted attempt and resume valid artifacts; status reporting is not permission to rerun.

Completion requires all assessment, publication, corpus comparison, prose, rendering, graph, repository, and committed-evidence checks; green required pull-request checks and merge; successful post-merge Site Quality and Pages runs; and live verification against committed data. Close temporary browsers/servers and remove runtime adapters while retaining hashed evidence. Report result, source limitations, cost, validation, publication revision, timing, and cleanup.

After updating this installed skill, validate it and reread this file plus every changed reference in the current chat. That is the in-place refresh; a new chat is unnecessary.
