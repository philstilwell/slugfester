"""Find possible edited teaser repeats for source review; never auto-delete them."""
from __future__ import annotations

from difflib import SequenceMatcher
from pathlib import Path
from intake import HERE, load, dump
from review_audit import tokens


def main():
    findings = []
    for debate in load(HERE / "intake.json")["debates"]:
        events = load(Path(debate["resolvedEventsPath"]))
        prefix, later, prefix_events, later_events = [], [], [], []
        for i, event in enumerate(events):
            words = [m.group().casefold() for m in tokens(event["text"])]
            if event["startMs"] < 180000:
                prefix.extend(words); prefix_events.extend([i] * len(words))
            elif event["startMs"] >= 360000:
                later.extend(words); later_events.extend([i] * len(words))
        for match in SequenceMatcher(None, prefix, later, autojunk=False).get_matching_blocks():
            if match.size < 18:
                continue
            p0, p1 = prefix_events[match.a], prefix_events[match.a + match.size - 1]
            l0, l1 = later_events[match.b], later_events[match.b + match.size - 1]
            findings.append(dict(number=debate["number"], prefixStartEvent=p0, prefixEndEvent=p1,
                                 laterStartEvent=l0, laterEndEvent=l1, matchingWords=match.size,
                                 repeatedText=" ".join(prefix[match.a:match.a+match.size]),
                                 disposition="requires-source-review-not-automatic-exclusion"))
    dump(HERE / "qa/possible-teaser-repeats.json", findings)
    print({"possibleRepeatedPassages": len(findings), "debates": len({f['number'] for f in findings}),
           "note": "Verbatim repetition can be genuine renewed argument. Context must distinguish it from an edited promotional replay."})


if __name__ == "__main__":
    main()
