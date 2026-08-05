# v4.1 bounded schema-preflight failure

The frozen one-attempt synthetic preflight failed and cannot be retried or counted toward passage. Sol/medium returned the requested four sections, eight chronological nested moves, one actual move per side per section, and separately required motion, central, and subsidiary bridge fields. Deterministic validation rejected the output because both zero-valued burden-completion records named route IDs as well as bridge IDs in `affectedBurdenIds`, while the inherited validator accepted only bridge IDs.

The rubric requires a named affected burden and success criterion but did not state that route IDs were excluded. In v4.1, routes are themselves explicit burden objects with success criteria. Treating their IDs as burden IDs is semantically coherent; the validator's bridge-only assumption was an undocumented structural restriction.

The required amendment is prospective:

1. state explicitly that `affectedBurdenIds` may reference a route ID or one of its bridge IDs;
2. extend the validator through an opt-in v4.1.1 option while preserving the frozen v4.0.1 default behavior;
3. update the protocol identity, schema, fixture, manual, and source hashes under v4.1.1; and
4. freeze one new synthetic attempt before any retired-debate context.

This attempt used ChatGPT subscription authentication, Sol/medium, no API key, no retry, $0 metered API cost, and $0 transcription cost. It authorizes no real-debate execution, score derivation, Pass B, adjudication, held-out gate, reconstruction, production mutation, or corpus run.
