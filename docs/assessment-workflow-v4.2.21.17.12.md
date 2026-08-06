# Slugfester Discovery Ownership Hardening v4.2.21.17.12

The first new held-out discovery gate failed one of seventeen contexts. Debate 19, chunk 1 returned a candidate beginning at event 203 even though that chunk owned only events 0–189; events 190–229 were look-ahead context. The model followed the output JSON schema but missed a prompt-only ownership restriction. The deterministic validator correctly rejected the output, and the workflow made no retry or repair.

This revision moves the existing ownership rule into the generated structured-output schema. A candidate's `startEvent` is bounded by the chunk's owned core, while `endEvent` is bounded by the available context. The deterministic validator remains unchanged as defense in depth.

The failed output is preserved verbatim. All five debates in the attempted gate are retired from clean held-out status: their throughput evidence remains informative, but they cannot establish a clean pass after the protocol change. A fresh metadata-only sample must be frozen and run before downstream judgment, audio, adjudication, scoring, or publication gates can authorize the 195-debate workflow.
