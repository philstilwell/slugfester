# Slugfester production-canary local audio-source preparation workflow

Prepare one local normalized source for each of the three videos represented in the frozen four-move audio queue, then cut exactly one padded clip per work item. Reuse a hashable local source when one is already available; otherwise download the public source once. Normalize sources and clips locally with `ffmpeg` to mono 16 kHz audio.

This stage makes no model, transcription, or verification call. It does not decide speaker attribution, modify either independent judgment, resolve a disputed field, or derive a score. Every clip must retain the locked move ID, proposition, expected speaker, source span, confidence trigger, clip window, local path, duration, and SHA-256 digest.

A complete four-clip preparation authorizes preparation and freezing of an audio-verification execution manifest with a separately reported cost estimate. It does not authorize paid transcription, audio-verification execution, adjudication-packet preparation, adjudication-model execution, final-ledger assembly, score derivation, publication finalization, production mutation, or any remaining production batch.
