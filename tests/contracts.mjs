// Behavioral contracts used by the tests. Values here describe behavior, not
// the spelling of internal identifiers, so they can be updated layer by layer
// as the migration progresses.

export const FIRST_PARTY_JS = [
	'common.js',
	'content.js',
	'player.js',
	'background.js',
	'autoclaim.js',
	'gqltoken.js'
];

export const VENDOR_OR_GENERATED = [
	'betterttv.js',
	'avalon.js',
	'worker.js',
	'asmjs.js',
	'pointerevent.js',
	'_metadata'
];

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
	version: 'чВерсияНастроек',
	followRaids: 'лСледоватьЗаРейдами',
	volume: 'чГромкость2',
	volumeBoostEnabled: 'лРазрешитьУсилениеГромкости',
	chatState: 'чСостояниеЧата',
	bufferSize: 'чРазмерБуфера'
};

export const SETTING_DEFAULTS = {
	followRaids: false,
	volumeBoostEnabled: false,
	volume: 50,
	chatState: 0
};

export const EXPECTED_SETTINGS_VERSION = 2;

export const LOCALES = ['en', 'ru', 'fr', 'es', 'de'];

export const TEST_EVENT = 'tw5-raid';

// Runtime message values are part of the cross-script protocol. Layer 4
// accepts the future English values while senders still emit the legacy ones.
export const MESSAGE_PROTOCOL = {
	raid: 'Рейд',
	insertThirdParty: 'InsertThirdPartyExtensions',
	alreadyOpen: 'ЭтотКаналУжеОткрыт'
};

export const MESSAGE_PROTOCOL_ENGLISH = {
	raid: 'Raid',
	insertThirdParty: 'InsertThirdPartyExtensions',
	alreadyOpen: 'ThisChannelIsAlreadyOpen'
};

export const LEGACY_INSERT_THIRD_PARTY = 'ВставитьСторонниеРасширения';

export const PLAYER_URL_PREFIX = 'chrome-extension://test/player.html?channel=';
