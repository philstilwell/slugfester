# Slugfester Held-Out Discovery Ordering Failure Analysis v4.2.21.17.21

The v4.2.21.17.20 hard-route held-out discovery gate remains failed at nineteen of twenty valid contexts. This analysis reads the frozen manifest, untouched model outputs, and execution ledger without making a model, audio, transcription, adjudication, or scoring call.

The sole failure is tested as an ordering-only hypothesis. For audit purposes, an in-memory clone of every output is sorted by source-span start, source-span end, and candidate ID, then passed through the unchanged deterministic discovery validator. The analysis also compiles both the untouched and in-memory-ordered outputs and requires their canonical candidate bundles to be identical. No field, candidate ID, evidence bound, or prose value may change, and no derived artifact may replace a raw model output.

A passing analysis may authorize development and retired-data regression testing of an order-invariant simplified-discovery validator. It cannot pass or rerun the failed held-out gate, authorize independent judgments or scores, mutate production, or launch the 195-debate campaign.
