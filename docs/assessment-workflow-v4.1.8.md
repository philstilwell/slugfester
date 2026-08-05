# Slugfester Event-Aware Source-Integrity Workflow v4.1.8

This prospective amendment inherits v4.0 through v4.1.7 except where stated here. The v4.1.7 fresh-six gate failed before score derivation because its primary validator accepted excerpts and timestamps that were inconsistent with their declared transcript events. Every v4.1.7 debate and artifact remains diagnostic only; none can count toward v4.1.8 acceptance, and no v4.1.7 judgment may be repaired or reused as a v4.1.8 result.

## Repository-owned time boundaries

The primary model no longer supplies `startMs` or `endMs`. For each selected move it supplies only `startEvent`, `endEvent`, and `excerpt`. After validation, repository code mechanically derives:

- `startMs` from the declared start event's exact `startMs`; and
- `endMs` from the declared end event's `startMs + durationMs`, capped at the debate duration.

This compilation changes no proposition, speaker, move, response classification, rating, route, section, or burden field. Model-supplied millisecond fields are invalid rather than ignored. The raw model output and the deterministic compiled artifact remain separately hash-locked.

## Event-file and excerpt validation

Primary validation receives the complete event-file bytes and parsed event ledger. Before any judgment output can pass, repository code must verify:

1. the event-file SHA-256 equals the hash frozen in the source-only packet;
2. the parsed event count equals the packet count;
3. every event has a nonnegative integer start, a positive integer duration, nonempty text, and monotonic start order;
4. each move declares integer event indices within the ledger in nondecreasing order;
5. each excerpt contains 12–90 lexical tokens;
6. multiset lexical recall of excerpt tokens against only the declared event slice is at least 0.80; and
7. longest-common-subsequence token coverage of the excerpt against only that slice is at least 0.80.

The lexical check catches text drawn from elsewhere. The ordered check separately rejects word-salad or reordered excerpts that happen to reuse the same vocabulary. Case, punctuation, and diacritics do not affect either measure. Ellipses may mark omissions, but the retained words must occur in source order. These thresholds and token rules are frozen before the new sample is selected.

Any event hash, shape, range, token-count, lexical, or ordered-coverage failure invalidates that one-attempt context and stops the gate. There is no automatic retry, span repair, excerpt replacement, judgment normalization, or conversion of a failed context into a usable result.

## Required mutation fixtures

Before external model execution is authorized, deterministic tests must prove that one known source-consistent output passes after removal of model-owned timestamps and that each of the following mutations fails:

- an unrelated excerpt;
- a wrong declared event range;
- a truncated event range;
- a token-reordered excerpt;
- reintroduced model-supplied millisecond fields; and
- changed event-file bytes.

Fixtures may use retired diagnostic material solely to test validator mechanics. They cannot provide judgment examples, ratings, or reference content to a v4.1.8 model context.

## New prospective sample

After the workflow, validator, schema, and mutation fixtures are committed, repository code selects a new six-debate dyadic sample using only the frozen source-only metadata pool and local transcript manifests. It excludes every previously retired or calibration debate, all v4.1.6 development debates, and all six v4.1.7 debates. Selection retains the six predeclared topic families and requires at least one debate under 90 minutes and at least one over 120 minutes. Ranking uses a new fixed v4.1.8 salt. Sample identity, selector hash, workflow hash, source hashes, and the no-legacy-access boundary are frozen before model execution.

## Judgment and downstream boundary

The primary, deterministic escalation, isolated Pass B, mandatory audio verification, deterministic disagreement extraction, isolated disputed-field adjudication, final-ledger compilation, score derivation, compression audit, and legacy-comparison order otherwise remain those of v4.1.7. All downstream packets must consume only a primary output that passed v4.1.8 event-aware validation and its repository-compiled source times.

No context may see legacy assessments, scores, winners, other-pass rationales, publication prose, AI Extension material, or v4.1.7 judgments. Scores remain prohibited until every required audio and adjudication branch closes and one final scoring-input ledger locks.

## Prospective gate interpretation

The v4.1.7 acceptance rules continue for the new six-debate gate, including one-attempt validity, compression completeness, deterministic replay, legacy diagnostics after score lock, and the 52-hour central / 60-hour conservative production ceilings. In addition, every selected move must pass the event-aware source-integrity checks above. A single source-integrity failure fails the gate before scores or legacy comparators are opened.

A passed v4.1.8 fresh-six gate authorizes preparation, not execution, of a new preregistered held-out end-to-end gate. The 195-debate reassessment remains unauthorized until that held-out gate passes and an explicit editorial promotion is recorded.
