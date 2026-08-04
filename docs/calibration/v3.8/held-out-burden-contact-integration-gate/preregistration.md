# v3.8 held-out burden-contact integration gate preregistration

## Purpose

This gate tests whether the corrected composite burden-contact decision remains repeatable when atomic cases and route maps are prepared from previously unused full debates rather than retired development excerpts. It is a reliability gate for one semantic component, not a truth benchmark or an end-to-end debate assessment.

## Separation of rules and outcomes

The model-facing workflow, rubric, and classification manual contain only invariant instructions. The gate manifest alone contains sample selection, thresholds, stopping rules, prior results, and authorization state. The manifest is never an assessment-context input.

The historical v3.7.6 workflow remains unchanged because its hash is part of two frozen execution records. v3.8 supersedes it for future burden-contact work without rewriting that history.

## Metadata-only selection

Three dyadic debates are selected by a seed-committed SHA-256 rank from a metadata-only eligible pool. The pool excludes every debate identity or debate number found in prior calibration artifacts and requires an already present local transcript, event, and manifest chain. Candidate transcript text, audio, legacy assessments, and candidate ranks are not inspected before the seed and manifest are frozen.

## Held-out preparation after separate authorization

Preregistration does not authorize transcript-content access. If access is later authorized, an AI source-preparation pass will read each selected full transcript and propose a motion bridge, central bridges, proposition-specific subsidiary bridges, and four atomic moves. A separate isolated AI source reviewer will verify the route propositions, source coordinates, contextual sufficiency, and speaker attribution. Only disputed preparation fields go to an isolated source adjudicator. The resulting inventory must be complete before assessment packets are frozen.

Preparation targets twelve total moves, four per debate, with planned diversity across no contact, support, attack, and motion, central, and subsidiary bridges. Provisional preparation labels are sealed diagnostic aids only; agreement with them is not a passing condition and they cannot be promoted to human ground truth.

## Assessment and stop rule

Each debate receives two isolated 5.6 Sol classification passes. Anonymous candidate order is counterbalanced. A deterministic extractor compares decoded composite tuples. A third isolated pass receives only disputed cases and may select only one of the two initial tuples. Every final tuple requires two matching votes.

The frozen manifest sets the numerical reliability and category-coverage gates. Failure stops the workflow without scores, prose, benchmark changes, or production mutation. Passage can authorize preregistration of a separate end-to-end three-debate assessment gate; it cannot by itself authorize reassessment of all 195 debates.
