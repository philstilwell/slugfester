# Slugfester Atomic-Bundle Rubric v3.7.2

This development rubric inherits v3.7 target, diagnostic, reframe, burden, and exact-evidence semantics. It adds only bundle coherence and deterministic derivation rules.

## Target bundle

Each indispensable component retains its explicit contact mode. If any component has a mode other than `none`, derive `component-contact-precludes-contrary`. If every component is `none` and the packet's contrary candidate is already locked as relevant, derive `relevant-no-component`. A model-supplied contrary scalar is a consistency witness only and cannot override the derivation.

## Reframe bundle

Malformed-demand presence and replacement-demand presence remain separate judgments. A relation kind other than `none` is valid exactly when both are true. If either is false, the relation must be `none`. An incompatible tuple invalidates the complete bundle; the compiler performs no discretionary repair.

## Diagnostic bundle

When an explicit consequence is already locked as present, an eligible defect must be active and its relation kind must not be `none`. When no consequence is locked, a defect-only bundle may stand without a relation.

## Agreement

Two passes agree only when both bundles are valid and their complete semantic tuples match. Dependent derived fields do not count as additional agreement observations. Invalid bundles count as nonagreement and remain visible in the replay record.
