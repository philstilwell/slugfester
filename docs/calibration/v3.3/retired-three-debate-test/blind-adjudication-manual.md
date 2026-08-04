# v3.3 blind bundled-adjudication manual

Use only the five files in the isolated workspace. The blind packet contains no raw candidates, model identities, agreement/conflict status, gold, scores, legacy assessment, Overall Commentary, or AI Extension.

For each bundle, read the locked target, components, response, eligible burden route, and every field card. Decide each field from the default and exact positive rule. Return one of the field's `allowedSemanticJson` strings exactly. For a default value, `evidenceText` must be null. For any nondefault value, copy one exact, complete sourceExcerpt substring that directly supports the choice; do not calculate offsets.

Treat dependency fields jointly. Enforce target/component/contrary/scope coherence, defect/consequence coherence, and malformed/replacement independence before returning. Complete all bundles and decisions once, in packet order. Do not add derived labels, candidate guesses, confidence values, participant scores, commentary, or reconstructed arguments.
