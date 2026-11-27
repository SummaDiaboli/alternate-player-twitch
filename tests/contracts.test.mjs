import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { AUDIO_DEVICE_PERMISSION, INTERFACE_LANGUAGE_KEYS, INTERFACE_LANGUAGE_SETTING, INTERFACE_LANGUAGE_VALUES, LEGACY_MESSAGE_PROTOCOL, LEGACY_WORKER_LOG_PROTOCOL, LOCALES, MESSAGE_PROTOCOL, PLAYER_RUNTIME_JS, SHARED_RUNTIME_JS, TEST_EVENT, WORKER_DATA_FIELDS, WORKER_LOG_PROTOCOL, WORKER_SEGMENT_FIELDS } from './contracts.mjs';
import { loadCommon, read } from './harness.mjs';

const html = read('player.html') + '\n' + read('report.html');
const player = read('player.js');
const workerAdapter = read('src/player/workerAdapter.js');
const stringLiterals = source => [...source.matchAll(/'([^'\r\n]*)'|"([^"\r\n]*)"|`([^`]*)`/g)].map(match => match[1] ?? match[2] ?? match[3]);
const content = read('content.js');
const background = read('background.js');
const css = read('player.css');
const manifest = JSON.parse(read('manifest.json'));
const sharedSources = SHARED_RUNTIME_JS.map(read);
const playerModuleSources = PLAYER_RUNTIME_JS.filter(path => path.startsWith('src/player/')).map(read);
const playerSources = [ player, ...playerModuleSources ];
const playerCode = playerSources.join('\n');

function htmlIds(source) {
	return new Set([...source.matchAll(/\bid=(?:"([^"]+)"|'([^"]+)'|([^\s>]+))/g)].map(match => match[1] || match[2] || match[3]));
}

test('shared scripts load before their consumers', () => {
	const playerScripts = [...read('player.html').matchAll(/<script src=([^\s>]+)/g)].map(match => match[1]);
	assert.deepEqual(playerScripts, [...PLAYER_RUNTIME_JS, 'player.js']);

	const contentEntry = manifest.content_scripts.find(entry => entry.js.includes('content.js'));
	assert.ok(contentEntry, 'content script entry not found');
	assert.deepEqual(contentEntry.js, [...SHARED_RUNTIME_JS, 'content.js']);
});

test('shared modules expose their APIs on TW5', () => {
	const { context } = loadCommon();
	const api = vm.runInContext(`({
		messages: TW5.messages,
		helpers: TW5.helpers,
		log: TW5.log,
		i18n: TW5.i18n,
		settings: TW5.settings
	})`, context);
	for (const [name, value] of Object.entries(api)) {
		assert.ok(value, `TW5.${name} is not exposed`);
	}
});

test('every literal element lookup targets an element declared in markup', () => {
	const ids = htmlIds(html);
	for (const match of content.matchAll(/\bid=(?:"([^"]+)"|'([^"]+)'|([^\s>]+))/g)) {
		ids.add(match[1] || match[2] || match[3]);
	}
	const referenced = new Set();
	for (const source of [ ...playerSources, content, ...sharedSources ]) {
		for (const match of source.matchAll(/\belement\(\s*(['"])([^'"]+)\1\s*\)/g)) {
			referenced.add(match[2]);
		}
		for (const match of source.matchAll(/getElementById\(\s*(['"])([^'"]+)\1\s*\)/g)) {
			referenced.add(match[2]);
		}
		for (const match of source.matchAll(/querySelector\(\s*(['"])#([^'"]+)\1\s*\)/g)) {
			referenced.add(match[2]);
		}
	}
	assert.ok(referenced.size > 0);
	for (const id of referenced) {
		assert.ok(ids.has(id), `no markup declares id ${id}`);
	}
});

test('raid test seam is present and stable', () => {
	assert.match(player, new RegExp(`addEventListener\\('${TEST_EVENT}'`));
	assert.match(player, /detail, 'channel'\)/);
});

test('log severity names resolve to exported log methods', () => {
	const logSource = read('src/shared/log.js');
	const exported = new Set([...logSource.matchAll(/^\t\t(log[A-Za-z]+),$/gm)].map(match => match[1]));
	assert.deepEqual([...exported].sort(), Object.values(WORKER_LOG_PROTOCOL).sort());
	assert.doesNotMatch(playerCode, /showState\(\s*'(?:Вот|Окак|Ой)'/);
	for (const match of playerCode.matchAll(/showState\(\s*'(log[A-Za-z]+)'/g)) {
		assert.ok(exported.has(match[1]), `unknown log severity ${match[1]}`);
	}
});

test('worker log severities map legacy wire values to English log methods', () => {
	const worker = read('worker.js');
	const pairs = [
		[ LEGACY_WORKER_LOG_PROTOCOL.info, WORKER_LOG_PROTOCOL.info ],
		[ LEGACY_WORKER_LOG_PROTOCOL.ok, WORKER_LOG_PROTOCOL.ok ],
		[ LEGACY_WORKER_LOG_PROTOCOL.error, WORKER_LOG_PROTOCOL.error ]
	];
	for (const [legacy, english] of pairs) {
		assert.match(worker, new RegExp(`Добавить\\('${legacy}',`));
		assert.match(workerAdapter, new RegExp(`\\[\\s*'${legacy}',\\s*'${english}'\\s*\\]`));
	}
	assert.match(player, /getWorkerLogSeverityName\(importance\[yMarker\]\)/);
});

test('worker segment fields are translated at the player boundary', () => {
	const worker = read('worker.js');
	for (const [playerName, workerName] of Object.entries(WORKER_SEGMENT_FIELDS)) {
		assert.ok(worker.includes(workerName), `worker.js does not use ${workerName}`);
		assert.match(workerAdapter, new RegExp(`\\[\\s*'${playerName}',\\s*'${workerName}'\\s*\\]`));
	}
	for (const [workerName, playerName] of Object.entries(WORKER_DATA_FIELDS)) {
		assert.ok(worker.includes(workerName), `worker.js does not emit ${workerName}`);
		assert.match(workerAdapter, new RegExp(`\\[\\s*'${workerName}',\\s*'${playerName}'\\s*\\]`));
	}
	assert.match(player, /_worker\.postMessage\(toWorkerSegment\(segment\)/);
	assert.doesNotMatch(player, /_worker\.postMessage\(segment\b/);
	assert.match(player, /fromWorkerSegment\(dataModule\[1\]\)/);
	assert.match(player, /fromWorkerData\(workerSegment\.dataValue\)/);
	assert.doesNotMatch(player, /hasOwnProperty\('мбМедиасегмент'\)/);
	assert.match(player, /TW5\.player\.workerAdapter/);
	assert.doesNotMatch(player, /const workerSegmentFields/);
});

test('worker adapter translates segment and result fields at runtime', () => {
	const { context } = loadCommon();
	vm.runInContext(workerAdapter, context, { filename: 'src/player/workerAdapter.js' });
	const api = vm.runInContext('TW5.player.workerAdapter', context);
	assert.ok(api, 'worker adapter is not exposed on TW5.player');
	const buffer = new ArrayBuffer(8);
	const outbound = api.toWorkerSegment({ dataValue: buffer, isGap: true, number: 7, duration: 2 });
	assert.equal(outbound.пДанные, buffer);
	assert.equal(outbound.лРазрыв, true);
	assert.equal(outbound.чНомер, 7);
	assert.equal(outbound.чДлительность, 2);
	const mediaSegmentData = new Uint8Array(4);
	const initSegment = new Uint8Array(2);
	const inbound = {
		пДанные: {
			чПреобразованЗа: 12,
			лЗабраковано: false,
			лПотериВидео: true,
			мбМедиасегмент: mediaSegmentData,
			мбСегментИнициализации: initSegment,
			сКодеки: 'video/mp4;codecs="avc1.4D401F"',
			чЧастотаКадров: 30,
			nProfileIndication: 100
		},
		лРазрыв: false,
		чНомер: 7,
		чДлительность: 2
	};
	const workerSegment = api.fromWorkerSegment(inbound);
	assert.equal(workerSegment.dataValue, inbound.пДанные);
	assert.equal(workerSegment.isGap, false);
	assert.equal(workerSegment.number, 7);
	assert.equal(workerSegment.duration, 2);
	const data = api.fromWorkerData(workerSegment.dataValue);
	assert.equal(data.conversionTime, 12);
	assert.equal(data.isRejected, false);
	assert.equal(data.hasVideoLoss, true);
	assert.equal(data.mediaSegmentData, mediaSegmentData);
	assert.equal(data.isInitSegment, initSegment);
	assert.equal(data.codecString, inbound.пДанные.сКодеки);
	assert.equal(data.frameRate, 30);
	assert.equal(data.nProfileIndication, 100);
	assert.equal(api.fromWorkerData(9), 9);
});

test('playback module exposes the player API through a factory', () => {
	const playback = read('src/player/playback.js');
	const { context } = loadCommon();
	vm.runInContext(playback, context, { filename: 'src/player/playback.js' });
	const api = vm.runInContext('TW5.player.playback.create()', context);
	assert.deepEqual(Object.keys(api).sort(), [
		'addNextSegment', 'applyVolume', 'getBufferFill', 'getDroppedFrameCount',
		'getStreamPlaybackPosition', 'reload', 'seekReplayBack', 'seekReplayForward',
		'setReplaySpeed', 'showState', 'start', 'stop', 'togglePause'
	].sort());
	assert.match(player, /const player = TW5\.player\.playback\.create\(\)/);
});

test('variants module exposes the stream list API through a factory', () => {
	const variants = read('src/player/variants.js');
	const { context } = loadCommon();
	vm.runInContext('var stoppedState = 7;', context);
	vm.runInContext(variants, context, { filename: 'src/player/variants.js' });
	const api = vm.runInContext('TW5.player.variants.create()', context);
	assert.deepEqual(Object.keys(api).sort(), [ 'setStreamVariant', 'start', 'stop' ]);
	assert.match(player, /const listModule = TW5\.player\.variants\.create\(\)/);
});

test('controls module exposes the player UI API through a factory', () => {
	const controls = read('src/player/controls.js');
	const { context } = loadCommon();
	vm.runInContext(controls, context, { filename: 'src/player/controls.js' });
	assert.equal(typeof vm.runInContext('TW5.player.controls.create', context), 'function');
	const apiBlock = controls.slice(controls.lastIndexOf('\t\treturn {'));
	const exported = [...apiBlock.matchAll(/^\t\t\t([A-Za-z][A-Za-z0-9]*),?$/gm)].map(match => match[1]);
	assert.deepEqual(exported.sort(), [
		'getReplaySpeed', 'getState', 'setState', 'start',
		'stopWatchingStream', 'updateTrackCount'
	].sort());
	assert.match(player, /const control = TW5\.player\.controls\.create\(\)/);
});

test('chat module exposes the chat panel API through a factory', () => {
	const chat = read('src/player/chat.js');
	const { context } = loadCommon();
	vm.runInContext(chat, context, { filename: 'src/player/chat.js' });
	const api = vm.runInContext('TW5.player.chat.create()', context);
	assert.deepEqual(Object.keys(api).sort(), [
		'applyPanelPosition', 'applyUrl', 'restore',
		'saveAndApplyClosedPanelState', 'togglePanelState', 'togglePanelPosition'
	].sort());
	assert.match(player, /const chat = TW5\.player\.chat\.create\(\)/);
});

test('stats module exposes the statistics API through a factory', () => {
	const stats = read('src/player/stats.js');
	const { context } = loadCommon();
	vm.runInContext('var events = { addHandler() {} };', context);
	vm.runInContext(stats, context, { filename: 'src/player/stats.js' });
	const api = vm.runInContext('TW5.player.stats.create()', context);
	assert.deepEqual(Object.keys(api).sort(), [
		'clearHistory', 'closeWindow', 'convertedSegmentReceived', 'getFrameDurationSeconds',
		'getReportData', 'getTargetDuration', 'isWindowOpen', 'openWindow',
		'originalSegmentReceived', 'playerBufferExhausted', 'segmentListParsed',
		'segmentLoaded', 'segmentRejected', 'segmentsNotLoaded', 'segmentsQueued',
		'segmentsSkipped', 'someDataDownloaded', 'start', 'updateBufferFullness', 'updateValue'
	].sort());
	assert.match(player, /const stats = TW5\.player\.stats\.create\(\)/);
});

test('theme module exposes the appearance API through a factory', () => {
	const theme = read('src/player/theme.js');
	const { context } = loadCommon();
	vm.runInContext(theme, context, { filename: 'src/player/theme.js' });
	const api = vm.runInContext('TW5.player.theme.create()', context);
	assert.deepEqual(Object.keys(api), [ 'start' ]);
	assert.match(player, /const themeModule = TW5\.player\.theme\.create\(\)/);
});

test('interface language selector is wired to the saved setting', () => {
	assert.match(html, new RegExp(`data-i18n=${INTERFACE_LANGUAGE_KEYS.label}`));
	assert.match(html, new RegExp(`data-i18n=\\^${INTERFACE_LANGUAGE_KEYS.tooltip}`));
	assert.match(html, new RegExp(`<option value=auto data-i18n=${INTERFACE_LANGUAGE_KEYS.browserDefault}>`));
	for (const languageCode of LOCALES) {
		assert.match(html, new RegExp(`<option value=${languageCode}>`), `missing option ${languageCode}`);
	}
	assert.match(playerCode, new RegExp(`i18n\\.prepare\\(settings\\.get\\('${INTERFACE_LANGUAGE_SETTING}'\\)\\)`));
	assert.match(playerCode, new RegExp(`settings\\.set\\('${INTERFACE_LANGUAGE_SETTING}', languageCode\\)`));
	assert.match(playerCode, /window\.location\.reload\(\)/);
});

test('audio device permission is declared as optional and requested at runtime', () => {
	assert.ok(manifest.optional_permissions?.includes(AUDIO_DEVICE_PERMISSION), `${AUDIO_DEVICE_PERMISSION} must be declared as optional`);
	assert.ok(!manifest.permissions?.includes(AUDIO_DEVICE_PERMISSION), `${AUDIO_DEVICE_PERMISSION} should not be a required permission`);
	assert.match(player, new RegExp(`permissions: \\[ '${AUDIO_DEVICE_PERMISSION}' \\]`));
	assert.match(player, /chrome\.contentSettings\.microphone\.set\(/);
});

test('runtime message values agree between senders and listeners', () => {
	assert.match(content, new RegExp(`request: '${MESSAGE_PROTOCOL.insertThirdParty}'`));
	assert.match(background, new RegExp(`message\\.request === '${MESSAGE_PROTOCOL.insertThirdParty}' \\|\\| message\\.request === '${LEGACY_MESSAGE_PROTOCOL.insertThirdParty}'`));
	assert.match(content, new RegExp(`requestText: '${MESSAGE_PROTOCOL.raid}'`));
	assert.match(player, new RegExp(`isRaidRequest = message\\.requestText === '${LEGACY_MESSAGE_PROTOCOL.raid}' \\|\\| message\\.requestText === '${MESSAGE_PROTOCOL.raid}'`));
	assert.match(player, new RegExp(`message\\.requestText === '${LEGACY_MESSAGE_PROTOCOL.alreadyOpen}' \\|\\| message\\.requestText === '${MESSAGE_PROTOCOL.alreadyOpen}'`));
	assert.ok(player.split(MESSAGE_PROTOCOL.alreadyOpen).length >= 2, 'already-open request is sent and handled');
	assert.doesNotMatch(content, new RegExp(`requestText: '${LEGACY_MESSAGE_PROTOCOL.raid}'`));
	assert.doesNotMatch(player, new RegExp(`requestText: '${LEGACY_MESSAGE_PROTOCOL.alreadyOpen}'`));
});

test('dynamic scroll indicator id matches player.html', () => {
	assert.match(player, /scroll-indicator-\$\{scrollElement\.id\}/);
	assert.match(html, /\bid=scroll-indicator-news-body\b/);
});

test('theme color inputs map to settings and CSS custom properties', () => {
	const pairs = [
		[ 'background-color', 'backgroundColor' ],
		[ 'gradient-color', 'gradientColor' ],
		[ 'button-color', 'buttonColor' ],
		[ 'header-color', 'titleColor' ],
		[ 'selection-color', 'selectionColor' ]
	];
	const colorIds = [...html.matchAll(/<input[^>]*\bid=([^\s>]+)[^>]*\btype=color\b/g)].map(match => match[1]);
	assert.deepEqual(colorIds.sort(), pairs.map(([id]) => id).sort());
	const settingsSource = read('src/shared/settings.js');
	for (const [id, settingName] of pairs) {
		assert.match(html, new RegExp(`\\bid=${id}\\b`));
		assert.match(css, new RegExp(`--${id}\\b`));
		assert.match(settingsSource, new RegExp(`\\b${settingName}: setting\\.`));
		assert.match(playerCode, new RegExp(`\\[\\s*'${id}',\\s*'${settingName}'\\s*\\]`));
	}
	assert.doesNotMatch(html, /-color-setting\b/);
});

test('CSS class selectors refer to classes declared in markup or script', () => {
	const declared = new Set();
	for (const match of html.matchAll(/\bclass=(?:"([^"]+)"|'([^"]+)'|([^\s>]+))/g)) {
		for (const name of (match[1] || match[2] || match[3]).split(/\s+/)) declared.add(name);
	}
	for (const source of [html, ...playerSources, content, ...sharedSources]) {
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
