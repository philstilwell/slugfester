# Standalone primary-speaker scope exception v1

## Purpose

This exception permits a recording organized around one named primary advocate per side to remain in the dyadic assessment lane when a host or moderator makes only bounded, incidental arguments. It does not convert a team, panel, roundtable, third side, or recurring co-advocate into a dyadic debate.

## Eligibility

All conditions are required and must be frozen before either primary judgment:

1. The source explicitly identifies exactly two primary opponents, and those two people independently carry the central motion burdens.
2. Every substantive intervention by any non-primary participant is enumerated as an exact timestamp interval. Their combined duration is no more than 5% of the assessed debate window.
3. Every directly dependent primary-speaker response is separately enumerated and excluded from scoring evidence.
4. Each non-primary argument only duplicates or prompts a line independently developed by a primary speaker. It introduces no distinct side and no unique load-bearing motion argument.
5. The inventory contains no move, evidence span, quotation, or response link that intersects an excluded interval.
6. The publication source note names the exclusion and states that neither primary side received credit or penalty for the excluded intervention or its directly dependent replies.

Uncertainty about any condition fails the exception.

When cross-talk makes word-level turn boundaries unreliable, a host-advocacy interval may conservatively cover the complete continuous host-led exchange. The whole interval counts toward the 5% ceiling even when it contains brief primary-speaker interjections. Directly dependent primary replies are still separately enumerated and may overlap that conservative interval. Total excluded duration is the union of all intervals, so overlapping time is never counted twice.

## Required audit record

Authorization, source lock, and inventory must carry byte-identical assessed-window and exclusion-interval objects. The inventory's `primarySpeakerScopeAudit` must include:

- protocol ID and frozen status;
- assessed-window boundaries and derived duration;
- the 5% maximum host-advocacy share;
- the same primary-speaker mapping and complete non-primary participant list carried by authorization and source lock;
- every host-advocacy and directly dependent response interval, with speaker, duration, source-specific summary, and burden-impact rationale;
- independently derived host, dependent-response, and total excluded durations;
- confirmation that all host interventions were enumerated, no distinct side or unique load-bearing argument was introduced, and no selected evidence intersects an excluded interval.

Use registry validation profile `semantic-balanced-capacity-primary-speaker-v1`. The exception changes source scope only. It cannot change scoring rules, publication-depth requirements, rhetorical-tag review, or any historical evidence.
