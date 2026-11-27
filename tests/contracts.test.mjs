import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { AUDIO_DEVICE_PERMISSION, BACKGROUND_ENTRY_JS, CONTENT_ENTRY_JS, CONTENT_RUNTIME_JS, INTERFACE_LANGUAGE_KEYS, INTERFACE_LANGUAGE_SETTING, INTERFACE_LANGUAGE_VALUES, LEGACY_MESSAGE_PROTOCOL, LEGACY_WORKER_LOG_PROTOCOL, LOCALES, MESSAGE_PROTOCOL, PLAYER_ENTRY_JS, PLAYER_RUNTIME_JS, SHARED_RUNTIME_JS, TEST_EVENT, WORKER_DATA_FIELDS, WORKER_LOG_PROTOCOL, WORKER_SEGMENT_FIELDS } from './contracts.mjs';
import { loadCommon, read } from './harness.mjs';

const html = read('player.html') + '\n' + read('report.html');
const player = read(PLAYER_ENTRY_JS);
const workerAdapter = read('src/player/workerAdapter.js');
const stringLiterals = source => [...source.matchAll(/'([^'\r\n]*)'|"([^"\r\n]*)"|`([^`]*)`/g)].map(match => match[1] ?? match[2] ?? match[3]);
const content = read(CONTENT_ENTRY_JS);
const contentSources = [ content, ...CONTENT_RUNTIME_JS.filter(path => path.startsWith('src/content/')).map(read) ];
const contentCode = contentSources.join('\n');
const background = read(BACKGROUND_ENTRY_JS);
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
	assert.deepEqual(playerScripts, [...PLAYER_RUNTIME_JS, PLAYER_ENTRY_JS]);

	const contentEntry = manifest.content_scripts.find(entry => entry.js.includes(CONTENT_ENTRY_JS));
	assert.ok(contentEntry, 'content script entry not found');
	assert.deepEqual(contentEntry.js, [...CONTENT_RUNTIME_JS, CONTENT_ENTRY_JS]);
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
	for (const match of contentCode.matchAll(/\bid=(?:"([^"]+)"|'([^"]+)'|([^\s>]+))/g)) {
		ids.add(match[1] || match[2] || match[3]);
	}
	const referenced = new Set();
	for (const source of [ ...playerSources, ...contentSources, ...sharedSources ]) {
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
	assert.match(playerCode, new RegExp(`addEventListener\\('${TEST_EVENT}'`));
	assert.match(playerCode, /detail, 'channel'\)/);
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
	assert.match(playerCode, /getWorkerLogSeverityName\(importance\[yMarker\]\)/);
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
	assert.match(playerCode, /_worker\.postMessage\(toWorkerSegment\(segment\)/);
	assert.doesNotMatch(playerCode, /_worker\.postMessage\(segment\b/);
	assert.match(playerCode, /fromWorkerSegment\(dataModule\[1\]\)/);
	assert.match(playerCode, /fromWorkerData\(workerSegment\.dataValue\)/);
	assert.doesNotMatch(playerCode, /hasOwnProperty\('мбМедиасегмент'\)/);
	assert.match(playerCode, /TW5\.player\.workerAdapter/);
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

test('news module exposes the help API through a factory', () => {
	const news = read('src/player/news.js');
	const { context } = loadCommon();
	vm.runInContext(news, context, { filename: 'src/player/news.js' });
	const api = vm.runInContext('TW5.player.news.create()', context);
	assert.deepEqual(Object.keys(api).sort(), [ 'openHelp', 'openNews', 'start' ]);
	assert.match(player, /const newsModule = TW5\.player\.news\.create\(\)/);
});

test('support modules expose their APIs through factories', () => {
	const modules = {
		debug: { variable: 'debug', exported: [
			'exceptionCaught', 'finishAndSendFeedback', 'finishAndSendReport',
			'finishAndShowMessage', 'saveConvertedSegment', 'saveSegmentList',
			'saveStreamToken', 'saveTransportStream', 'saveVariantList'
		] },
		events: { variable: 'events', exported: [ 'addHandler', 'removeHandler', 'sendEvent' ] },
		focus: { variable: 'magicianModule', exported: [ 'getState' ] },
		pulse: { variable: 'pulseModule', exported: [ 'getReportData' ] }
	};
	for (const [name, { variable, exported }] of Object.entries(modules)) {
		const source = read(`src/player/${name}.js`);
		const { context } = loadCommon();
		vm.runInContext(source, context, { filename: `src/player/${name}.js` });
		assert.equal(typeof vm.runInContext(`TW5.player.${name}.create`, context), 'function');
		const apiBlock = source.slice(source.lastIndexOf('\t\treturn {'));
		const actual = [...apiBlock.matchAll(/^\t\t\t([A-Za-z][A-Za-z0-9]*),?$/gm)].map(match => match[1]);
		assert.deepEqual(actual.sort(), exported.sort(), `${name} API mismatch`);
		assert.match(player, new RegExp(`const ${variable} = TW5\\.player\\.${name}\\.create\\(\\)`));
	}
	const trash = read('src/player/trash.js');
	const { context } = loadCommon();
	vm.runInContext(trash, context, { filename: 'src/player/trash.js' });
	assert.equal(typeof vm.runInContext('TW5.player.trash.create', context), 'function');
	assert.match(trash, /discard: placeholder/);
	assert.match(trash, /new dumpsterInMessageChannel\(\)/);
	assert.match(player, /const trashModule = TW5\.player\.trash\.create\(\)/);
});

test('UI modules expose their APIs through factories', () => {
	const modules = {
		windows: { variable: 'windowModule', exported: [ 'close', 'open', 'setupScrollIndicator', 'toggle' ] },
		menu: { variable: 'menu', exported: [ 'setItemAvailability' ] },
		fullscreen: { variable: 'fullscreenMode', exported: [ 'disable', 'getElement', 'isEnabled2', 'toggle2' ] },
		pictureInPicture: { variable: 'pictureInPictureModule', exported: [ 'disableControl', 'startInternal', 'toggle' ] },
		dragger: { variable: 'draggerModule', exported: [ 'cancelDrag' ] },
		autoHide: { variable: 'autoHide', exported: [ 'hide', 'show', 'start' ] },
		mediaQuery: { variable: 'mediaQuery', exported: [ 'refreshFast', 'updateSlowly' ] },
		notification: { variable: 'notification', exported: [ 'show', 'showButt', 'showHappiness' ] },
		scale: { variable: 'scale', exported: [ 'getEnd', 'getStart', 'setStartAndEnd', 'setWatched' ] }
	};
	for (const [name, { variable, exported }] of Object.entries(modules)) {
		const source = read(`src/player/${name}.js`);
		const { context } = loadCommon();
		vm.runInContext(source, context, { filename: `src/player/${name}.js` });
		assert.equal(typeof vm.runInContext(`TW5.player.${name}.create`, context), 'function');
		const apiBlock = source.slice(source.lastIndexOf('\t\treturn {'));
		const actual = [...apiBlock.matchAll(/^\t\t\t([A-Za-z][A-Za-z0-9]*),?$/gm)].map(match => match[1]);
		assert.deepEqual(actual.sort(), exported.sort(), `${name} API mismatch`);
		assert.match(player, new RegExp(`const ${variable} = TW5\\.player\\.${name}\\.create\\(\\)`));
	}
});

test('media modules expose their APIs through factories', () => {
	const modules = {
		audioDevices: { variable: 'audioDeviceModule', exported: [ 'startInternal' ] },
		volumeBoost: { variable: 'volumeBoostModule', exported: [ 'apply', 'resume', 'selectDevice', 'startInternal' ] },
		converter: { variable: 'converterModule', exported: [ 'convertNextSegment', 'stop' ] },
		loader: { variable: 'loader', exported: [ 'load', 'loadJson', 'loadText', 'loadNextSegment' ] }
	};
	for (const [name, { variable, exported }] of Object.entries(modules)) {
		const source = read(`src/player/${name}.js`);
		const { context } = loadCommon();
		vm.runInContext(source, context, { filename: `src/player/${name}.js` });
		assert.equal(typeof vm.runInContext(`TW5.player.${name}.create`, context), 'function');
		const apiBlock = source.slice(source.lastIndexOf('\t\treturn {'));
		const actual = [...apiBlock.matchAll(/^\t\t\t([A-Za-z][A-Za-z0-9]*),?$/gm)].map(match => match[1]);
		assert.deepEqual(actual.sort(), exported.sort(), `${name} API mismatch`);
		assert.match(player, new RegExp(`const ${variable} = TW5\\.player\\.${name}\\.create\\(\\)`));
	}
});

test('Twitch module exposes the integration API through a factory', () => {
	const twitch = read('src/player/twitch.js');
	const { context } = loadCommon();
	vm.runInContext(twitch, context, { filename: 'src/player/twitch.js' });
	assert.equal(typeof vm.runInContext('TW5.player.twitch.create', context), 'function');
	const apiBlock = twitch.slice(twitch.lastIndexOf('\t\treturn {'));
	const exported = [...apiBlock.matchAll(/^\t\t\t([A-Za-z][A-Za-z0-9]*),?$/gm)].map(match => match[1]);
	assert.deepEqual(exported.sort(), [
		'changeViewerSubscriptionToChannel', 'checkUrlAvailability', 'closeChat',
		'createClip', 'finishStreamMetadataCollection', 'getAbsoluteOptionListUrl',
		'getAbsoluteSegmentListUrl', 'getChannelUrl', 'getRecordUrlForCurrentPosition',
		'isAdSegment', 'openChat', 'sendAdTrackingData', 'sortVariantList',
		'startCollectingStreamMetadata', 'startInternal'
	].sort());
	assert.match(player, /const Twitch = TW5\.player\.twitch\.create\(\)/);
});

test('content button is available on every top-frame page', () => {
	const navigation = read('src/content/navigation.js');
	assert.match(navigation, /function isOurButtonPage\(\)/);
	assert.match(navigation, /return !!globalParsedAddress;/);
	assert.match(navigation, /if \(!isOurButtonPage\(\)\) \{\s*return false;\s*\}/);
	assert.match(navigation, /if \(window\.top === window\) \{\s*watchPageMarkup\(\);\s*watchUrl\(\);\s*\}/);
	assert.match(navigation, /event\.button === leftButton && addressObject\.page === 'POSSIBLE_LIVE_STREAM'/);
	assert.doesNotMatch(navigation, /addressValue\.page === 'POSSIBLE_LIVE_STREAM' && window\.top === window/);
});

test('Twitch site dark theme is bridged to the player chat', () => {
	const chatTheme = read('src/content/chatTheme.js');
	const twitch = read('src/player/twitch.js');
	const chat = read('src/player/chat.js');
	assert.match(chatTheme, /tw-root--theme-dark/);
	assert.match(chatTheme, /tw5~chat-theme/);
	assert.match(chatTheme, /domain=\.twitch\.tv/);
	assert.match(read(CONTENT_ENTRY_JS), /chatTheme\.start\(\);/);
	assert.match(twitch, /let _isSiteDarkTheme = false;/);
	assert.match(twitch, /case 'tw5~chat-theme':/);
	assert.match(twitch, /_isSiteDarkTheme \? '&darkpopout' : ''/);
	assert.match(chat, /events\.addHandler\('twitch-chat-theme-changed', applyUrl\)/);
});

test('content modules expose their APIs through factories', () => {
	const { context } = loadCommon();
	for (const path of CONTENT_RUNTIME_JS.filter(path => path.startsWith('src/content/'))) {
		vm.runInContext(read(path), context, { filename: path });
	}
	const namespaces = JSON.parse(vm.runInContext(`JSON.stringify({
		chatTheme: Object.keys(TW5.content.chatTheme).sort(),
		pageState: Object.keys(TW5.content.pageState).sort(),
		navigation: Object.keys(TW5.content.navigation).sort(),
		raid: Object.keys(TW5.content.raid).sort()
	})`, context));
	assert.deepEqual(namespaces, { chatTheme: [ 'create' ], navigation: [ 'create' ], pageState: [ 'create' ], raid: [ 'create' ] });
	const state = vm.runInContext('TW5.content.pageState.create()', context);
	assert.deepEqual(Object.keys(state).sort(), [
		'canRedirectThisUrl', 'disableAutoRedirectForThisPage', 'getNonRedirectableUrl',
		'parseAddress', 'setPageUrl'
	]);
	assert.deepEqual([ ...vm.runInContext('Object.keys(TW5.content.navigation.create(TW5.content.pageState.create()))', context) ], [ 'start' ]);
	assert.deepEqual([ ...vm.runInContext('Object.keys(TW5.content.raid.create(TW5.content.pageState.create()))', context) ], [ 'start' ]);
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
	assert.match(playerCode, new RegExp(`permissions: \\[ '${AUDIO_DEVICE_PERMISSION}' \\]`));
	assert.match(playerCode, /chrome\.contentSettings\.microphone\.set\(/);
});

test('runtime message values agree between senders and listeners', () => {
	assert.match(contentCode, new RegExp(`request: '${MESSAGE_PROTOCOL.insertThirdParty}'`));
	assert.match(background, new RegExp(`message\\.request === '${MESSAGE_PROTOCOL.insertThirdParty}' \\|\\| message\\.request === '${LEGACY_MESSAGE_PROTOCOL.insertThirdParty}'`));
	assert.match(contentCode, new RegExp(`requestText: '${MESSAGE_PROTOCOL.raid}'`));
	assert.match(playerCode, new RegExp(`isRaidRequest = message\\.requestText === '${LEGACY_MESSAGE_PROTOCOL.raid}' \\|\\| message\\.requestText === '${MESSAGE_PROTOCOL.raid}'`));
	assert.match(playerCode, new RegExp(`message\\.requestText === '${LEGACY_MESSAGE_PROTOCOL.alreadyOpen}' \\|\\| message\\.requestText === '${MESSAGE_PROTOCOL.alreadyOpen}'`));
	assert.ok(playerCode.split(MESSAGE_PROTOCOL.alreadyOpen).length >= 2, 'already-open request is sent and handled');
	assert.doesNotMatch(contentCode, new RegExp(`requestText: '${LEGACY_MESSAGE_PROTOCOL.raid}'`));
	assert.doesNotMatch(playerCode, new RegExp(`requestText: '${LEGACY_MESSAGE_PROTOCOL.alreadyOpen}'`));
});

test('dynamic scroll indicator id matches player.html', () => {
	assert.match(playerCode, /scroll-indicator-\$\{scrollElement\.id\}/);
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
	for (const source of [html, ...playerSources, ...contentSources, ...sharedSources]) {
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
