import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
const root='docs/assessment-production/standalone-debates-v1/debate-254/audio';
const summary=JSON.parse(readFileSync(`${root}/pilot-summary-1.json`));
mkdirSync(`${root}/raw-pilot-1`,{recursive:true});
const archived=summary.outputs.map(output=>{
  assert.deepEqual(fileRecord(output.record.path),output.record);
  const path=`${root}/raw-pilot-1/${output.moveId}.json`;
  assert(!existsSync(path));
  writeFileSync(path,readFileSync(output.record.path),{flag:'wx'});
  const copy=fileRecord(path);assert.equal(copy.sha256,output.record.sha256);
  return {moveId:output.moveId,original:output.record,archived:copy};
});
writeFileSync(`${root}/archive-1.json`,JSON.stringify({status:'raw-evidence-preserved-not-attribution-verified',archived},null,2)+'\n',{flag:'wx'});
console.log('Three raw pilot responses archived with matching hashes.');
