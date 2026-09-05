"""Prepare source contexts and anonymous candidate union for a fresh check."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from intake import HERE, ROOT, load, dump, sha
from prepare import CACHE, obj, enum, TEXT, INT, TRI, SPEAKER, SPAN

EPISODE = obj(dict(**SPAN, speaker=SPEAKER, quote=TEXT, form=TRI, substitution=TRI,
                  protection=TRI, emotionalDevices=dict(type="array", items=enum("comfort", "fear", "shame", "identity", "ridicule", "none", "unclear")),
                  confidence=enum("high", "medium", "low"), explanation=TEXT))
SCHEMA = obj(dict(contextSufficient=dict(type="boolean"), contextNote=TEXT,
    requestedEventRanges=dict(type="array", items=obj(dict(**SPAN, reason=TEXT))),
    decisions=dict(type="array", items=obj(dict(candidateId=TEXT,
        duplicateOf=dict(type=["string", "null"]), episodes=dict(type="array", items=EPISODE), explanation=TEXT))),
    additionalExclusions=dict(type="array", items=obj(dict(**SPAN, reason=TEXT))),
    possibleMissedEpisodes=dict(type="array", items=EPISODE)))


def merge_intervals(intervals, last):
    result = []
    for a, b in sorted((max(0,a), min(last,b)) for a,b in intervals):
        if result and a <= result[-1][1] + 1:
            result[-1][1] = max(result[-1][1], b)
        else:
            result.append([a,b])
    return result


def main():
    source = {d["number"]:d for d in load(HERE / "intake.json")["debates"]}
    primary_manifest = load(HERE / "packet-manifest.json")
    reviews = load(HERE / "review-normalized.json")
    teaser_path = HERE / "qa/possible-teaser-repeats.json"
    teasers = load(teaser_path) if teaser_path.exists() else []
    dump(HERE / "adjudication-schema.json", SCHEMA)
    manifest=[]
    for record in reviews["debates"]:
        n=record["number"]; meta=source[n]
        events=load(Path(meta["resolvedEventsPath"]))
        ranges=[]; cases=[]
        first_end=max(i for i,e in enumerate(events) if e["startMs"] < 180000)
        ranges.append((0,first_end+10))
        duration=events[-1]["startMs"]
        last_start=next(i for i,e in enumerate(events) if e["startMs"]>=duration-120000)
        ranges.append((last_start,len(events)-1))
        for item in record["candidateUnion"]:
            readings=[]
            for m in item["members"]:
                ranges.append((m["contextStartEvent"]-20,m["contextEndEvent"]+20))
                commentary=m["supportExplanation"]+' '+m["protectionExplanation"]+' '+m["strongestFairReading"]
                for match in re.finditer(r'E(\d+)(?:[–-](?:E)?(\d+))?',commentary):
                    a=int(match[1]); b=int(match[2] or match[1]); ranges.append((a-15,b+15))
                readings.append({k:m[k] for k in ["startEvent","endEvent","speaker","quote","form","substitution","protection","supportExplanation","protectionExplanation","strongestFairReading"]})
            readings.sort(key=lambda r:hashlib.sha256(json.dumps(r,sort_keys=True).encode()).hexdigest())
            cases.append(dict(candidateId=item["candidateId"],anonymousReadings=readings))
        possible_repeats=[t for t in teasers if t["number"]==n]
        for t in possible_repeats:
            ranges.append((t["prefixStartEvent"]-20,t["prefixEndEvent"]+20))
            ranges.append((t["laterStartEvent"]-30,t["laterEndEvent"]+30))
        ranges=merge_intervals(ranges,len(events)-1)
        if sum(b-a+1 for a,b in ranges)>.8*len(events): ranges=[[0,len(events)-1]]
        names={record["sideMap"][side]:name for side,name in meta["speakers"].items()}
        lines=[f"Primary speaker A: {names['A']}",f"Primary speaker B: {names['B']}",
            f"Original complete source has events E0-E{len(events)-1}.",
            "Candidate union (anonymous interpretations are not authoritative):",json.dumps(cases,ensure_ascii=False),
            "Potential repeated opening material; repetition alone does not justify exclusion:",
            json.dumps(possible_repeats,ensure_ascii=False),"BEGIN SOURCE DATA"]
        last=-1
        for a,b in ranges:
            if a>last+1:lines.append(f"[CONTEXT GAP: E{last+1}-E{a-1} not supplied; request it if needed]")
            for i in range(a,b+1):
                e=events[i];secs=int(e["startMs"]//1000)
                lines.append(f"[E{i} {secs//60:02d}:{secs%60:02d}] {re.sub(r'\s+',' ',e['text']).strip()}")
            last=b
        if last<len(events)-1:lines.append(f"[CONTEXT GAP: E{last+1}-E{len(events)-1} not supplied]")
        lines.append("END SOURCE DATA")
        path=CACHE/"adjudication-packets"/f"debate-{n:03d}.txt"
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text("\n".join(lines)+"\n")
        manifest.append(dict(number=n,id=meta["id"],packetPath=str(path.relative_to(ROOT)),packetSha256=sha(path),
            sourceSha256=meta["expectedEventsSha256"],eventCount=len(events),candidateIds=[c['candidateId'] for c in cases],
            suppliedEventRanges=ranges,sourceEventsSupplied=sum(b-a+1 for a,b in ranges),
            primaryReviewOutputSha256={p:sha(HERE/"reviews"/f"debate-{n:03d}"/p/"output.json") for p in ['a','b']}))
    dump(HERE/"adjudication-manifest.json",dict(protocolSha256=primary_manifest['protocolSha256'],
         instructionsSha256=sha(HERE/'adjudication-instructions.md'),schemaSha256=sha(HERE/'adjudication-schema.json'),
         pilotDebates=primary_manifest['pilotDebates'],debates=manifest))
    print({"readyDebates":len(manifest),"candidateGroups":sum(len(r['candidateIds']) for r in manifest)})


if __name__=='__main__':main()
