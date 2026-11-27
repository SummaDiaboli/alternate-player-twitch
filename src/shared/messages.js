// @ts-check
'use strict';

// Message lookup is shared by the player page and content scripts. The i18n
// object is injected by common.js once it has been initialized.
(function () {
	/** @type {{ GetMessage: (code: string, substitution?: unknown) => string } | null} */
	let i18nApi = null;

	function setI18n(api) {
		i18nApi = api;
	}

	function getMessageText(code, substitution) {
		if (i18nApi === null) {
			throw new Error('i18n is not initialized');
		}
		return i18nApi.GetMessage(code, substitution);
	}

	const root = /** @type {any} */ (globalThis);
	root.TW5 = root.TW5 || {};
	root.TW5.messages = { getMessageText, setI18n };
})();
