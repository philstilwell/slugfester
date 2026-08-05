# Slugfester Bounded Lean Workflow v4.1.4

This prospective amendment inherits v4.1 through v4.1.3. It changes no scoring anchor, model allocation, source-access requirement, selection bound, trigger, compute assumption, or score formula. It strengthens the pre-submission consistency pass for burden contacts.

## Burden-reference resolution

For every non-null `burdenContact`, the judge must resolve `bridgeId` against the bridges declared in its own two routes before returning the JSON. It then performs this sequence in order:

1. verify that the bridge ID exists exactly once;
2. copy the referenced bridge's declared `tier` exactly into `burdenContact.tier`;
3. decide whether the move supports or attacks that specific bridge and record the polarity; and
4. rate relevance/burden only inside the referenced bridge tier's closed band: motion 90–100, central 75–89, or subsidiary 55–74.

A move judged to have central relevance cannot cite a subsidiary bridge while merely labeling the contact central. The judge must instead either cite a genuinely matching central bridge or preserve the subsidiary citation and rate it inside the subsidiary band. Repository code does not infer which substantive correction was intended and therefore fails any mismatch without normalization.

The response and charity consistency rules from v4.1.3 remain mandatory in the same single scoring pass.

Protocol identity:

- `schemaVersion: 4.1.4-bounded-primary-output`
- `protocolId: v4.1.4-bounded-lean-risk-triggered-consensus`
