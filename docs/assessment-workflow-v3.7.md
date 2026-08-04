# Slugfester Retired Semantic-Card Test Workflow v3.7

## Purpose

Version 3.7 is a calibration-only comparison of 5.6 Terra and 5.6 Sol on compact decision cards. It uses retired cases whose expected decisions remain hidden from both models until every output closes. It measures family-level semantic extraction; it does not score interlocutors or assess complete debates.

## Fixed sample

Four family packets contain eleven cards drawn from three retired debates:

- four target/component/example cards covering a partial compound answer, relevant contrary material, a distinct connected example, and a modality shift;
- three diagnostic cards covering a defect without consequence and two linked consequences;
- two linked reframe cards; and
- two burden-contact conflicts, one bridge support and one bridge attack.

The multi-speaker retired case remains in the calibration sample so the workflow does not silently restrict itself to dyadic material.

## Execution

- Models: 5.6 Terra and 5.6 Sol, both at high reasoning.
- Contexts: one isolated context per model-family pair, eight total.
- Inputs per context: workflow, rubric, manual, one closed batch schema, and one gold-blind packet.
- Authentication: ChatGPT subscription credentials copied into a fresh temporary `CODEX_HOME`; API keys removed.
- Attempts: exactly one per context, with no output repair or model retry.
- Cost: no metered API, transcription, or external paid service.

## Evaluation and stop rules

Deterministic validation occurs before expected cards are opened. Accuracy is then measured only on preregistered categorical fields. Evidence-boundary wording and rationales do not count as accuracy assertions when the underlying card is valid.

Passing may authorize preregistration of a larger retired semantic replication. It never authorizes held-out access, numerical debate scoring, assessment prose, AI Extension generation, production mutation, or corpus-wide execution.
