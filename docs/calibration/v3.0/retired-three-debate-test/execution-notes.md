# v3.0 retired-test execution notes

All nine successful assessment contexts used the selected `gpt-5.6-sol` model through the ChatGPT/Codex subscription path. `OPENAI_API_KEY` was explicitly removed from every launch environment. No metered API or transcription request was made, so the metered charge was $0. Exact subscription token use was not captured by the non-JSON CLI output.

Each successful context ran in a separate ephemeral allowlisted workspace. Pass A and Pass B received only `workflow.md`, `rubric.md`, `manual.md`, `schema.json`, and one `input.json`. Each adjudicator received only the workflow, rubric, adjudication manual, adjudication schema, and one deterministic `dispute-packet.json`. The temporary workspaces contained no gold key, other pass, legacy assessment, numerical score, Overall Commentary, AI Extension, or production debate object.

Before any successful Sol inference, two structured-output preflight launches were rejected by the endpoint because the inherited schema used unsupported JSON Schema forms: first a `const` without an explicit type, then `uniqueItems`. Those launches produced no assessment artifact. The compatibility transform added explicit types and removed unsupported validation keywords; the repository validators retain the stronger checks. The manifest was rebuilt and finally frozen at `2026-08-03T22:02:00.000Z`, before the six successful raw passes. No substantive rule or threshold changed after a successful pass began.

The three canonical transcript, event, and caption-manifest chains matched their local hashes. Debate #62's retained medium-confidence source-control move used the existing locally saved audio-verification clip, whose hash and resolved speaker matched the inventory. No new transcription was needed.

No held-out transcript was opened. No participant-performance score, scorecard prose, Overall Commentary, AI Extension, ranking, or production debate object was generated or changed.

