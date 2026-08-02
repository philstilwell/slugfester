#!/usr/bin/env python3
"""Create a timestamped Whisper transcript JSON without exposing API secrets."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from openai import OpenAI


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--language", default="en")
    args = parser.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is not set")
    if not args.audio.is_file():
        raise SystemExit(f"Audio file not found: {args.audio}")

    with args.audio.open("rb") as audio_file:
        result = OpenAI().audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            language=args.language,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
            temperature=0,
        )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    if hasattr(result, "model_dump"):
        payload = result.model_dump(mode="json")
    else:
        payload = json.loads(result.json())
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
