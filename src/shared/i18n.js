// @ts-nocheck: checked after the module split.
'use strict';

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

TW5.messages.setI18n(i18n);


TW5.i18n = i18n;
