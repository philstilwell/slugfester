"""Validate the uniform single-reader study and calculate source-linked results."""
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path

import jsonschema
import numpy as np

from intake import HERE, ROOT, load, dump, sha
from review_audit import locate_quote, normalized

SEED = 20260904
OUTCOMES = ['unsupported', 'protected_slogan', 'protected_any', 'borderline_unsupported', 'borderline_protected']


def decode_attribution(intervals, size):
    labels=[]
    for text in intervals:
        match=re.fullmatch(r'(\d+)(?:-(\d+))?:([ABOU])',text.strip())
        assert match, f'Invalid attribution interval: {text}'
        start,end=int(match[1]),int(match[2] or match[1])
        assert start==len(labels) and start<=end<size, f'Attribution gap/overlap: {text}'
        labels.extend([match[3]]*(end-start+1))
    assert len(labels)==size
    return labels


def outcomes(candidate):
    form,sub,pro=(candidate[k] for k in ['form','substitution','protection'])
    unsupported=form==sub=='yes'
    return dict(unsupported=unsupported,protected_slogan=unsupported and pro=='yes',protected_any=pro=='yes',
        borderline_unsupported=form!='no' and sub!='no' and not unsupported,
        borderline_protected=all(x!='no' for x in [form,sub,pro]) and not (unsupported and pro=='yes'))


def summarize(rows, outcome):
    usable=[r for r in rows if r['theist_words']>0 and r['non_theist_words']>0]
    if not usable:return dict(n=0)
    t=np.array([10000*r['theist_'+outcome]/r['theist_words'] for r in usable])
    n=np.array([10000*r['non_theist_'+outcome]/r['non_theist_words'] for r in usable])
    gaps=t-n
    rng=np.random.default_rng(SEED)
    means=gaps[rng.integers(0,len(usable),size=(20000,len(usable)))].mean(axis=1)
    tc=sum(r['theist_'+outcome] for r in usable); nc=sum(r['non_theist_'+outcome] for r in usable)
    tw=sum(r['theist_words'] for r in usable); nw=sum(r['non_theist_words'] for r in usable)
    presence=Counter(('both' if r['theist_'+outcome] and r['non_theist_'+outcome] else
        'theist_only' if r['theist_'+outcome] else 'non_theist_only' if r['non_theist_'+outcome] else 'neither') for r in usable)
    return dict(n=len(usable),theist_count=tc,non_theist_count=nc,theist_words=tw,non_theist_words=nw,
        theist_pooled_rate=10000*tc/tw,non_theist_pooled_rate=10000*nc/nw,
        theist_equal_debate_rate=float(t.mean()),non_theist_equal_debate_rate=float(n.mean()),
        mean_gap=float(gaps.mean()),median_gap=float(np.median(gaps)),
        gap_ci=[float(x) for x in np.quantile(means,[.025,.975])],presence=dict(presence),
        theist_higher=int(sum(gaps>1e-12)),non_theist_higher=int(sum(gaps< -1e-12)),equal=int(sum(abs(gaps)<=1e-12)))


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--partial',action='store_true');args=parser.parse_args()
    manifest=load(HERE/'light-manifest.json');schema=load(HERE/'light-schema.json')
    sources={r['number']:r for r in load(HERE/'intake.json')['debates']}
    corrections_path=HERE/'editorial-corrections.json'
    corrections=load(corrections_path) if corrections_path.exists() else []
    correction_map={c['candidateId']:c for c in corrections if c.get('candidateId')}
    contrast_corrections={c['contrastId']:c for c in corrections if c.get('contrastId')}
    rows=[];candidates=[];contrasts=[];issues=[];missing=[];checks=Counter();executions=[]
    for packet in manifest['debates']:
        number=packet['number']; meta=sources[number]
        directory=HERE/'light-reviews'/f'debate-{number:03d}'/'light'
        if not (directory/'execution.json').exists():missing.append(number);continue
        execution=load(directory/'execution.json')
        validator_path=directory/'execution-validator-correction.json'
        validator=load(validator_path) if validator_path.exists() else {}
        corrected=validator.get('originalRecordSha256')==sha(directory/'execution.json') and validator.get('status')=='completed'
        if execution['status']!='completed' and not corrected:issues.append(dict(number=number,issue='review-execution-incomplete'));continue
        output=load(directory/'output.json')
        jsonschema.validate(output,schema)
        assert sha(directory/'output.json')==execution['outputSha256']
        assert execution['packetSha256']==packet['packetSha256']
        assert execution['instructionsSha256']==manifest['instructionsSha256']
        assert execution['protocolSha256']==manifest['protocolSha256']
        assert execution['model']=='gpt-6-astra' and execution['reasoningEffort']=='low'
        assert execution['toolsUsed']==0 and output['coverageComplete'] is True
        source_path=Path(meta['resolvedEventsPath']);assert sha(source_path)==packet['sourceSha256']
        events=load(source_path);words=[len(e['text'].split()) for e in events]
        labels=decode_attribution(output['attribution'],len(events))
        for span in output['teaserSpans']:
            assert 0<=span['startEvent']<=span['endEvent']<len(events)
            for i in range(span['startEvent'],span['endEvent']+1):labels[i]='O'
        for correction in corrections:
            if correction.get('number')==number and correction.get('attribution'):
                for span in correction['attribution']:
                    assert 0<=span['startEvent']<=span['endEvent']<len(events) and span['speaker'] in 'ABOU'
                    for i in range(span['startEvent'],span['endEvent']+1):labels[i]=span['speaker']
        speaker_words=Counter()
        for label,count in zip(labels,words):speaker_words[label]+=count
        tlabel=packet['sideMap'][meta['theist_side']]; nlabel=packet['sideMap'][meta['non_side']]
        row={k:meta[k] for k in ['number','id','title','youtube','cohort','topic','narrow']}
        row.update(theist_speaker=meta['speakers'][meta['theist_side']],non_theist_speaker=meta['speakers'][meta['non_side']],
            theist_words=speaker_words[tlabel],non_theist_words=speaker_words[nlabel],
            unknown_words=speaker_words['U'],excluded_words=speaker_words['O'],source_words=sum(words),
            teaser_spans=len(output['teaserSpans']),source_note=output['sourceNote'])
        for side in ['theist','non_theist']:
            for outcome in OUTCOMES:row[side+'_'+outcome]=0
            row[side+'_unsupported_with_emotion']=0
        seen=set()
        for i,original in enumerate(output['candidates']):
            identifier=f'D{number:03d}-I{i+1:03d}'
            c=dict(original); correction=correction_map.get(identifier)
            if correction:c.update(correction.get('changes',{}))
            q=locate_quote(c,events); checks['quote_'+q['method']]+=1
            if q.get('scope')=='context':checks['quotes_reanchored_within_context']+=1
            first=q.get('verifiedStartEvent',c['startEvent']); last=q.get('verifiedEndEvent',c['endEvent'])
            assert 0<=first<=last<len(events)
            primary_speech=Counter()
            for j in range(first,last+1):primary_speech[labels[j]]+=words[j]
            disposition='eligible'
            if not q['valid']:
                disposition='needs-source-check';issues.append(dict(number=number,candidateId=identifier,issue='quote-not-located',quote=c['quote']))
            elif c['speaker']=='O':disposition='other-speaker'
            elif c['speaker']=='U':disposition='uncertain-speaker'
            elif primary_speech['A']+primary_speech['B']==0:
                disposition='mixed-or-uncertain-event' if primary_speech['U'] else 'outside-attributed-debate-speech'
            elif primary_speech[c['speaker']]==0:
                disposition='needs-source-check';issues.append(dict(number=number,candidateId=identifier,issue='speaker-map-conflict',quote=c['quote']))
            if correction and correction.get('excludeReason'):disposition=correction['excludeReason']
            key=(first,last,normalized(q.get('verifiedQuote',c['quote'])).casefold(),c['speaker'])
            if key in seen:disposition='exact-duplicate'
            seen.add(key)
            position='theist' if c['speaker']==tlabel else 'non_theist' if c['speaker']==nlabel else 'unknown'
            flags=outcomes(c)
            item=dict(c,candidateId=identifier,number=number,position=position,quoteCheck=q,disposition=disposition,
                flags=flags,verifiedStartEvent=first,verifiedEndEvent=last,
                sourceUrl=meta['youtube']+'&t='+str(int(events[first]['startMs']//1000))+'s',
                speakerName=row.get(position+'_speaker'),editoriallyChecked=bool(correction),sourceSha256=packet['sourceSha256'])
            candidates.append(item)
            if disposition=='eligible' and position!='unknown':
                for outcome,yes in flags.items():row[position+'_'+outcome]+=int(yes)
                if flags['unsupported'] and any(x not in ['none','unclear'] for x in c['emotionalDevices']):row[position+'_unsupported_with_emotion']+=1
        for i,original in enumerate(output['contrasts']):
            identifier=f'D{number:03d}-C{i+1:03d}'
            c=dict(original)
            if identifier in contrast_corrections:c.update(contrast_corrections[identifier].get('changes',{}))
            q=locate_quote(c,events)
            contrasts.append(dict(c,contrastId=identifier,number=number,position='theist' if c['speaker']==tlabel else 'non_theist' if c['speaker']==nlabel else 'unknown',quoteCheck=q,
                sourceUrl=meta['youtube']+'&t='+str(int(events[q.get('verifiedStartEvent',c['startEvent'])]['startMs']//1000))+'s'))
            if not q['valid']:checks['unlocated_contrast_quotes']+=1
        assert row['theist_words']+row['non_theist_words']+row['unknown_words']+row['excluded_words']==row['source_words']
        for side in ['theist','non_theist']:
            assert row[side+'_protected_slogan']<=row[side+'_unsupported']
            for outcome in OUTCOMES:row[side+'_'+outcome+'_rate']=10000*row[side+'_'+outcome]/row[side+'_words'] if row[side+'_words'] else None
        rows.append(row); executions.append(dict(number=number,model=execution['model'],reasoningEffort=execution['reasoningEffort'],usage=execution['usage'],
            outputSha256=execution['outputSha256'],startedAt=execution['startedAt'],completedAt=execution['completedAt']))
        checks['validated_reviews']+=1
    status='partial' if missing else 'needs-source-checks' if issues else 'complete'
    cuts={'all':rows,'earlier':[r for r in rows if r['cohort']=='earlier'],'later':[r for r in rows if r['cohort']=='later'],
        'narrow':[r for r in rows if r['narrow']],
        'without_lennox':[r for r in rows if 'John Lennox' not in [r['theist_speaker'],r['non_theist_speaker']]]}
    statistics={name:{outcome:summarize(subset,outcome) for outcome in OUTCOMES} for name,subset in cuts.items()}
    # Simple concentration checks: a large total may come from very few people.
    concentration={}
    for outcome in ['unsupported','protected_slogan']:
        concentration[outcome]={}
        for side in ['theist','non_theist']:
            people=Counter()
            for row in rows:people[row[side+'_speaker']]+=row[side+'_'+outcome]
            total=sum(people.values())
            top=sorted(rows,key=lambda row:row[side+'_'+outcome],reverse=True)[:5]
            concentration[outcome][side]=dict(total=total,
                top_speakers=[dict(speaker=name,count=count) for name,count in people.most_common(5)],
                top_three_speaker_share=sum(count for _,count in people.most_common(3))/total if total else None,
                top_debates=[dict(number=row['number'],speaker=row[side+'_speaker'],count=row[side+'_'+outcome]) for row in top])
    results=dict(status=status,studyVersion='2.0-streamlined',expectedDebates=187,reviewedDebates=len(rows),missingDebates=missing,
        model='gpt-6-astra',reasoningEffort='low',reviewsPerDebate=1,sourceSnapshot='September 4, 2026; 253 assessments',
        checks=dict(checks),issues=issues,statistics=statistics,seed=SEED,resamples=20000,
        coverage={key:sum(r[key] for r in rows) for key in ['source_words','theist_words','non_theist_words','unknown_words','excluded_words','teaser_spans']},
        candidateDispositions=dict(Counter(c['disposition'] for c in candidates)),concentration=concentration,executions=executions)
    dump(HERE/'light-results.json',results);dump(HERE/'light-debates.json',rows);dump(HERE/'light-incidents.json',candidates);dump(HERE/'light-contrasts.json',contrasts)
    if rows:
        with (HERE/'light-debates.csv').open('w',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=list(rows[0]),lineterminator='\n');writer.writeheader();writer.writerows(rows)
    print(json.dumps(dict(status=status,reviewedDebates=len(rows),missingDebates=len(missing),issues=issues,checks=dict(checks)),indent=2))
    if not args.partial:assert status=='complete','Do not publish partial or unresolved research'


if __name__=='__main__':main()
