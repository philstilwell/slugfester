# v3.7.1 gold-blind benchmark-audit assessment

## Decision

**FAIL — do not authorize the corrected key or another model gate.** All eight isolated 5.6 Sol contexts were valid, and adjudication produced two-vote resolutions for every disputed field. However, the two initial passes agreed on only **10 of 14 fields**, below the preregistered **12 of 14** stability threshold.

The result does not authorize a corrected benchmark key, another retired semantic comparison, held-out access, participant scoring, assessment prose, or production mutation.

## Execution

- Six initial contexts: two independent Sol contexts for each of Debates 62, 154, and 185.
- Two adjudication contexts: Debate 154 for three disputed fields and Debate 185 for one.
- Eight of eight outputs passed schema, order, exact-evidence, rationale, and score-field validation.
- Model-output retries, stream recoveries, and pre-inference schema rejections: **0**.
- Metered API and transcription cost: **$0**; ChatGPT subscription authentication was used with API keys removed.
- All included speaker attributions were high confidence, so the medium-confidence audio prerequisite was not triggered.

## Semantic result

| Measure | Result | Required |
| --- | ---: | ---: |
| Initial field agreement | 10/14 (71.4%) | at least 12/14 |
| Initial disagreements | 4 | at most 2 implied by threshold |
| Disagreement-only adjudication | 4/4 resolved | 4/4 |
| Final two-vote resolutions | 14/14 | 14/14 |
| Resolved changes from retired key | 6 | diagnostic only; key not authorized |

The four initial disagreements were:

- Debate 154: `attribution-error` versus `invalid-inference`.
- Debate 154: contact versus no contact for the second changed-lives component.
- Debate 154: the mechanically coupled contrary classification for that component boundary.
- Debate 185: `contrastive` versus `none` for a reframe relation.

The third passes selected `attribution-error`, component contact, the corresponding component-contact contrary disposition, and `contrastive`. These decisions have the required two votes, but the preregistered audit required stronger initial repeatability before treating the resulting key as reliable.

## Reporting caveat and corrected postmortem

The frozen official analyzer contains a misleading field label: `replayAgainstAuditedKey`. Because the audit failed, its implementation correctly did **not** apply the six resolved changes, so that field is actually a replay against the unchanged retired key. The frozen artifact was preserved rather than rewritten after outcome discovery.

An explicitly unauthorized postmortem applies the six resolutions only to test whether they could alter the readiness conclusion:

| Counterfactual measure | Terra | Sol | v3.7 requirement |
| --- | ---: | ---: | ---: |
| Overall matches | 41/45 | 35/45 | at least 41/45 each |
| Target matches | 24/26 | 22/26 | at least 23/26 each |
| Non-target matches | 17/19 | 13/19 | at least 18/19 each |
| Burden matches | 3/4 | 3/4 | 4/4 each |

Cross-model agreement remains **39/45**, below the required 41/45. Thus neither model would qualify even if the six resolved changes were provisionally accepted. The postmortem is diagnostic only and changes no authorization.

## Workflow-quality assessment

| Component | Assessment |
| --- | --- |
| Isolation and candidate-origin blindness | Strong |
| Candidate-position counterbalancing | Strong |
| Subscription/cost controls | Strong |
| Exact-evidence and artifact validation | Strong |
| Disagreement extraction and restricted adjudication | Strong |
| Initial semantic repeatability | Poor |
| Coupled-field representation | Inadequate |
| Benchmark-key reliability | Not established |
| Model-selection evidence | Neither model qualifies |
| Production readiness | Not ready |

The main design problem is no longer transport or serialization. It is that logically coupled values were audited as separate scalar fields. In Debate 154, one component-contact judgment mechanically determines the contrary disposition, turning one substantive boundary disagreement into two nominal field disagreements. In Debate 185, pass A selected both reframe clauses as present but selected `none` for their relation, a combination that a complete reframe-bundle validator would have rejected.

## Recommended v3.7.2 correction

Do not lower the 12/14 threshold or accept the six changes post hoc. First redesign the audit unit:

1. Audit target components and contrary disposition as one atomic target bundle, deriving the contrary value mechanically from component contact.
2. Audit malformed demand, replacement demand, relation kind, and their evidence as one reframe bundle; reject internally incompatible combinations before comparison.
3. Audit defect type and consequence relation as one diagnostic bundle when both are active.
4. Measure initial agreement on independent atomic bundles, not on mechanically dependent scalar fields.
5. Preserve anonymous counterbalancing, two isolated Sol passes, deterministic disagreement extraction, a third pass restricted to disputes, two-vote consensus, and zero-retry execution.
6. Use the existing eight outputs as zero-cost development fixtures for the bundle compiler before running any new model contexts.

The natural next step is therefore a local v3.7.2 atomic-bundle compiler and replay. Another subscription model run should occur only after that deterministic correction passes its fixtures and receives a fresh preregistration.
