"""Record a mechanical validator correction without changing model output."""
import jsonschema
from intake import HERE, load, dump, sha
from analyze_light import decode_attribution

directory = HERE / 'light-reviews/debate-005/light'
record = load(directory / 'execution.json')
output = load(directory / 'output.json')
packet = next(d for d in load(HERE/'light-manifest.json')['debates'] if d['number']==5)
jsonschema.validate(output, load(HERE/'light-schema.json'))
labels = decode_attribution(output['attribution'], packet['eventCount'])
assert output['coverageComplete'] and record['exit']['code']==0 and record['toolsUsed']==0
assert all(i.startswith('invalid-attribution-') for i in record['issues'])
assert sha(directory/'output.json')==record['outputSha256']
dump(directory/'execution-validator-correction.json', {
    'originalRecordSha256': sha(directory/'execution.json'),
    'status': 'completed',
    'reason': 'The reader used unambiguous single-event shorthand such as 1048:B. Accept this as 1048-1048:B. Full ordered gap-free event coverage is verified; no source labels or substantive judgments are changed.',
    'verifiedEvents': len(labels),
    'modelOutputUnchanged': True
})
