"""Locate and authenticate the 187-debate study sources without changing scores."""
from __future__ import annotations

import hashlib
import json
import subprocess
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BASE = ROOT / "docs/analysis/astra-corpus-papers-2026-09-04"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return json.loads(path.read_text())


def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def main():
    rows = [d for d in load(BASE / "debates.json") if d["theist_side"]]
    assert len(rows) == 187
    roots = [Path(line[9:]) for line in subprocess.check_output(
        ["git", "worktree", "list", "--porcelain"], cwd=ROOT, text=True
    ).splitlines() if line.startswith("worktree ")]
    roots = list(dict.fromkeys([ROOT, Path("/Users/philstilwell/Documents/SLUGFESTER.com")] + roots))
    records = []
    for debate in rows:
        n = debate["number"]
        ledger_path = ROOT / "docs/assessment-ledgers" / (debate["id"] + ".json")
        ledger = load(ledger_path)
        video = parse_qs(urlparse(debate["youtube"]).query)["v"][0]
        if debate["cohort"] == "earlier":
            lock = ledger["sourceLocks"]
            relative = lock.get("eventsPath") or lock["originalEvents"]["path"]
            expected = lock.get("eventsSha256") or lock["originalEvents"]["sha256"]
            moves = ledger["scoringJudgment"]["moves"]
            inventory_path = None
        else:
            manifest_path = ROOT / f"docs/assessment-production/standalone-debates-v1/debate-{n}/manifest.json"
            manifest = load(manifest_path)
            lock = manifest["sourceLocks"]
            relative = lock["events"]["path"]
            expected = lock["events"]["sha256"]
            inventory_path = ROOT / lock.get("inventory", {"path": f"docs/assessment-production/standalone-debates-v1/debate-{n}/inventory/inventory.json"})["path"]
            moves = load(inventory_path)["moves"]
        candidates = list(dict.fromkeys(
            [r / relative for r in roots] +
            [r / f".assessment-cache/captions/{video}/events.json" for r in roots]
        ))
        existing = [p for p in candidates if p.is_file()]
        matching = [p for p in existing if sha(p) == expected]
        selected = matching[0] if matching else None
        record = {k: debate[k] for k in ["number", "id", "title", "youtube", "speakers", "cohort", "theist_side", "non_side", "topic", "narrow"]}
        record.update(videoId=video, ledgerPath=str(ledger_path.relative_to(ROOT)), ledgerSha256=sha(ledger_path),
                      expectedEventsSha256=expected, lockedEventsPath=relative,
                      resolvedEventsPath=str(selected) if selected else None,
                      status="hash-matched" if selected else "missing" if not existing else "hash-mismatch",
                      nonmatchingCopies=[str(p) for p in existing if p not in matching],
                      inventoryPath=str(inventory_path.relative_to(ROOT)) if inventory_path else None,
                      assessedMoves=len(moves))
        if selected:
            events = load(selected)
            assert isinstance(events, list)
            assert all(isinstance(e.get("text"), str) and isinstance(e.get("startMs"), (int, float)) for e in events)
            record.update(eventCount=len(events), transcriptWords=sum(len(e["text"].split()) for e in events),
                          durationMs=max(e["startMs"] + e.get("durationMs", 0) for e in events),
                          startMs=min(e["startMs"] for e in events))
        records.append(record)
    summary = {"sourceRevision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
               "populationFile": str((BASE / "debates.json").relative_to(ROOT)), "populationSha256": sha(BASE / "debates.json"),
               "debates": len(records), "statusCounts": dict(Counter(r["status"] for r in records)),
               "totalSourceWordsLocated": sum(r.get("transcriptWords", 0) for r in records),
               "totalSourceHoursLocated": sum(r.get("durationMs", 0) for r in records) / 3600000,
               "unavailableDebates": [r["number"] for r in records if r["status"] != "hash-matched"],
               "note": "Hash identity verifies retained source bytes, not caption correctness, speaker attribution, or completeness of the underlying recording."}
    dump(HERE / "intake.json", {"summary": summary, "debates": records})
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
