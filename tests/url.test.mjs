import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCommon } from './harness.mjs';
import { PLAYER_URL_PREFIX } from './contracts.mjs';

const { getPlayerUrl } = loadCommon();

test('player URL uses the extension player page and channel query', () => {
	assert.equal(getPlayerUrl('targetchannel'), PLAYER_URL_PREFIX + 'targetchannel');
});

test('player URL encodes channel codes', () => {
	assert.equal(getPlayerUrl('some channel/name'), PLAYER_URL_PREFIX + 'some%20channel%2Fname');
});
