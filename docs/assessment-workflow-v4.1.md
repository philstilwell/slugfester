# Slugfester Bounded Lean Workflow v4.1

This prospective amendment inherits v4.0 and v4.0.1 except where stated here. It responds to the frozen v4.0.1 retired-primary failure; it does not repair, retry, or normalize any failed output.

## Bounded primary judgment

Every debate still receives a fresh isolated 5.6 Sol primary judgment with the complete local transcript and timestamped events available. The primary reasoning effort changes from `high` to `medium`. Sol/high is reserved for risk-triggered Pass B and candidate-bound adjudication.

The primary inventory is a scorecard inventory rather than an utterance inventory:

- four to six contested sections totaling 100%;
- one or two selected moves per side in each section;
- eight to twenty-four selected moves for the complete debate;
- repeated formulations of the same proposition are represented by the strongest source span, with material later development named in the evidence rationale; and
- every motion, central, and necessary subsidiary route must remain represented even when lower-importance repetition is omitted.

A section may be broader than a single argument, but it must contain actual argumentative material from both sides. A one-sided argument is assigned to the nearest genuinely contested issue family. The judge must not invent a reply, convert silence into a move, or manufacture symmetry. Consequential nonresponse remains encoded in the selected reply's response tuple, the opponent's surviving constructive, or the burden-completion record when and only when the duplicate-exclusion rule permits it.

## Endpoint-enforced structure

Routes no longer use one undifferentiated bridge array. Each route supplies exactly one motion bridge, one to four central bridges, and one or two subsidiary bridges in separately required fields.

Moves are nested under `proMoves` and `conMoves` inside each section. Each side array requires one or two moves. Every move receives a unique chronological `sequence`; repository code flattens the sections by sequence before applying response-target and chronology validation. The model still emits no calculated score, total, range, band, winner, or publication prose.

This shape makes the two v4.0.1 structural failures endpoint-visible before deterministic validation: a route cannot omit a bridge tier, and a section cannot omit one side.

## Execution and stop rules

- One subscription-authenticated attempt per context; API keys removed; no automatic model retry.
- Validate immediately after each context.
- On the first transport, schema, or semantic failure, write the partial execution record and stop. Later contexts do not run.
- A recoverable same-attempt stream event is recorded separately. It does not authorize replay, normalization, or a second model pass.
- The retired gate uses the fixed order 55, 103, 161 so the longest transcript remains the stress case.

## Quality comparison

The faster primary contexts remain score-blind. After deterministic validation, repository code compares their derived scores and winner classifications with the frozen retired diagnostic comparator. The failed v4.0.1 high-effort artifacts may be used only as post-run diagnostic references; they are never model inputs and cannot count as passed judgments.

The bounded primary gate requires all of the following:

1. three of three contexts pass without retry or normalization;
2. every retired winner classification is preserved;
3. every final side score is within five points of the retired diagnostic comparator;
4. all route tiers, two-sided sections, chronology, source spans, response components, closed findings, burden contacts, charity states, and adjustment exclusions validate;
5. every medium- or low-confidence selected attribution is audio-verified before Pass B;
6. the measured central corpus projection is at most 52 hours; and
7. the conservative projection is at most 60 hours.

## Compute model

The preregistered central planning assumptions are 7.0 primary minutes per debate, 4.25 finalization minutes, a 15% trigger rate, 8.0 high-effort Pass-B minutes per triggered debate, adjudication on half of triggered debates at 5.6 minutes, and five fixed QA/audio/rendering hours. This projects to 46.83 aggregate hours.

The conservative assumptions are 8.5 primary minutes, 5.0 finalization minutes, a 20% trigger rate, 8.5 Pass-B minutes, adjudication on 60% of triggered debates at 6.5 minutes, and five fixed hours. This projects to 56.93 aggregate hours.

Actual measured primary time replaces the central 7.0-minute assumption after the gate. Quality triggers always override the budget. No held-out gate or corpus run is authorized until this retired gate passes and its downstream triggered-consensus stages also pass.
