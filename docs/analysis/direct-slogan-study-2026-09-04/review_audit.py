"""Check primary review provenance, coverage, exact quotes, and paired discovery."""
from __future__ import annotations

import argparse
import bisect
import json
import re
from collections import Counter
from pathlib import Path

import jsonschema
from intake import HERE, ROOT, load, dump, sha


def normalized(text):
    return re.sub(r"\s+", " ", text).strip()


def tokens(text):
    return list(re.finditer(r"[^\W_]+(?:['’][^\W_]+)*", text, re.UNICODE))


def locate_quote(item, events):
    """Find source words, never invent or substantively rewrite an excerpt.

    Mechanical case/punctuation normalization can only locate an exact sequence
    of source words. The returned quotation is always extracted from source text.
    Wording changes cannot pass this check. A changed span is separately recorded.
    """
    for scope, start, end in [("core", item["startEvent"], item["endEvent"]),
                              ("context", item.get("contextStartEvent", item["startEvent"]),
                               item.get("contextEndEvent", item["endEvent"]))]:
        pieces = [normalized(e["text"]) for e in events[start:end + 1]]
        text = " ".join(pieces)
        q = normalized(item["quote"])
        position = text.find(q)
        method = "exact"
        if position >= 0:
            stop = position + len(q)
        else:
            source_tokens = tokens(text)
            quote_tokens = [m.group().casefold().replace("’", "'") for m in tokens(q)]
            source_words = [m.group().casefold().replace("’", "'") for m in source_tokens]
            found = [i for i in range(len(source_words) - len(quote_tokens) + 1)
                     if source_words[i:i + len(quote_tokens)] == quote_tokens] if quote_tokens else []
            if not found:
                continue
            i = found[0]
            position, stop = source_tokens[i].start(), source_tokens[i + len(quote_tokens) - 1].end()
            method = "case-or-punctuation-only"
        offsets, cursor = [], 0
        for piece in pieces:
            offsets.append(cursor)
            cursor += len(piece) + 1
        first = start + max(0, bisect.bisect_right(offsets, position) - 1)
        last = start + max(0, bisect.bisect_right(offsets, stop - 1) - 1)
        return dict(valid=True, method=method, scope=scope, verifiedQuote=text[position:stop],
                    verifiedStartEvent=first, verifiedEndEvent=last)
    return dict(valid=False, method="no-exact-source-word-sequence")


def labels_for(review, event_count):
    labels = []
    for span in review["attribution"]:
        assert span["startEvent"] == len(labels), "Attribution gap or overlap"
        assert span["endEvent"] >= span["startEvent"]
        labels.extend([span["speaker"]] * (span["endEvent"] - span["startEvent"] + 1))
    assert len(labels) == event_count
    return labels


def intervals_for(labels):
    spans = []
    for i, label in enumerate(labels):
        if spans and spans[-1]["speaker"] == label:
            spans[-1]["endEvent"] = i
        else:
            spans.append(dict(startEvent=i, endEvent=i, speaker=label))
    return spans


def make_union(a, b, events):
    candidates = [dict(c, review=review, reviewIndex=i) for review, seq in [("a", a), ("b", b)] for i, c in enumerate(seq)]
    parents = list(range(len(candidates)))
    def root(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i
    for i, x in enumerate(candidates):
        for j in range(i):
            y = candidates[j]
            if x["review"] == y["review"]:
                continue
            xs, xe = x.get("verifiedStartEvent", x["startEvent"]), x.get("verifiedEndEvent", x["endEvent"])
            ys, ye = y.get("verifiedStartEvent", y["startEvent"]), y.get("verifiedEndEvent", y["endEvent"])
            overlap = max(xs, ys) <= min(xe, ye)
            tx = set(m.group().casefold() for m in tokens(x["quote"]))
            ty = set(m.group().casefold() for m in tokens(y["quote"]))
            similarity = len(tx & ty) / max(1, len(tx | ty))
            near = abs(events[xs]["startMs"] - events[ys]["startMs"]) <= 15000 and similarity >= .5
            if overlap or near:
                parents[root(i)] = root(j)
    groups = {}
    for i, c in enumerate(candidates):
        groups.setdefault(root(i), []).append(c)
    output = []
    for group in sorted(groups.values(), key=lambda g: min(c["startEvent"] for c in g)):
        fields = ["speaker", "form", "substitution", "protection"]
        agreed = len(group) == 2 and len({c["review"] for c in group}) == 2 and all(len({c[k] for c in group}) == 1 for k in fields)
        output.append(dict(candidateId=f"C{len(output)+1:03d}", members=group, classificationAgreement=agreed,
                           needsReview=not agreed or not all(c["quoteCheck"]["valid"] for c in group),
                           possibleEpisodeMerge=len(group) > 2))
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--partial", action="store_true")
    args = parser.parse_args()
    manifest = load(HERE / "packet-manifest.json")
    intake = {d["number"]: d for d in load(HERE / "intake.json")["debates"]}
    schema = load(HERE / "review-schema.json")
    summaries, reviewed, issues, missing = [], [], [], []
    counts = Counter()
    for packet in manifest["debates"]:
        n = packet["number"]
        source = intake[n]
        events_path = Path(source["resolvedEventsPath"])
        assert sha(events_path) == packet["sourceSha256"]
        events = load(events_path)
        words = [len(e["text"].split()) for e in events]
        passes = {}
        for pass_name in ["a", "b"]:
            directory = HERE / "reviews" / f"debate-{n:03d}" / pass_name
            if not (directory / "execution.json").exists():
                missing.append([n, pass_name])
                continue
            execution = load(directory / "execution.json")
            if not (directory / "output.json").exists():
                issues.append(dict(debate=n, review=pass_name, issue="missing-output"))
                continue
            assert sha(directory / "output.json") == execution["outputSha256"]
            assert execution["packetSha256"] == packet["packetSha256"]
            assert execution["instructionsSha256"] == manifest["instructionsSha256"]
            assert execution["protocolSha256"] == manifest["protocolSha256"]
            logs = [json.loads(line) for line in (directory / "execution.jsonl").read_text().splitlines() if line.strip()]
            tools_used = [e for e in logs if e.get("item", {}).get("type") not in [None, "agent_message", "reasoning", "error"]]
            assert not tools_used, "Actual tool use violates source-only review"
            assert execution["exit"]["code"] == 0 and not execution["timedOut"]
            output = load(directory / "output.json")
            jsonschema.validate(output, schema)
            assert output["coverageComplete"] is True
            labels = labels_for(output, len(events))
            if execution["status"] == "needs-inspection" and execution["issues"] == ["unexpected-tool-use"] and not tools_used:
                dump(directory / "execution-validator-correction.json", dict(status="validated", originalRecordSha256=sha(directory / "execution.json"),
                     reason="The original runner misclassified CLI startup warning items as tool calls. Raw event records show no tool calls; original execution evidence is preserved.", actualToolCalls=0))
            totals = Counter()
            for label, count in zip(labels, words):
                totals[label] += count
            normalized_candidates = []
            for i, c in enumerate(output["candidates"]):
                q = locate_quote(c, events)
                counts["quote_" + q["method"]] += 1
                if not q["valid"]:
                    issues.append(dict(debate=n, review=pass_name, candidate=i, issue="quote-not-located", quote=c["quote"]))
                elif q["scope"] == "context":
                    counts["quote_reanchored_within_supplied_context"] += 1
                normalized_candidates.append(dict(c, quoteCheck=q, **{k:v for k,v in q.items() if k.startswith("verified")}))
            contrast_checks = [locate_quote(c, events) for c in output["contrasts"]]
            for i, q in enumerate(contrast_checks):
                if not q["valid"]:
                    issues.append(dict(debate=n, review=pass_name, contrast=i, issue="contrast-quote-not-located"))
            passes[pass_name] = dict(attribution=output["attribution"], labels=labels, words=dict(totals),
                                     candidates=normalized_candidates, contrasts=output["contrasts"], contrastChecks=contrast_checks)
            counts["completed_reviews"] += 1
            summaries.append(dict(debate=n, review=pass_name, words=dict(totals), candidates=len(output["candidates"]),
                                  outputTokens=execution["usage"]["output_tokens"], inputTokens=execution["usage"]["input_tokens"]))
        if len(passes) == 2:
            counts["paired_debates"] += 1
            a, b = passes["a"], passes["b"]
            consensus = [x if x == y else "D" for x, y in zip(a["labels"], b["labels"])]
            totals = Counter()
            for label, count in zip(consensus, words):
                totals[label] += count
            union = make_union(a["candidates"], b["candidates"], events)
            counts["candidate_union"] += len(union)
            counts["candidate_classification_agreements"] += sum(c["classificationAgreement"] for c in union)
            counts["candidate_reviews_required"] += sum(c["needsReview"] for c in union)
            reviewed.append(dict(number=n, sideMap=packet["sideMap"], consensusWords=dict(totals),
                consensusAttribution=intervals_for(consensus),
                passes={k:{x:y for x,y in v.items() if x != "labels"} for k,v in passes.items()}, candidateUnion=union))
    status = "partial" if missing else "needs-source-review" if issues else "primary-reviews-validated"
    dump(HERE / "qa/primary-review-audit.json", dict(status=status, counts=dict(counts), missing=missing, issues=issues, summaries=summaries))
    dump(HERE / "review-normalized.json", dict(status=status, debates=reviewed))
    print(json.dumps(dict(status=status, counts=dict(counts), issueCount=len(issues), missingReviews=len(missing)), indent=2))
    if not args.partial:
        assert not missing and not issues, "Primary review or source checks incomplete"


if __name__ == "__main__":
    main()
