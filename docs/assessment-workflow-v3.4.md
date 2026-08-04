# Slugfester Conservative Dual-Confirmation Workflow v3.4

## Status and scope

Version 3.4 is a classification-only retired-development workflow. It may not score interlocutors, draft assessment prose, create Overall Commentary or AI Extension material, open held-out transcripts, or mutate production debate objects.

It reuses the frozen v3.2 source chain, audio audits, gold keys, and independent raw Pass A (5.6 Terra) and Pass B (5.6 Sol). Gold is available only to the post-lock evaluator. No raw pass is rerun.

## Independent review layer

Each debate receives two new isolated de novo reviews:

1. a 5.6 Terra review at Extra High reasoning; and
2. a 5.6 Sol review at Extra High reasoning.

Each reviewer sees only the workflow, rubric, review manual, output schema, and one blind debate packet. The packet contains the complete locked cases but omits raw values, raw model identities, agreement or conflict flags, candidate order, gold, numerical scores, legacy prose, Overall Commentary, AI Extension, and production debate objects.

The review is complete rather than dispute-marked so agreement status cannot leak through routing. Every field is judged once. The output includes explicit component-contact modes, example/contrary boundary classifications, staged defect and consequence decisions, reframe fields, and burden fields. Evidence must be an exact source-excerpt substring.

## Default-first classification

For every field, the reviewer must:

1. begin with the default value;
2. identify the exact positive rule and its exclusions;
3. copy qualifying evidence when a nondefault value is selected;
4. apply the coupled-field invariants; and
5. record the field-specific audit state.

A component may be contacted by exact assertion, explicit denial, restriction, distinction, explanation, warrant challenge, or explicit global assent. Generic conversational assent does not license every component. Explicit global assent counts only when the cited language ranges over the complete locked proposition and the response does not immediately narrow, distinguish, or redirect it.

A connected example must be distinct from the example already contained in the locked target. Material already inside the target is classified as `inside-locked-target`, not as a connected example. Relevant contrary material is available only when no locked component is contacted.

A diagnostic is staged: first decide whether an explicit defect cue exists, then select the defect label, then decide whether a separate defect-linked consequence clause exists. A positive consequence must use a clause distinct from the defect cue. Merely disagreeing, changing subject, or offering an alternative does not establish a diagnostic.

## Deterministic raw comparison

After both isolated reviews close, code compares every semantic primitive in the frozen raw Pass A and Pass B.

- A raw disagreement is a field whose semantic values differ.
- A raw agreement is a field whose semantic values match, regardless of evidence-span differences.
- Candidate provenance remains sealed until both review contexts have closed.

No model sees the comparison result.

## Conservative final-lock policy

The final classification lock is built only after both reviews validate.

### Raw disagreements

5.6 Terra is the preregistered leading arbiter. Its de novo semantic value must map to exactly one of the two frozen raw candidates. If it maps to neither or both, the field is unresolved and the gate fails. Sol is recorded as an independent audit but cannot override Terra on a raw disagreement.

### Raw agreements

The shared raw value is retained by default.

Fragile shared fields are eligible for an override only when Terra and Sol independently return the exact same alternative semantic value and both reviews pass all evidence and field-specific invariant checks. Eligible fields are original target contact, connected example, scope, component contacts, relevant contrary material, defect type, consequence, malformed demand, and replacement demand.

Burden-adjustment and burden-contact agreements are never eligible for a shared-value override in v3.4. One reviewer alone can never alter a raw agreement.

### Evidence

When a selected semantic value matches a raw candidate, evidence is chosen deterministically from valid candidate and review evidence. For a dual-confirmed alternative, valid review evidence is canonicalized deterministically. Evidence changes may not alter semantic provenance.

## Source and audio gate

The complete frozen transcript, caption-event, source-manifest, and local audio-verification chain must validate by hash. Every medium- or low-confidence move must remain audio verified. No new transcription is authorized in this experiment.

## Scoring exclusion

Participant-performance scores and assessment prose remain prohibited until a later workflow has passed classification validation and an explicitly authorized scoring phase begins. The classification lock may expose only permitted scoring bands, never selected scores.

## Gate and stop rule

The v3.2 accuracy and operational thresholds remain frozen. In addition, v3.4 requires zero unresolved fields, zero unflagged semantic alterations, zero unilateral shared overrides, zero invalid dual overrides, zero model schema or invariant retries, and complete audio verification.

This retired test cannot authorize held-out access directly. If it passes, the only authorized next step is one preregistered disjoint retired confirmation of the same architecture. If it fails, stop, report the failure, and do not open held-out material or score participants.
