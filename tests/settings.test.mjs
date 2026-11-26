import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCommon } from './harness.mjs';
import { EXPECTED_SETTINGS_VERSION, SETTING_API, SETTING_DEFAULTS, SETTING_KEYS } from './contracts.mjs';

test('settings exposes the expected public API', () => {
	const { settings } = loadCommon();
	for (const name of SETTING_API) {
		assert.equal(typeof settings[name], 'function', `${name} is not a function`);
	}
});

test('empty storage produces documented defaults', async () => {
	const { settings } = loadCommon();
	await settings.Восстановить();
	assert.equal(settings.Получить(SETTING_KEYS.version), EXPECTED_SETTINGS_VERSION);
	for (const [logicalName, expected] of Object.entries(SETTING_DEFAULTS)) {
		assert.equal(settings.Получить(SETTING_KEYS[logicalName]), expected, logicalName);
	}
});

test('stored values survive a restore', async () => {
	const key = SETTING_KEYS.followRaids;
	const { settings } = loadCommon({ storage: {
		[SETTING_KEYS.version]: EXPECTED_SETTINGS_VERSION,
		[key]: true,
		[SETTING_KEYS.volume]: 73
	} });
	await settings.Восстановить();
	assert.equal(settings.Получить(key), true);
	assert.equal(settings.Получить(SETTING_KEYS.volume), 73);
});

test('out-of-range and invalid values are corrected', async () => {
	const { settings } = loadCommon({ storage: {
		[SETTING_KEYS.version]: EXPECTED_SETTINGS_VERSION,
		[SETTING_KEYS.volume]: 9999,
		[SETTING_KEYS.chatState]: 42
	} });
	await settings.Восстановить();
	assert.equal(settings.Получить(SETTING_KEYS.volume), 200);
	assert.equal(settings.Получить(SETTING_KEYS.chatState), SETTING_DEFAULTS.chatState);
});

test('unrecognized settings version clears storage', async () => {
	const { settings, calls, storageData } = loadCommon({ storage: {
		[SETTING_KEYS.version]: 9999,
		[SETTING_KEYS.followRaids]: true
	} });
	await settings.Восстановить();
	settings.СохранитьИзменения();
	assert.equal(settings.Получить(SETTING_KEYS.followRaids), false);
	assert.ok(calls.writes.some(write => write.type === 'clear'));
	assert.equal(storageData[SETTING_KEYS.followRaids], void 0);
});
