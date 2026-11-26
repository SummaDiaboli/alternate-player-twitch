import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCommon } from './harness.mjs';
import { EXPECTED_SETTINGS_VERSION, SETTING_API, SETTING_DEFAULTS, SETTING_KEYS } from './contracts.mjs';
import { legacyStorage } from './legacy-keys.mjs';

test('settings exposes the expected public API', () => {
	const { settings } = loadCommon();
	for (const name of SETTING_API) {
		assert.equal(typeof settings[name], 'function', `${name} is not a function`);
	}
});

test('empty storage produces documented defaults', async () => {
	const { settings } = loadCommon();
	await settings.restore();
	assert.equal(settings.get(SETTING_KEYS.version), EXPECTED_SETTINGS_VERSION);
	for (const [logicalName, expected] of Object.entries(SETTING_DEFAULTS)) {
		assert.equal(settings.get(SETTING_KEYS[logicalName]), expected, logicalName);
	}
});

test('stored values survive a restore', async () => {
	const key = SETTING_KEYS.followRaids;
	const { settings } = loadCommon({ storage: {
		[SETTING_KEYS.version]: EXPECTED_SETTINGS_VERSION,
		[key]: true,
		[SETTING_KEYS.volume]: 73
	} });
	await settings.restore();
	assert.equal(settings.get(key), true);
	assert.equal(settings.get(SETTING_KEYS.volume), 73);
});

test('interface language survives a restore', async () => {
	const key = SETTING_KEYS.interfaceLanguage;
	const { settings } = loadCommon({ storage: {
		[SETTING_KEYS.version]: EXPECTED_SETTINGS_VERSION,
		[key]: 'de'
	} });
	await settings.restore();
	assert.equal(settings.get(key), 'de');
});

test('out-of-range and invalid values are corrected', async () => {
	const { settings } = loadCommon({ storage: {
		[SETTING_KEYS.version]: EXPECTED_SETTINGS_VERSION,
		[SETTING_KEYS.volume]: 9999,
		[SETTING_KEYS.chatState]: 42,
		[SETTING_KEYS.interfaceLanguage]: 'xx'
	} });
	await settings.restore();
	assert.equal(settings.get(SETTING_KEYS.volume), 200);
	assert.equal(settings.get(SETTING_KEYS.chatState), SETTING_DEFAULTS.chatState);
	assert.equal(settings.get(SETTING_KEYS.interfaceLanguage), SETTING_DEFAULTS.interfaceLanguage);
});

test('version-2 settings migrate to English storage keys', async () => {
	const { settings, storageData } = loadCommon({ storage: {
		'чВерсияНастроек': 2,
		'лСледоватьЗаРейдами': true,
		'чГромкость2': 73
	} });
	await settings.restore();
	settings.flushChanges();
	assert.equal(settings.get(SETTING_KEYS.followRaids), true);
	assert.equal(settings.get(SETTING_KEYS.volume), 73);
	assert.equal(storageData.followRaids, true);
	assert.equal(storageData.volume2, 73);
	assert.equal(storageData['лСледоватьЗаРейдами'], void 0);
});

test('new storage keys take precedence over legacy aliases', async () => {
	const { settings, storageData } = loadCommon({ storage: {
		...legacyStorage({ settingsVersion: 2, followRaids: false, volume2: 1 }),
		settingsVersion: 2,
		followRaids: true,
		volume2: 73
	} });
	await settings.restore();
	settings.flushChanges();
	assert.equal(settings.get('followRaids'), true);
	assert.equal(settings.get('volume2'), 73);
});

test('unrecognized settings version clears storage', async () => {
	const { settings, calls, storageData } = loadCommon({ storage: {
		[SETTING_KEYS.version]: 9999,
		[SETTING_KEYS.followRaids]: true
	} });
	await settings.restore();
	settings.flushChanges();
	assert.equal(settings.get(SETTING_KEYS.followRaids), false);
	assert.ok(calls.writes.some(write => write.type === 'clear'));
	assert.equal(storageData[SETTING_KEYS.followRaids], void 0);
});
