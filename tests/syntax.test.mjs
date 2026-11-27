import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { FIRST_PARTY_JS } from './contracts.mjs';
import { read } from './harness.mjs';

for (const file of FIRST_PARTY_JS) {
	test(`${file} parses as JavaScript`, () => {
		const result = spawnSync(process.execPath, ['--check', file], { cwd: process.cwd(), encoding: 'utf8' });
		assert.equal(result.status, 0, result.stderr);
		assert.match(read(file), /'use strict';/);
	});
}
