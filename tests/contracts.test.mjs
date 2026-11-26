import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MESSAGE_PROTOCOL, TEST_EVENT } from './contracts.mjs';
import { read } from './harness.mjs';

const html = read('player.html') + '\n' + read('report.html');
const player = read('player.js');
const stringLiterals = source => [...source.matchAll(/'([^'\r\n]*)'|"([^"\r\n]*)"|`([^`]*)`/g)].map(match => match[1] ?? match[2] ?? match[3]);
const content = read('content.js');
const background = read('background.js');
const css = read('player.css');

function htmlIds(source) {
	return new Set([...source.matchAll(/\bid=(?:"([^"]+)"|'([^"]+)'|([^\s>]+))/g)].map(match => match[1] || match[2] || match[3]));
}

test('every element lookup in first-party JS targets an element in player.html', () => {
	const ids = htmlIds(html);
	for (const source of [player, content, read('common.js')]) {
		for (const literal of stringLiterals(source)) ids.add(literal);
	}
	const referenced = new Set();
	for (const source of [player, content, read('common.js')]) {
		for (const match of source.matchAll(/(?:getElementById|Узел)\('([^']+)'\)/g)) {
			referenced.add(match[1]);
		}
		for (const match of source.matchAll(/querySelector\('#([^']+)'\)/g)) {
			referenced.add(match[1]);
		}
	}
	assert.ok(referenced.size > 0);
	for (const id of referenced) {
		assert.ok(ids.has(id), `player.html has no element with id ${id}`);
	}
});

test('raid test seam is present and stable', () => {
	assert.match(player, new RegExp(`addEventListener\\('${TEST_EVENT}'`));
	assert.match(player, /detail, 'channel'\)/);
});

test('runtime message values agree between senders and listeners', () => {
	assert.match(content, new RegExp(`request: '${MESSAGE_PROTOCOL.insertThirdParty}'`));
	assert.match(background, new RegExp(`message\\.request === '${MESSAGE_PROTOCOL.insertThirdParty}'`));
	assert.match(content, new RegExp(`сЗапрос: '${MESSAGE_PROTOCOL.raid}'`));
	assert.match(player, new RegExp(`сЗапрос === '${MESSAGE_PROTOCOL.raid}'`));
	assert.ok(player.split(MESSAGE_PROTOCOL.alreadyOpen).length >= 3, 'already-open request is sent and handled');
});

test('CSS class selectors refer to classes declared in markup or script', () => {
	const declared = new Set();
	for (const match of html.matchAll(/\bclass=(?:"([^"]+)"|'([^"]+)'|([^\s>]+))/g)) {
		for (const name of (match[1] || match[2] || match[3]).split(/\s+/)) declared.add(name);
	}
	for (const source of [html, player, content, read('common.js')]) {
		for (const literal of stringLiterals(source)) {
			for (const name of literal.split(/\s+/)) declared.add(name);
		}
	}
	const selectors = new Set([...css.matchAll(/(?:^|[\s,>+~{([])\.([-\u0400-\u04FFa-zA-Z_][-\u0400-\u04FFa-zA-Z0-9_]*)/gm)].map(match => match[1]));
	assert.ok(selectors.size > 0);
	for (const selector of selectors) {
		assert.ok(declared.has(selector), `CSS selector .${selector} has no matching class`);
	}
});
