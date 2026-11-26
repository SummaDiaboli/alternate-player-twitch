import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEGACY_INSERT_THIRD_PARTY, MESSAGE_PROTOCOL, MESSAGE_PROTOCOL_ENGLISH, TEST_EVENT } from './contracts.mjs';
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

test('log severity names resolve to exported log methods', () => {
	const common = read('common.js');
	const exported = new Set([...common.matchAll(/^\t\t(log[A-Za-z]+),$/gm)].map(match => match[1]));
	assert.deepEqual([...exported].sort(), ['logError', 'logInfo', 'logOk']);
	assert.doesNotMatch(player, /'(?:Вот|Окак|Ой)'/);
	for (const match of player.matchAll(/showState\(\s*'(log[A-Za-z]+)'/g)) {
		assert.ok(exported.has(match[1]), `unknown log severity ${match[1]}`);
	}
});

test('runtime message values agree between senders and listeners', () => {
	assert.match(content, new RegExp(`request: '${MESSAGE_PROTOCOL.insertThirdParty}'`));
	assert.match(background, new RegExp(`message\\.request === '${MESSAGE_PROTOCOL.insertThirdParty}' \\|\\| message\\.request === '${LEGACY_INSERT_THIRD_PARTY}'`));
	assert.match(content, new RegExp(`requestText: '${MESSAGE_PROTOCOL.raid}'`));
	assert.match(player, new RegExp(`isRaidRequest = message\\.requestText === '${MESSAGE_PROTOCOL.raid}' \\|\\| message\\.requestText === '${MESSAGE_PROTOCOL_ENGLISH.raid}'`));
	assert.match(player, new RegExp(`message\\.requestText === '${MESSAGE_PROTOCOL.alreadyOpen}' \\|\\| message\\.requestText === '${MESSAGE_PROTOCOL_ENGLISH.alreadyOpen}'`));
	assert.ok(player.split(MESSAGE_PROTOCOL.alreadyOpen).length >= 3, 'already-open request is sent and handled');
});

test('dynamic scroll indicator id matches player.html', () => {
	assert.match(player, /scroll-indicator-\$\{scrollElement\.id\}/);
	assert.match(html, /\bid=scroll-indicator-news-body\b/);
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
