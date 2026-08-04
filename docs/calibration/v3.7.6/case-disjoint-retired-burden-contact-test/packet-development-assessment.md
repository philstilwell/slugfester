# v3.7.6 case-disjoint retired burden-contact packet assessment

## Selection

The test contains 12 retired cases from three dyadic debates: Debates 04, 62, and 152, with four cases from each. No selected debate-move coordinate occurs in the eight-case v3.7.6 correction smoke. The sample also excludes multi-speaker debates in accordance with the current production-scope recommendation.

Every excerpt matched exactly one normalized span in its locally saved timestamped event file. The committed source audit pins the local transcript and event hashes for all three debates. All selected spans are high-confidence dyadic attributions based on the retired speaker label, uninterrupted turn context, and position-specific content. Consequently, the medium-confidence audio rule is enforced but not triggered in this sample; no audio or transcription call is required.

## Semantic design

Each case offers one complete anonymous choice among no contact and every support-or-attack pairing for four proposition-bearing bridges: motion, central, and two specific subsidiary bridges. Every candidate universe therefore contains nine valid composites. Pass A and pass B contain identical semantic universes in different option positions.

The provisional retired-reference balance is deliberately heterogeneous:

| Category | Cases |
| --- | ---: |
| No contact | 2 |
| Support | 7 |
| Attack | 3 |
| Motion contact | 1 |
| Central contact | 1 |
| Subsidiary contact | 8 |

These provisional references only prove candidate coverage and counterbalancing. They are hidden from every model context and are not a benchmark, human ground truth, or pass condition.

## Frozen gate

The planned adjudicated execution uses two isolated 5.6 Sol passes per debate and at most one third-pass context per debate containing only disputed composite cases. It permits one attempt per context, no retry or stream recovery, and no score or assessment-prose derivation.

The test passes only if all six initial contexts are valid, at least 11 of 12 cases agree initially, no more than one case disagrees initially, all 12 final decisions have two matching votes, and no case remains unresolved. Any medium- or low-confidence attribution would require completed audio verification before inference. Metered API and transcription costs are capped at $0.

Packet design, provenance, schema closure, local transcript availability, semantic counterbalancing, and threshold preregistration are ready for a separate execution implementation. Model execution remains blocked until that implementation receives its own frozen manifest.
