import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCALES } from './contracts.mjs';
import { loadCommon, read, readJson } from './harness.mjs';

const localeFiles = Object.fromEntries(LOCALES.map(locale => [locale, readJson(`_locales/${locale}/messages.json`)]));
const keySets = Object.fromEntries(LOCALES.map(locale => [locale, new Set(Object.keys(localeFiles[locale]))]));

function placeholders(message) {
	return [...message.matchAll(/\$\d/g)].map(match => match[0]).sort().join(',');
}

test('all locales declare the same keys', () => {
	const reference = keySets.en;
	for (const locale of LOCALES.slice(1)) {
		assert.deepEqual([...keySets[locale]].sort(), [...reference].sort(), `${locale} key set differs`);
	}
});

test('placeholders match across locales', () => {
	for (const key of Object.keys(localeFiles.en)) {
		const expected = placeholders(localeFiles.en[key].message);
		for (const locale of LOCALES.slice(1)) {
			assert.equal(placeholders(localeFiles[locale][key].message), expected, `${locale}:${key} placeholders differ`);
		}
	}
});

test('every statically referenced message key exists in every locale', () => {
	const sources = ['player.html', 'common.js', 'content.js', 'player.js', 'background.js'];
	const referenced = new Set();
	for (const file of sources) {
		const text = read(file);
		for (const match of text.matchAll(/data-i18n=(?:"([^"]+)"|'([^"]+)'|([^\s>]+))/g)) {
			for (const name of (match[1] || match[2] || match[3]).split('^')) {
				if (name) referenced.add(name);
			}
		}
		for (const match of text.matchAll(/(?:GetMessage|getMessageText)\('([^']+)'\)/g)) {
			referenced.add(match[1]);
		}
	}
	assert.ok(referenced.size > 0);
	for (const key of referenced) {
		for (const locale of LOCALES) {
			assert.ok(keySets[locale].has(key), `${locale} is missing ${key}`);
		}
	}
});

test('English developer descriptions contain no Russian text', () => {
	for (const [key, entry] of Object.entries(localeFiles.en)) {
		assert.doesNotMatch(entry.description ?? '', /[\u0400-\u04FF]/, `${key} has a Russian description`);
	}
});

test('message lookup resolves and throws for unknown keys', () => {
	const { i18n } = loadCommon();
	assert.ok(i18n.GetMessage('M0001').length > 0);
	assert.throws(() => i18n.GetMessage('NO_SUCH_KEY'));
});
