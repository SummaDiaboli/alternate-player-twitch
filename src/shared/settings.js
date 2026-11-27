// @ts-nocheck: checked after the module split.
'use strict';

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
		writeTextToLocalFile(JSON.stringify(exportDataObj), 'application/json', TW5.messages.getMessageText('J0133'));
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
			listElement.add(new Option(TW5.messages.getMessageText(name), name, name === selectionName, name === selectionName));
		}
		if (_settings[metadata.filledString].currentValue) {
			listElement.add(new Option(TW5.messages.getMessageText(metadata.customizable), metadata.customizable, metadata.customizable === selectionName, metadata.customizable === selectionName));
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
TW5.settings = settings;
