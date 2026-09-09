import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTeamTagReview,validateTeamTagAdjudication} from './lib/assessment-team-tags-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,5);assert.equal(args[0],'--packet');assert.equal(args[2],'--file');assert(['--review','--adjudication'].includes(args[4]));
const read=p=>JSON.parse(readFileSync(p,'utf8'));console.log(JSON.stringify((args[4]==='--review'?validateTeamTagReview:validateTeamTagAdjudication)(read(args[1]),read(args[3]))));
