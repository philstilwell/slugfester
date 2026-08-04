# v3.8.8 performance-judgment preparation assessment

## Result

Preparation passes. The locked three-debate corpus now has one score-blind performance-judgment contract covering all 81 moves, with two independent contexts per debate and one shared closed schema for all six initial contexts. No model context has run, no participant score has been derived, and no assessment prose has been authorized.

## Improvements over the v3.8.4 contract

- **Responsiveness:** disagreement applies to the entire response tuple—not only the class—including target IDs and component counts. A reply cannot receive a responsive class without a locked antecedent target.
- **Partial answers:** the schema requires at least two indispensable components, positive contact with fewer than all of them, and explicit summaries of both contacted and missed components.
- **Burden relevance:** the validator copies the consensus burden tuple exactly and enforces its numerical band mechanically.
- **Charity:** every move records whether charity was materially tested. Untested moves must equal exactly 75 and say that charity was not tested; a pass mismatch in tested status is always disputed.
- **Burden-adjustment exclusion:** any named duplicate capture or a false `notAlreadyScored` flag mechanically forces zero. Nonzero adjustments require the complete all-three eligibility test, named locked burdens and moves, an empty duplicate list, and substantive criterion, consequence, and counterfactual fields.
- **Scoring boundary:** initial outputs contain raw dimension judgments only. Calculated move, section, and overall totals remain prohibited until adjudication is complete.

## Source and audio status

All 81 moves retain high-confidence attribution. Each packet is joined deterministically to its locked atomic excerpt, local context window, response targets, section/importance assignment, route map, burden tuple, full transcript, event data, and local caption manifest. The local source hashes match the prior locks. No medium-confidence move remains, so this stage requires no new audio verification and no transcription expenditure.

## Contract tests

The dry fixture validates six outputs and 162 move judgments through the same packet-aware validator intended for model results. Mutation tests confirm that the tooling rejects an untested charity value other than 75 and a nonzero burden adjustment with duplicate capture. Separate extraction tests confirm that compound-response and charity-tested mismatches become disputes.

The repository has no general `npm test` script, so validation uses the stage-specific Node syntax checks, dry fixtures, and preparation validator. All pass.

## Remaining risk and next control

The principal remaining risk is ordinary model disagreement over component decomposition and dimension values. The contract makes that disagreement observable; it cannot remove it in advance. The next control is to freeze an execution manifest containing the exact packet, schema, manual, rubric, transcript, and event hashes. Only then should the six initial 5.6 Sol contexts run. Deterministic disagreement extraction and dispute-only adjudication must follow before any score calculation.

## Quality judgment

Preparation quality was initially graded **A** for semantic and deterministic-validation coverage. The first endpoint call exposed a missing compatibility check: structured output also requires explicit scalar `type` declarations on `const` and `enum` nodes. All six attempted contexts were rejected before inference, produced no judgments or output files, and cost $0. The recovery audit permits only compatible `type` additions and proves that no existing schema value or judgment rule changed. With that repair, semantic preparation remains **A**, while endpoint-compatibility preparation is downgraded to **B+** until a separately locked recovery run validates all six live contexts.

The first recovery lock exposed a second pre-inference compatibility defect: `uniqueItems` is not accepted by the endpoint. Official Structured Outputs guidance documents a restricted JSON Schema subset and does not list `uniqueItems` among supported array constraints. The removal changes no judgment rule because the packet-aware validator already enforces uniqueness for target and adjustment arrays. The new supported-subset lint checks every schema node, requires all object properties, requires `additionalProperties: false`, and rejects keywords outside the audited set. Because two six-context locks reached the endpoint before this complete audit, any further execution must begin with one separately locked endpoint preflight; a six-context run is forbidden until that preflight succeeds.

The first synthetic endpoint preflight proved that the exact shared schema is accepted. Its generated object failed the packet-aware validator only because the synthetic prompt instructed 75 for every dimension while also specifying null burden contact, whose relevance/burden band ends at 54. This was a preflight-prompt contradiction, not a schema rejection or debate-judgment defect. A separately locked corrected synthetic preflight must validate end to end before the six debate contexts may reopen.
