"""Freeze compact, single-reader Light packets with the same substantive test."""
from pathlib import Path
from intake import HERE, ROOT, load, dump, sha
from prepare import obj, enum, TEXT, INT, TRI, SPEAKER, SPAN, CACHE

SCHEMA = obj(dict(coverageComplete=dict(type='boolean'), sourceNote=TEXT,
    attribution=dict(type='array', items=TEXT),
    teaserSpans=dict(type='array',items=obj(dict(**SPAN,reason=TEXT))),
    candidates=dict(type='array',items=obj(dict(**SPAN,contextStartEvent=INT,contextEndEvent=INT,
        speaker=SPEAKER,quote=TEXT,form=TRI,substitution=TRI,protection=TRI,
        emotionalDevices=dict(type='array',items=enum('comfort','fear','shame','identity','ridicule','none','unclear')),
        confidence=enum('high','medium','low'),explanation=TEXT))),
    contrasts=dict(type='array',items=obj(dict(**SPAN,speaker=SPEAKER,quote=TEXT,explanation=TEXT)))))


def main():
    original=load(HERE/'packet-manifest.json')
    dump(HERE/'light-schema.json',SCHEMA)
    records=[]
    for item in original['debates']:
        assert sha(ROOT/item['packetPath'])==item['packetSha256']
        records.append(item)
    dump(HERE/'light-manifest.json',dict(studyVersion='2.0-streamlined',model='gpt-6-astra',reasoningEffort='low',
        protocolSha256=sha(HERE/'protocol-light.md'),instructionsSha256=sha(HERE/'light-instructions.md'),
        schemaSha256=sha(HERE/'light-schema.json'),debates=records))
    print({'debates':len(records),'reviewsPerDebate':1,'reasoningEffort':'low'})


if __name__=='__main__':main()
