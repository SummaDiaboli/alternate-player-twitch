import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXPECTED_SETTINGS_VERSION } from './contracts.mjs';
import { loadCommon } from './harness.mjs';
import { LEGACY_STORAGE_KEYS, legacyStorage } from './legacy-keys.mjs';

const version2Values = {
	settingsVersion: 2,
	randomNumber: .25,
	previousVersionName: '2024.1.1',
	lastExtensionUpdateCheck: 1234,
	volume2: 137,
	volumeBoostEnabled: true,
	isMuted: true,
	audioDeviceId: 'device-1',
	variantName: 'TestVariant',
	variantBitrate: 12345,
	replayDuration2: 90,
	shouldScaleImage: false,
	chatState: 2,
	closedChatStateCode: 1,
	isChatAutoPosition: true,
	chatHorizontalPosition: 4,
	chatVerticalPosition: 1,
	chatPanelPosition: 4,
	chatPanelWidth: 400,
	chatPanelHeight: 321,
	isFullChat: false,
	shouldDimChat: true,
	followRaids: true,
	uiSize: 123,
	autoHideInterval: 12,
	isUiAnimationEnabled: false,
	shouldChangeVolumeWithWheel: false,
	wheelVolumeStep: -3,
	shouldShowStats: true,
	selectedBufferingPreset: 'J0129',
	isBufferingPresetFilled: true,
	concurrentLoadCount: 2,
	playbackStartMs: 2.5,
	bufferSize: 3.5,
	bufferStretchMs: 11,
	selectedThemePreset: 'J0123',
	isThemePresetFilled: true,
	backgroundColor: '#123456',
	gradientColor: '#abcdef',
	buttonColor: '#654321',
	titleColor: '#fedcba',
	selectionColor: '#111111',
	opacityValue: 44,
	isAutoRedirectAllowed: false,
	isAutoRedirectDetected: true
};

test('version-2 settings migrate to English storage keys without value loss', async () => {
	assert.deepEqual(Object.keys(version2Values).sort(), Object.keys(LEGACY_STORAGE_KEYS).sort());
	const { settings, storageData, calls } = loadCommon({ storage: legacyStorage(version2Values) });
	await settings.restore();
	assert.deepEqual(calls.writes, [], 'restore must not write before the deferred save');
	settings.flushChanges();

	for (const [name, expected] of Object.entries(version2Values)) {
		assert.equal(settings.get(name), expected, `${name} keeps its value`);
	}
	for (const legacyName of Object.values(LEGACY_STORAGE_KEYS)) {
		assert.equal(storageData[legacyName], void 0, `${legacyName} is removed`);
	}
	assert.equal(storageData.settingsVersion, EXPECTED_SETTINGS_VERSION);
	assert.ok(!calls.writes.some(write => write.type === 'clear'), 'valid settings are never cleared');

	const setWrites = calls.writes.filter(write => write.type === 'set');
	assert.equal(setWrites.length, 1);
	for (const name of Object.keys(version2Values)) {
		assert.ok(Object.hasOwn(setWrites[0].values, name), `${name} is written with its new key`);
	}
	const removeWrites = calls.writes.filter(write => write.type === 'remove');
	assert.equal(removeWrites.length, 1);
	assert.deepEqual(removeWrites[0].keys.sort(), Object.values(LEGACY_STORAGE_KEYS).sort());
});
