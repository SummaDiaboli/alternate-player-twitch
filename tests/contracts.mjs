// Behavioral contracts used by the tests. Values here describe behavior, not
// the spelling of internal identifiers, so they can be updated layer by layer
// as the migration progresses.

export const SHARED_RUNTIME_JS = [
	'src/shared/namespace.js',
	'src/shared/messages.js',
	'src/shared/state.js',
	'src/shared/helpers.js',
	'src/shared/log.js',
	'src/shared/i18n.js',
	'src/shared/settings.js'
];

export const PLAYER_ENTRY_JS = 'src/entries/player.js';

export const PLAYER_RUNTIME_JS = [
	...SHARED_RUNTIME_JS,
	'src/player/workerAdapter.js',
	'src/player/playback.js',
	'src/player/variants.js',
	'src/player/controls.js',
	'src/player/chat.js',
	'src/player/stats.js',
	'src/player/theme.js',
	'src/player/news.js',
	'src/player/debug.js',
	'src/player/events.js',
	'src/player/trash.js',
	'src/player/focus.js',
	'src/player/pulse.js',
	'src/player/windows.js',
	'src/player/menu.js',
	'src/player/fullscreen.js',
	'src/player/pictureInPicture.js',
	'src/player/dragger.js',
	'src/player/autoHide.js',
	'src/player/mediaQuery.js',
	'src/player/notification.js',
	'src/player/scale.js',
	'src/player/audioDevices.js',
	'src/player/volumeBoost.js',
	'src/player/converter.js',
	'src/player/loader.js',
	'src/player/twitch.js'
];

export const CONTENT_ENTRY_JS = 'src/entries/content.js';
export const BACKGROUND_ENTRY_JS = 'src/entries/background.js';
export const AUTOCLAIM_ENTRY_JS = 'src/entries/autoclaim.js';
export const GQLTOKEN_ENTRY_JS = 'src/entries/gqltoken.js';

export const CONTENT_RUNTIME_JS = [
	...SHARED_RUNTIME_JS,
	'src/content/pageState.js',
	'src/content/chatTheme.js',
	'src/content/navigation.js',
	'src/content/raid.js'
];

export const FIRST_PARTY_JS = [
	...new Set([
		...PLAYER_RUNTIME_JS,
		...CONTENT_RUNTIME_JS,
		'src/shared/contracts.js',
		PLAYER_ENTRY_JS,
		CONTENT_ENTRY_JS,
		BACKGROUND_ENTRY_JS,
		AUTOCLAIM_ENTRY_JS,
		GQLTOKEN_ENTRY_JS
	])
];

export const VENDOR_OR_GENERATED = [
	'betterttv.js',
	'avalon.js',
	'worker.js',
	'asmjs.js',
	'pointerevent.js',
	'_metadata'
];

export const LOCALES = ['en', 'ru', 'fr', 'es', 'de'];

export const AUDIO_DEVICE_PERMISSION = 'contentSettings';

export const INTERFACE_LANGUAGE_SETTING = 'interfaceLanguage';

export const INTERFACE_LANGUAGE_VALUES = ['auto', ...LOCALES];

export const INTERFACE_LANGUAGE_KEYS = {
	label: 'F1593',
	browserDefault: 'F1594',
	tooltip: 'A1022'
};

export const SETTING_API = [
	'restore',
	'reset',
	'exportSettings',
	'importSettings',
	'get',
	'set',
	'flushChanges',
	'getSettingParam',
	'setupPresetLists',
	'getReportData'
];

// Stable logical names mapped to the current source/storage key.
// Layer 3 and Layer 5 update the values only.
export const SETTING_KEYS = {
	version: 'settingsVersion',
	followRaids: 'followRaids',
	volume: 'volume2',
	volumeBoostEnabled: 'volumeBoostEnabled',
	chatState: 'chatState',
	bufferSize: 'bufferSize',
	interfaceLanguage: INTERFACE_LANGUAGE_SETTING
};

export const SETTING_DEFAULTS = {
	followRaids: false,
	volumeBoostEnabled: false,
	volume: 50,
	chatState: 0,
	interfaceLanguage: 'auto'
};

export const EXPECTED_SETTINGS_VERSION = 3;

export const TEST_EVENT = 'tw5-raid';

// Runtime message values are part of the cross-script protocol. Listeners keep
// accepting the version-2 values so mixed extension versions interoperate.
export const MESSAGE_PROTOCOL = {
	raid: 'Raid',
	insertThirdParty: 'InsertThirdPartyExtensions',
	alreadyOpen: 'ThisChannelIsAlreadyOpen'
};

export const LEGACY_MESSAGE_PROTOCOL = {
	raid: 'Рейд',
	insertThirdParty: 'ВставитьСторонниеРасширения',
	alreadyOpen: 'ЭтотКаналУжеОткрыт'
};

// The generated worker still emits the version-2 log severity names. Player
// accepts both the English log methods and these legacy wire values.
export const WORKER_LOG_PROTOCOL = {
	info: 'logInfo',
	ok: 'logOk',
	error: 'logError'
};

export const LEGACY_WORKER_LOG_PROTOCOL = {
	info: 'Вот',
	ok: 'Окак',
	error: 'Ой'
};

// worker.js is generated and unchanged. These are its wire field names.
// Keys are player names; values are worker names.
export const WORKER_SEGMENT_FIELDS = {
	dataValue: 'пДанные',
	isGap: 'лРазрыв',
	number: 'чНомер',
	duration: 'чДлительность'
};

// Keys are worker names; values are player names.
export const WORKER_DATA_FIELDS = {
	чПреобразованЗа: 'conversionTime',
	лЗабраковано: 'isRejected',
	лПотериВидео: 'hasVideoLoss',
	лПотериЗвука: 'hasAudioLoss',
	чМинДлительностьВидеоСемпла: 'minVideoSampleDuration',
	чМаксДлительностьВидеоСемпла: 'maxVideoSampleDurationMs',
	чСредняяДлительностьВидеоСемпла: 'avgVideoSampleDuration',
	чБитрейтЗвука: 'audioBitrate',
	чПозицияКодирования: 'encodePositionMs',
	чПозицияТрансляции: 'streamPosition',
	чВремяКодирования: 'encodingTime',
	мбМедиасегмент: 'mediaSegmentData',
	лЕстьВидео: 'hasVideo',
	лЕстьЗвук: 'hasAudio',
	мбСегментИнициализации: 'isInitSegment',
	сКодеки: 'codecString',
	чЧастотаКадров: 'frameRate',
	чДиапазон: 'range',
	лЧересстрочное: 'isInterlaced'
};

export const PLAYER_URL_PREFIX = 'chrome-extension://test/player.html?channel=';
