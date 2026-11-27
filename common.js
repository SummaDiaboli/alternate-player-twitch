// @ts-nocheck: enabled as this script is split into checked modules.
'use strict';

const isContentScript = !document.currentScript;

const urlNoRedirect = 'twitch5=0';

const leftButton = 0;

const middleButton = 1;

const RIGHT_BUTTON = 2;

const leftButtonPressed = 1;

const RIGHT_BUTTON_PRESSED = 2;

const MIDDLE_BUTTON_PRESSED = 4;

const passiveHandler = {
	passive: true
};

const minSettingValue = Number.MIN_SAFE_INTEGER + 1e3;

const maxSettingValue = Number.MAX_SAFE_INTEGER - 1e3;

const autoTune = Number.MIN_SAFE_INTEGER;

const minVolume = 1;

const maxVolume = 100;

const maxAmplifiedVolume = 200;

const volumeUpKeyStep = 4;

const volumeDownKeyStep = 2;

const chatUnloaded = 0;

const chatHidden = 1;

const chatPanel = 2;

const topSide = 1;

const rightSide = 2;

const bottomSide = 3;

const leftSide = 4;

const minRepeatDuration = 30;

const maxRepeatDuration = 300;

const minBufferSize = 1.5;

const maxBufferSize = 30;

const minBufferStretch = 9;

const maxBufferStretch = 30;

const bufferOverflow = maxBufferSize + maxBufferStretch;

let globalIsWorkFinished = false;

if (!NodeList.prototype[Symbol.iterator]) {
	NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

if (!HTMLCollection.prototype[Symbol.iterator]) {
	HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

if (!isContentScript && !window.PointerEvent) {
	const scriptElement = document.createElement('script');
	scriptElement.src = 'pointerevent.js';
	document.currentScript.parentNode.appendChild(scriptElement);
}

const placeholder = () => {};

function assert(conditionValue) {
	if (!conditionValue) {
		throw new Error('Assertion failed');
	}
}

function wrapErrors(callbackFunction) {
	return function() {
		if (globalIsWorkFinished) {
			return;
		}
		try {
			return callbackFunction.apply(this, arguments);
		} catch (exception) {
			debug.exceptionCaught(exception);
		}
	};
}

function convertExceptionToString(exception) {
	return exception instanceof Error ? exception.stack : `[typeof ${typeof exception}] ${new Error(exception).stack}`;
}

function type(value) {
	return value === null ? 'null' : typeof value;
}

function thisNumber(value) {
	return typeof value == 'number' && value == value;
}

function isObject(value) {
	return typeof value == 'object' && value !== null;
}

function isNonEmptyString(value) {
	return typeof value == 'string' && value !== '';
}

function clampStringLength(stringValue, maxLength) {
	return stringValue.length <= maxLength ? stringValue : `${stringValue.slice(0, maxLength)}---8<---${stringValue.length - maxLength}`;
}

function getBrowserEngineVersion() {
	if (!getBrowserEngineVersion._resultCode) {
		if (navigator.userAgentData) {
			for (const {brand, version} of navigator.userAgentData.brands) {
				if (brand === 'Chromium' || brand === 'Google Chrome') {
					getBrowserEngineVersion._resultCode = Number.parseInt(version, 10);
					break;
				}
			}
		}
		if (!getBrowserEngineVersion._resultCode) {
			getBrowserEngineVersion._resultCode = Number(/Chrome\/(\d+)/.exec(navigator.userAgent)[1]);
		}
	}
	return getBrowserEngineVersion._resultCode;
}

function isMobileDevice() {
	if (!isMobileDevice.hasOwnProperty('_result')) {
		isMobileDevice._result = navigator.userAgentData ? navigator.userAgentData.mobile : navigator.userAgent.includes('Android');
	}
	return isMobileDevice._result;
}

function element(elementValue) {
	const elementItem = typeof elementValue == 'string' ? document.getElementById(elementValue) : elementValue;
	assert(elementItem.nodeType === 1);
	return elementItem;
}

function createGqlRequestBody(requestText, variables) {
	assert(isNonEmptyString(requestText) && isObject(variables));
	return `{"query":${JSON.stringify(requestText)},"variables":${JSON.stringify(variables)}}`;
}

function mergeGqlRequests(requestBodies) {
	assert(requestBodies[0][0] === '{');
	return `[${requestBodies.join(',')}]`;
}

function getPlayerUrl(channelCode) {
	const parameters = '?channel=' + encodeURIComponent(channelCode);
	return chrome.runtime.getURL('player.html') + parameters;
}

const log = (() => {
	const maxRecordLength = 1500;
	let _logParts = null;
	let _lastRecordNumber = -1;
	function add(importanceName, record) {
		if (_logParts) {
			assert(typeof importanceName == 'string' && typeof record == 'string');
			record = clampStringLength(`${importanceName} ${(performance.now() / 1e3).toFixed(3)} ${record}`, maxRecordLength);
			if (++_lastRecordNumber === _logParts.length) {
				_lastRecordNumber = 0;
			}
			_logParts[_lastRecordNumber] = record;
		}
	}
	function getReportData() {
		if (!_logParts) {
			return null;
		}
		const nextRecordNumber = _lastRecordNumber + 1;
		if (nextRecordNumber === _logParts.length) {
			return _logParts;
		}
		if (_logParts[nextRecordNumber] === void 0) {
			return _logParts.slice(0, nextRecordNumber);
		}
		return _logParts.slice(nextRecordNumber).concat(_logParts.slice(0, nextRecordNumber));
	}
	function logInfo(record) {
		assert(arguments.length === 1);
		add(' ', record);
	}
	function logOk(record) {
		assert(arguments.length === 1);
		add('~', record);
	}
	function logError(record) {
		assert(arguments.length === 1);
		add('@', record);
	}
	function O(objectValue) {
		switch (type(objectValue)) {
		  case 'object':
			return JSON.stringify(objectValue);

		  case 'function':
			return `[function ${objectValue.name}]`;

		  case 'symbol':
			return '[symbol]';

		  default:
			return String(objectValue);
		}
	}
	function F(precision) {
		return numericValue => typeof numericValue == 'number' ? numericValue.toFixed(precision) : 'NaN';
	}
	if (!isContentScript) {
		_logParts = new Array(1500);
		logInfo(`[Log] Log started ${performance.now().toFixed()}ms`);
	}
	return {
		logInfo,
		logOk,
		logError,
		O,
		F0: F(0),
		F1: F(1),
		F2: F(2),
		F3: F(3),
		getReportData
	};
})();

const i18n = (() => {
	const languageNames = {
		AR: 'العربية',
		ASE: 'American Sign Language',
		ASL: 'American Sign Language',
		BG: 'Български',
		CA: 'Català',
		CS: 'Čeština',
		DA: 'Dansk',
		DE: 'Deutsch',
		EL: 'Ελληνικά',
		EN: 'English',
		EN_GB: 'English (UK)',
		ES: 'Español',
		ES_MX: 'Español (Latinoamérica)',
		FI: 'Suomi',
		FR: 'Français',
		HI: 'हिन्दी',
		HU: 'Magyar',
		ID: 'Bahasa Indonesia',
		IT: 'Italiano',
		JA: '日本語',
		KO: '한국어',
		MS: 'بهاس ملايو',
		NL: 'Nederlands',
		NO: 'Norsk',
		PL: 'Polski',
		PT: 'Português',
		PT_BR: 'Português (Brasil)',
		RO: 'Română',
		RU: 'Русский',
		SK: 'Slovenčina',
		SV: 'Svenska',
		TH: 'ภาษาไทย',
		TL: 'Tagalog',
		TR: 'Türkçe',
		UK: 'Українська',
		VI: 'Tiếng Việt',
		ZH: '中文',
		ZH_HK: '中文（香港）',
		ZH_CN: '简体中文',
		ZH_TW: '繁體中文'
	};
	const _formatNumber = new Map();
	const _interfaceLanguageMessages = new Map();
	let _formatDateCallback = null;
	let _messageOverride = null;
	function applySubstitutions(sMessageText, sSubstitution) {
		if (sSubstitution === void 0) {
			return sMessageText;
		}
		return sMessageText.replace(/\$(\d+)/g, (sMatch, sIndex) => sSubstitution[Number(sIndex) - 1] ?? '');
	}
	async function prepare(sLanguageCode) {
		assert(sLanguageCode === 'auto' || isNonEmptyString(sLanguageCode));
		if (sLanguageCode === 'auto') {
			_messageOverride = null;
			return;
		}
		try {
			if (!_interfaceLanguageMessages.has(sLanguageCode)) {
				const sUrl = chrome.runtime.getURL(`_locales/${sLanguageCode}/messages.json`);
				const oResponse = await fetch(sUrl);
				if (!oResponse.ok) {
					throw new Error(`HTTP ${oResponse.status}`);
				}
				_interfaceLanguageMessages.set(sLanguageCode, await oResponse.json());
			}
			_messageOverride = _interfaceLanguageMessages.get(sLanguageCode);
		} catch (exception) {
			log.logError(`[i18n] Failed to load interface language ${sLanguageCode}: ${exception}`);
			_messageOverride = null;
		}
	}
	function GetMessage(sMessageName, sSubstitution) {
		assert(isNonEmptyString(sMessageName));
		assert(sSubstitution === void 0 || typeof sSubstitution == 'string');
		const oOverride = _messageOverride === null ? null : _messageOverride[sMessageName];
		const sMessageText = oOverride && oOverride.message ? applySubstitutions(oOverride.message, sSubstitution) : chrome.i18n.getMessage(sMessageName, sSubstitution);
		if (!sMessageText) {
			throw new Error(`No text found for ${sMessageName}`);
		}
		return sMessageText;
	}
	function FastInsertAdjacentHtmlMessage(elInsertTo, sPosition, sMessageName) {
		
		//! HTML content is taken from the file messages.json. See GetMessage().
		elInsertTo.insertAdjacentHTML(sPosition, GetMessage(sMessageName));
	}
	function InsertAdjacentHtmlMessage(vInsertTo, sPosition, sMessageName) {
		const elInsertTo = element(vInsertTo);
		if (sPosition === 'content') {
			sPosition = 'beforeend';
			elInsertTo.textContent = '';
		}
		FastInsertAdjacentHtmlMessage(elInsertTo, sPosition, sMessageName);
		return elInsertTo;
	}
	function TranslateDocument(document) {
		log.logInfo('[i18n] Translating document');
		for (let elTranslate, celTranslate = document.querySelectorAll('*[data-i18n]'), i = 0; elTranslate = celTranslate[i]; ++i) {
			const sNames = elTranslate.getAttribute('data-i18n');
			const sNamesDelimiter = sNames.indexOf('^');
			if (sNamesDelimiter !== 0) {
				FastInsertAdjacentHtmlMessage(elTranslate, 'afterbegin', sNamesDelimiter === -1 ? sNames : sNames.slice(0, sNamesDelimiter));
			}
			if (sNamesDelimiter !== -1) {
				elTranslate.title = GetMessage(sNames.slice(sNamesDelimiter + 1));
			}
		}
	}
	function formatNumber(numberValue, decimalPlacesCount) {
		assert(decimalPlacesCount === void 0 || typeof decimalPlacesCount == 'number' && decimalPlacesCount >= 0);
		let formatCallback = _formatNumber.get(decimalPlacesCount);
		if (!formatCallback) {
			formatCallback = new Intl.NumberFormat([], decimalPlacesCount === void 0 ? void 0 : {
				minimumFractionDigits: decimalPlacesCount,
				maximumFractionDigits: decimalPlacesCount
			}).format;
			_formatNumber.set(decimalPlacesCount, formatCallback);
		}
		return formatCallback(numberValue);
	}
	function formatDate(dateValue) {
		assert(Number.isFinite(dateValue) || Number.isFinite(dateValue.getTime()));
		if (!_formatDateCallback) {
			_formatDateCallback = new Intl.DateTimeFormat([], {
				timeZone: 'UTC'
			}).format;
		}
		return _formatDateCallback(dateValue);
	}
	function secondsToString(secondsCount, shouldUseSeconds) {
		let counter = Math.floor(secondsCount / 60 % 60);
		let text = Math.floor(secondsCount / 60 / 60) + (counter < 10 ? ' : 0' : ' : ') + counter;
		if (shouldUseSeconds) {
			counter = Math.floor(secondsCount % 60);
			text += (counter < 10 ? ' : 0' : ' : ') + counter;
		}
		return text;
	}
	function getLanguageName(languageCode) {
		const languageName = languageNames[languageCode.toUpperCase()];
		if (!languageName) {
			throw new Error(`Unknown language code: ${languageCode}`);
		}
		return languageName;
	}
	return {
		GetMessage,
		InsertAdjacentHtmlMessage,
		TranslateDocument,
		prepare,
		formatNumber,
		formatDate,
		secondsToString,
		getLanguageName
	};
})();

// Persisted settings were renamed during the English-source migration.
// Keep accepting every version-2 key so existing profiles keep their values.
const SETTING_KEY_ALIASES = {
	'чВерсияНастроек': 'settingsVersion',
	'чСлучайноеЧисло': 'randomNumber',
	'сПредыдущаяВерсия': 'previousVersionName',
	'чПоследняяПроверкаОбновленияРасширения': 'lastExtensionUpdateCheck',
	'чГромкость2': 'volume2',
	'лРазрешитьУсилениеГромкости': 'volumeBoostEnabled',
	'лПриглушить': 'isMuted',
	'сИдАудиоустройства': 'audioDeviceId',
	'сНазваниеВарианта': 'variantName',
	'чБитрейтВарианта': 'variantBitrate',
	'чДлительностьПовтора2': 'replayDuration2',
	'лМасштабироватьИзображение': 'shouldScaleImage',
	'чСостояниеЧата': 'chatState',
	'чСостояниеЗакрытогоЧата': 'closedChatStateCode',
	'лАвтоПоложениеЧата': 'isChatAutoPosition',
	'чГоризонтальноеПоложениеЧата': 'chatHorizontalPosition',
	'чВертикальноеПоложениеЧата': 'chatVerticalPosition',
	'чПоложениеПанелиЧата': 'chatPanelPosition',
	'чШиринаПанелиЧата': 'chatPanelWidth',
	'чВысотаПанелиЧата': 'chatPanelHeight',
	'лПолноценныйЧат': 'isFullChat',
	'лЗатемнитьЧат': 'shouldDimChat',
	'лСледоватьЗаРейдами': 'followRaids',
	'чРазмерИнтерфейса': 'uiSize',
	'чИнтервалАвтоскрытия': 'autoHideInterval',
	'лАнимацияИнтерфейса': 'isUiAnimationEnabled',
	'лМенятьГромкостьКолесом': 'shouldChangeVolumeWithWheel',
	'чШагИзмененияГромкостиКолесом': 'wheelVolumeStep',
	'лПоказатьСтатистику': 'shouldShowStats',
	'сПредустановкаВыбрана_буферизация': 'selectedBufferingPreset',
	'лПредустановкаЗаполнена_буферизация': 'isBufferingPresetFilled',
	'кОдновременныхЗагрузок': 'concurrentLoadCount',
	'чНачалоВоспроизведения': 'playbackStartMs',
	'чРазмерБуфера': 'bufferSize',
	'чРастягиваниеБуфера': 'bufferStretchMs',
	'сПредустановкаВыбрана_оформление': 'selectedThemePreset',
	'лПредустановкаЗаполнена_оформление': 'isThemePresetFilled',
	'сЦветФона': 'backgroundColor',
	'сЦветГрадиента': 'gradientColor',
	'сЦветКнопок': 'buttonColor',
	'сЦветЗаголовка': 'titleColor',
	'сЦветВыделения': 'selectionColor',
	'чПрозрачность': 'opacityValue',
	'лАвтоперенаправлениеРазрешено': 'isAutoRedirectAllowed',
	'лАвтоперенаправлениеЗамечено': 'isAutoRedirectDetected',
	'чМаксРазмерБуфера': 'maxBufferSizeSetting',
	'_лРезультат': '_result'
};

function normalizeSettingName(name) {
	return SETTING_KEY_ALIASES[name] ?? name;
}

function translateRestoredSettings(source) {
	const result = {};
	for (const [name, value] of Object.entries(source)) {
		if (normalizeSettingName(name) !== name) {
			result[normalizeSettingName(name)] = value;
		}
	}
	for (const [name, value] of Object.entries(source)) {
		if (normalizeSettingName(name) === name) {
			result[name] = value;
		}
	}
	return result;
}

const settings = (() => {
	const SETTINGS_VERSION = 3;
	const _bufferingPresets = new Map([ [ 'J0126', {
		concurrentLoadCount: 1,
		playbackStartMs: 3,
		bufferSize: 5,
		bufferStretchMs: 15
	} ], [ 'J0127', {
		concurrentLoadCount: 2,
		playbackStartMs: 3,
		bufferSize: 8.5,
		bufferStretchMs: 20
	} ], [ 'J0128', {
		concurrentLoadCount: 2,
		playbackStartMs: 17,
		bufferSize: 9.5,
		bufferStretchMs: 30
	} ] ]);
	const _themePresets = new Map([ [ 'J0122', {
		backgroundColor: '#282828',
		gradientColor: '#d4d4d4',
		buttonColor: '#d3be96',
		titleColor: '#cdbdec',
		selectionColor: '#ffd862',
		opacityValue: 25
	} ], [ 'J0121', {
		backgroundColor: '#405b77',
		gradientColor: '#aaccf2',
		buttonColor: '#ffffff',
		titleColor: '#c2e4ff',
		selectionColor: '#fef17c',
		opacityValue: 30
	} ], [ 'J0138', {
		backgroundColor: '#4b4b4b',
		gradientColor: '#aaaaaa',
		buttonColor: '#bad4f8',
		titleColor: '#e2ebb4',
		selectionColor: '#75a9f0',
		opacityValue: 5
	} ], [ 'J0125', {
		backgroundColor: '#161616',
		gradientColor: '#a0a0a0',
		buttonColor: '#f0f0f0',
		titleColor: '#baccda',
		selectionColor: '#6cb6ff',
		opacityValue: 20
	} ] ]);
	const _presetMetadata = [ {
		dataMap: _bufferingPresets,
		customizable: 'J0129',
		chosenName: 'selectedBufferingPreset',
		filledString: 'isBufferingPresetFilled',
		listName: 'preset-buffering',
		eventName: 'settings-buffering-preset-changed'
	}, {
		dataMap: _themePresets,
		customizable: 'J0123',
		chosenName: 'selectedThemePreset',
		filledString: 'isThemePresetFilled',
		listName: 'preset-appearance',
		eventName: 'settings-appearance-preset-changed'
	} ];
	const _persistentSettings = new Set([ 'settingsVersion', 'randomNumber', 'previousVersionName', 'lastExtensionUpdateCheck', 'isAutoRedirectDetected' ]);
	const _noHighlightSetting = new Set();
	class setting {
		constructor(initialValue, enumeration, minimumNumber, maximumNumber, autoTuneName) {
			this.currentValue = void 0;
			this.initialValue = initialValue;
			this.enumeration = enumeration;
			this.minimumNumber = minimumNumber;
			this.maximumNumber = maximumNumber;
			this.autoTuneName = autoTuneName;
		}
		static create(initialValue) {
			return new this(initialValue, null, minSettingValue, maxSettingValue, '');
		}
		static createEnum(initialValue, enumeration) {
			return new this(initialValue, enumeration, minSettingValue, maxSettingValue, '');
		}
		static createRange(initialValue, minimumNumber, maximumNumber, autoTuneName = '') {
			return new this(initialValue, null, minimumNumber, maximumNumber, autoTuneName);
		}
		static assertValue(value) {
			assert(value == value && value !== Infinity && value !== -Infinity && value !== void 0 && typeof value != 'function' && typeof value != 'symbol' && typeof value != 'object');
		}
		fixValue(value) {
			setting.assertValue(value);
			assert(typeof value == typeof this.initialValue);
			if (this.enumeration) {
				if (!this.enumeration.includes(value)) {
					value = this.initialValue;
				}
			} else if (typeof value == 'number') {
				if (value === autoTune) {
					if (this.autoTuneName === '') {
						value = this.initialValue;
					}
				} else if (value < this.minimumNumber) {
					value = this.minimumNumber;
				} else if (value > this.maximumNumber) {
					value = this.maximumNumber;
				}
			}
			return value;
		}
	}
	const _settings = {
		settingsVersion: setting.create(SETTINGS_VERSION),
		randomNumber: setting.create(Math.random()),
		previousVersionName: setting.create('2000.1.1'),
		lastExtensionUpdateCheck: setting.create(0),
		volume2: setting.createRange(maxVolume / 2, minVolume, maxAmplifiedVolume),
		volumeBoostEnabled: setting.create(false),
		isMuted: setting.create(false),
		audioDeviceId: setting.create(''),
		variantName: setting.create('CoolCmd'),
		variantBitrate: setting.create(maxSettingValue),
		replayDuration2: setting.createRange(60, minRepeatDuration, maxRepeatDuration, 'J0124'),
		shouldScaleImage: setting.create(true),
		chatState: setting.createEnum(chatUnloaded, [ chatUnloaded, chatHidden, chatPanel ]),
		closedChatStateCode: setting.createEnum(chatUnloaded, [ chatUnloaded, chatHidden ]),
		isChatAutoPosition: setting.create(isMobileDevice()),
		chatHorizontalPosition: setting.createEnum(rightSide, [ rightSide, leftSide ]),
		chatVerticalPosition: setting.createEnum(bottomSide, [ topSide, bottomSide ]),
		chatPanelPosition: setting.createEnum(rightSide, [ topSide, rightSide, bottomSide, leftSide ]),
		chatPanelWidth: setting.createRange(340, 100, maxSettingValue),
		chatPanelHeight: setting.createRange(250, 100, maxSettingValue),
		isFullChat: setting.create(true),
		shouldDimChat: setting.create(false),
		followRaids: setting.create(false),
		interfaceLanguage: setting.createEnum('auto', [ 'auto', 'en', 'ru', 'fr', 'es', 'de' ]),
		uiSize: setting.createRange(isMobileDevice() ? 115 : 100, 50, 200),
		autoHideInterval: setting.createRange(4, .5, 60),
		isUiAnimationEnabled: setting.create(!isMobileDevice()),
		shouldChangeVolumeWithWheel: setting.create(true),
		wheelVolumeStep: setting.createRange(5, -10, 10),
		shouldShowStats: setting.create(false),
		selectedBufferingPreset: setting.create('J0127'),
		isBufferingPresetFilled: setting.create(false),
		concurrentLoadCount: setting.createRange(0, 1, 3),
		playbackStartMs: setting.createRange(0, minBufferSize, maxBufferSize),
		bufferSize: setting.createRange(0, minBufferSize, maxBufferSize),
		bufferStretchMs: setting.createRange(0, minBufferStretch, maxBufferStretch),
		selectedThemePreset: setting.create('J0122'),
		isThemePresetFilled: setting.create(false),
		backgroundColor: setting.create(''),
		gradientColor: setting.create('#ffffff'),
		buttonColor: setting.create(''),
		titleColor: setting.create(''),
		selectionColor: setting.create(''),
		opacityValue: setting.createRange(0, 0, 80),
		isAutoRedirectAllowed: setting.create(true),
		isAutoRedirectDetected: setting.create(false)
	};
	const saveDelay = isContentScript ? 50 : 500;
	let _deferredSaveTimer = 0;
	let _deferredSave = null;
	let _isDeletionDeferred = false;
	let _deferredLegacyKeys = [];
	function restore() {
		log.logInfo('[Settings] Restoring settings');
		return new Promise((execute, reject) => {
			chrome.storage.local.get(null, restoredSettings => {
				if (globalIsWorkFinished) {
					return;
				}
				try {
					if (chrome.runtime.lastError) {
						console.error('storage.local.get', chrome.runtime.lastError.message);
						debug.finishAndShowMessage('J0221');
					}
					log.logInfo(`[Settings] Settings read from storage: ${log.O(restoredSettings)}`);
					const legacyKeys = Object.keys(restoredSettings).filter(name => normalizeSettingName(name) !== name);
					finishRestore(translateRestoredSettings(restoredSettings), legacyKeys);
					execute();
				} catch (exception) {
					reject(exception);
				}
			});
		});
	}
	function finishRestore(restoredSettings, legacyKeys = []) {
		assert(isObject(restoredSettings));
		assert(!_settings.settingsVersion.currentValue);
		const save = {};
		const shouldRemoveRest = assertSettingsVersion(restoredSettings, save);
		for (let name of Object.keys(_settings)) {
			if (restoredSettings.hasOwnProperty(name)) {
				const value = _settings[name].fixValue(restoredSettings[name]);
				if (value !== restoredSettings[name] || legacyKeys.length !== 0) {
					save[name] = value;
				}
				_settings[name].currentValue = value;
			} else {
				if (_persistentSettings.has(name)) {
					save[name] = _settings[name].initialValue;
				}
				_settings[name].currentValue = _settings[name].initialValue;
			}
		}
		startSave(save, shouldRemoveRest, legacyKeys);
	}
	function assertSettingsVersion(settingsObject, save) {
		if (!Number.isInteger(settingsObject.settingsVersion) || settingsObject.settingsVersion < 1 || settingsObject.settingsVersion > SETTINGS_VERSION) {
			for (let name of Object.keys(settingsObject)) {
				delete settingsObject[name];
			}
			return true;
		}
		for (let metadata of _presetMetadata) {
			let name = settingsObject[metadata.chosenName];
			if (name !== void 0 && name !== metadata.customizable) {
				for (let presetName of metadata.dataMap.keys()) {
					if (name === presetName) {
						name = void 0;
						break;
					}
				}
				if (name !== void 0) {
					save[metadata.chosenName] = settingsObject[metadata.chosenName] = _settings[metadata.chosenName].initialValue;
				}
			}
		}
		if (settingsObject.closedChatStateCode !== settingsObject.chatState && (settingsObject.chatState === chatUnloaded || settingsObject.chatState === chatHidden)) {
			save.closedChatStateCode = settingsObject.closedChatStateCode = settingsObject.chatState;
		}
		if (settingsObject.settingsVersion === SETTINGS_VERSION) {
			return false;
		}
		save.settingsVersion = settingsObject.settingsVersion = SETTINGS_VERSION;
		return false;
	}
	function startSave(save, shouldRemoveRest, legacyKeys = []) {
		assert(isObject(save));
		if (Object.keys(save).length !== 0 || shouldRemoveRest || legacyKeys.length !== 0) {
			if (_deferredSaveTimer === 0) {
				log.logInfo(`[Settings] Deferring settings save for ${saveDelay}ms`);
				_deferredSave = save;
				_isDeletionDeferred = shouldRemoveRest;
				_deferredLegacyKeys = legacyKeys;
				_deferredSaveTimer = setTimeout(wrapErrors(finishSave), saveDelay);
			} else if (shouldRemoveRest) {
				_deferredSave = save;
				_isDeletionDeferred = shouldRemoveRest;
				_deferredLegacyKeys = legacyKeys;
			} else {
				Object.assign(_deferredSave, save);
				_deferredLegacyKeys.push(...legacyKeys);
			}
		}
	}
	function finishSave() {
		log.logInfo('[Settings] Finishing deferred save');
		assert(_deferredSaveTimer !== 0);
		_deferredSaveTimer = 0;
		assert(isObject(_deferredSave));
		save2(_deferredSave, _isDeletionDeferred, _deferredLegacyKeys);
		_deferredSave = null;
		_deferredLegacyKeys = [];
	}
	function save2(save, shouldRemoveRest, legacyKeys = []) {
		if (shouldRemoveRest) {
			chrome.storage.local.clear(assertSaveResult);
			log.logInfo('[Settings] All settings removed from storage');
		} else if (legacyKeys.length !== 0) {
			chrome.storage.local.remove(legacyKeys, assertSaveResult);
		}
		chrome.storage.local.set(save, assertSaveResult);
		log.logInfo(`[Settings] Settings written to storage: ${log.O(save)}`);
	}
	function assertSaveResult() {
		if (chrome.runtime.lastError) {
			console.error('storage.local.set', chrome.runtime.lastError.message);
			debug.finishAndShowMessage('J0221');
		}
	}
	function reset() {
		log.logOk('[Settings] Resetting settings');
		assert(_settings.settingsVersion.currentValue);
		const save = {};
		for (let name of _persistentSettings) {
			save[name] = _settings[name].currentValue;
		}
		startSave(save, true);
		window.location.reload(true);
	}
	function exportSettings() {
		log.logOk('[Settings] Exporting settings');
		assert(_settings.settingsVersion.currentValue);
		const exportDataObj = {
			settingsVersion: SETTINGS_VERSION
		};
		for (let name of Object.keys(_settings)) {
			if (!_persistentSettings.has(name) && !_noHighlightSetting.has(name)) {
				exportDataObj[name] = _settings[name].currentValue;
			}
		}
		log.logInfo(`[Settings] Selected settings for export: ${log.O(exportDataObj)}`);
		writeTextToLocalFile(JSON.stringify(exportDataObj), 'application/json', getMessageText('J0133'));
	}
	function importSettings(fromFileData) {
		log.logOk(`[Settings] Importing settings from file ${fromFileData.name}`);
		assert(_settings.settingsVersion.currentValue);
		if (fromFileData.size === 0 || fromFileData.size > 1e4) {
			log.logError(`[Settings] File size: ${fromFileData.size}`);
			notification.showButt();
			return;
		}
		const reader = new FileReader();
		reader.addEventListener('loadend', wrapErrors(() => {
			if (!isNonEmptyString(reader.result)) {
				log.logError(`[Settings] File read result: ${reader.result}`);
				notification.showButt();
				return;
			}
			log.logInfo(`[Settings] Settings read from file: ${reader.result}`);
			let save;
			try {
				save = translateRestoredSettings(JSON.parse(reader.result));
				if (!isObject(save)) {
					throw 1;
				}
				if (assertSettingsVersion(save, save)) {
					throw 2;
				}
				for (let name of Object.keys(save)) {
					if (!_settings.hasOwnProperty(name) || _noHighlightSetting.has(name)) {
						delete save[name];
					} else {
						save[name] = _settings[name].fixValue(save[name]);
						if (save[name] === _settings[name].initialValue) {
							delete save[name];
						}
					}
				}
			} catch (exception) {
				log.logError(`[Settings] Caught exception while parsing settings: ${exception}`);
				notification.showButt();
				return;
			}
			for (let name of _persistentSettings) {
				save[name] = _settings[name].currentValue;
			}
			startSave(save, true);
			window.location.reload(true);
		}));
		reader.readAsText(fromFileData);
	}
	function get2(name) {
		name = normalizeSettingName(name);
		assert(typeof name == 'string');
		assert(_settings.hasOwnProperty(name));
		assert(_settings.settingsVersion.currentValue);
		for (let metadata of _presetMetadata) {
			const preset = metadata.dataMap.get(_settings[metadata.chosenName].currentValue);
			if (preset) {
				const value = preset[name];
				if (value !== void 0) {
					return value;
				}
			}
		}
		return _settings[name].currentValue;
	}
	function get(name) {
		name = normalizeSettingName(name);
		if (name === 'maxBufferSizeSetting') {
			return Math.max(get2('playbackStartMs'), get2('bufferSize'));
		}
		return get2(name);
	}
	function set(name, value, shouldNotSave = false) {
		name = normalizeSettingName(name);
		assert(typeof name == 'string');
		assert(_settings[name].fixValue(value) === value);
		const save = {};
		for (let metadata of _presetMetadata) {
			const preset = metadata.dataMap.get(_settings[metadata.chosenName].currentValue);
			if (preset && preset.hasOwnProperty(name)) {
				if (value === preset[name]) {
					return;
				}
				assert(!shouldNotSave);
				save[metadata.chosenName] = _settings[metadata.chosenName].currentValue = metadata.customizable;
				save[metadata.filledString] = _settings[metadata.filledString].currentValue = true;
				for (let presetName of Object.keys(preset)) {
					save[presetName] = _settings[presetName].currentValue = preset[presetName];
				}
				updatePresetList(metadata);
				break;
			}
		}
		if (_settings[name].currentValue !== value) {
			save[name] = _settings[name].currentValue = value;
		}
		if (!shouldNotSave) {
			startSave(save, false);
		}
	}
	function updatePresetList(metadata) {
		const listElement = element(metadata.listName);
		listElement.length = 0;
		const selectionName = _settings[metadata.chosenName].currentValue;
		for (let name of metadata.dataMap.keys()) {
			listElement.add(new Option(getMessageText(name), name, name === selectionName, name === selectionName));
		}
		if (_settings[metadata.filledString].currentValue) {
			listElement.add(new Option(getMessageText(metadata.customizable), metadata.customizable, metadata.customizable === selectionName, metadata.customizable === selectionName));
		}
		assert(listElement.value);
		return listElement;
	}
	const handlePresetChange = wrapErrors(event => {
		for (let metadata of _presetMetadata) {
			if (metadata.listName === event.target.id) {
				assert(event.target.value);
				set(metadata.chosenName, event.target.value);
				events.sendEvent(metadata.eventName);
				return;
			}
		}
		assert(false);
	});
	function setupPresetLists() {
		for (let metadata of _presetMetadata) {
			updatePresetList(metadata).addEventListener('change', handlePresetChange);
		}
	}
	function getSettingParam(name) {
		name = normalizeSettingName(name);
		assert(typeof name == 'string');
		assert(_settings.hasOwnProperty(name));
		return _settings[name];
	}
	function getReportData() {
		const report = {};
		for (let name of Object.keys(_settings)) {
			if (!_noHighlightSetting.has(name) && (_persistentSettings.has(name) || _settings[name].currentValue !== _settings[name].initialValue)) {
				report[name] = _settings[name].currentValue;
			}
		}
		return report;
	}
	function flushChanges() {
		if (_deferredSaveTimer !== 0) {
			clearTimeout(_deferredSaveTimer);
			finishSave();
		}
	}
	window.addEventListener('beforeunload', flushChanges);
	return {
		restore,
		reset,
		exportSettings,
		importSettings,
		get,
		set,
		flushChanges,
		getSettingParam,
		setupPresetLists,
		getReportData
	};
})();