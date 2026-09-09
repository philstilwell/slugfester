import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOwnershipReplacement} from './lib/assessment-team-ownership-recovery-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,6);assert.equal(args[0],'--packet');assert.equal(args[2],'--output');assert.equal(args[4],'--pass');assert(['pass-a','pass-b'].includes(args[5]));
console.log(JSON.stringify(validateOwnershipReplacement(JSON.parse(readFileSync(args[1])),JSON.parse(readFileSync(args[3])),args[5])));
