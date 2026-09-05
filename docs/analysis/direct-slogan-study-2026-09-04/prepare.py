"""Prepare identical score-blind source packets and an explicit output contract."""
from __future__ import annotations

import hashlib
import re
from pathlib import Path
from intake import HERE, ROOT, load, dump, sha

CACHE = ROOT / ".assessment-cache/direct-slogan-study-v1"


def obj(properties):
    return dict(type="object", additionalProperties=False, required=list(properties), properties=properties)


def enum(*values):
    return dict(type="string", enum=list(values))


TEXT = dict(type="string")
INT = dict(type="integer", minimum=0)
TRI = enum("yes", "no", "unclear")
SPEAKER = enum("A", "B", "O", "U")
SPAN = dict(startEvent=INT, endEvent=INT)
CANDIDATE = obj(dict(**SPAN, contextStartEvent=INT, contextEndEvent=INT, speaker=SPEAKER,
                     quote=TEXT, form=TRI, substitution=TRI, protection=TRI,
                     supportExplanation=TEXT, protectionExplanation=TEXT,
                     emotionalDevices=dict(type="array", items=enum("comfort", "fear", "shame", "identity", "ridicule", "none", "unclear")),
                     confidence=enum("high", "medium", "low"), strongestFairReading=TEXT))
SCHEMA = obj(dict(coverageComplete=dict(type="boolean"), coverageNote=TEXT,
                  attribution=dict(type="array", items=obj(dict(**SPAN, speaker=SPEAKER))),
                  candidates=dict(type="array", items=CANDIDATE),
                  contrasts=dict(type="array", items=obj(dict(**SPAN, speaker=SPEAKER, quote=TEXT, explanation=TEXT)))))


def main():
    intake = load(HERE / "intake.json")
    assert intake["summary"]["statusCounts"] == {"hash-matched": 187}
    dump(HERE / "review-schema.json", SCHEMA)
    manifest = []
    for r in intake["debates"]:
        n = r["number"]
        raw = Path(r["resolvedEventsPath"])
        assert sha(raw) == r["expectedEventsSha256"]
        events = load(raw)
        swap = int(hashlib.sha256(f"slogan-v1-{r['id']}".encode()).hexdigest()[:8], 16) % 2
        side_map = dict(pro="B" if swap else "A", con="A" if swap else "B")
        named = {side_map[side]: name for side, name in r["speakers"].items()}
        if r["inventoryPath"]:
            moves = load(ROOT / r["inventoryPath"])["moves"]
        else:
            moves = load(ROOT / r["ledgerPath"])["scoringJudgment"]["moves"]
        anchors = []
        for move in moves:
            span = move["sourceSpan"]
            # No propositions, scores, critiques, tags, or old findings enter a packet.
            anchors.append(dict(startEvent=span["startEvent"], endEvent=span["endEvent"], speaker=side_map[move["side"]]))
        lines = [f"Primary speaker A: {named['A']}", f"Primary speaker B: {named['B']}",
                 f"Complete retained transcript: events 0 through {len(events)-1} (inclusive).",
                 "Identification anchors from recorded source passages; verify in context:"]
        lines += [f"E{a['startEvent']}-E{a['endEvent']}: {a['speaker']}" for a in anchors]
        lines.append("BEGIN TRANSCRIPT DATA")
        for i, e in enumerate(events):
            secs = int(e["startMs"] // 1000)
            lines.append(f"[E{i} {secs//60:02d}:{secs%60:02d}] {re.sub(r'\s+', ' ', e['text']).strip()}")
        lines.append("END TRANSCRIPT DATA")
        text = "\n".join(lines) + "\n"
        path = CACHE / "packets" / f"debate-{n:03d}.txt"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        manifest.append(dict(number=n, id=r["id"], packetPath=str(path.relative_to(ROOT)), packetSha256=sha(path),
                             sourceSha256=sha(raw), eventCount=len(events), sourceWords=r["transcriptWords"],
                             packetCharacters=len(text), sideMap=side_map, anchorCount=len(anchors)))
    # Deliberate mixed pilot selected by an outcome-independent deterministic ordering.
    earlier = [r for r in intake["debates"] if r["cohort"] == "earlier"]
    later = [r for r in intake["debates"] if r["cohort"] == "later"]
    order = lambda r: hashlib.sha256(("pilot-v1-" + r["id"]).encode()).hexdigest()
    pilot = [r["number"] for group in [earlier, later] for r in sorted(group, key=order)[:3]]
    dump(HERE / "packet-manifest.json", dict(protocolSha256=sha(HERE / "protocol.md"),
         instructionsSha256=sha(HERE / "review-instructions.md"), schemaSha256=sha(HERE / "review-schema.json"),
         pilotDebates=pilot, debates=manifest))
    print({"packets": len(manifest), "pilotDebates": pilot,
           "totalPacketCharacters": sum(r["packetCharacters"] for r in manifest)})


if __name__ == "__main__":
    main()
