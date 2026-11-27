// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	function create() {
		const storageKey = 'tw5ChatTheme';
		const cookieName = 'tw5~chat-theme';
		const cookieAttributes = 'path=/tw5~storage/; domain=.twitch.tv; samesite=none; secure; max-age=86400';
		const chatPathPattern = /^\/(?:embed|popout)\/[^/]+\/chat(?:[/?]|$)/;

		function getSiteThemeValue() {
			return document.documentElement && document.documentElement.classList.contains('tw-root--theme-dark') ? 'dark' : 'light';
		}

		function saveThemeValue(themeValue) {
			if (saveThemeValue.lastValue === themeValue) {
				return;
			}
			saveThemeValue.lastValue = themeValue;
			document.cookie = `${cookieName}=${themeValue}; ${cookieAttributes}`;
			chrome.storage.local.set({ [storageKey]: themeValue });
			log.logOk(`[content.js] Twitch chat theme: ${themeValue}`);
		}

		function observeClassChanges(callback) {
			if (!document.documentElement) {
				return;
			}
			new MutationObserver(callback).observe(document.documentElement, {
				attributes: true,
				attributeFilter: [ 'class' ]
			});
		}

		function startSiteSync() {
			const update = () => saveThemeValue(getSiteThemeValue());
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', () => {
					update();
					observeClassChanges(update);
				}, { once: true });
			} else {
				update();
				observeClassChanges(update);
			}
		}

		function applyFrameTheme(themeValue) {
			const rootElement = document.documentElement;
			if (!rootElement || (themeValue !== 'dark' && themeValue !== 'light')) {
				return;
			}
			rootElement.classList.toggle('tw-root--theme-dark', themeValue === 'dark');
			rootElement.classList.toggle('tw-root--theme-light', themeValue === 'light');
		}

		function startFrameSync() {
			const applySavedTheme = () => chrome.storage.local.get(storageKey, values => applyFrameTheme(values[storageKey]));
			applySavedTheme();
			chrome.storage.onChanged.addListener((changes, areaName) => {
				if (areaName === 'local' && changes[storageKey]) {
					applyFrameTheme(changes[storageKey].newValue);
				}
			});
			observeClassChanges(applySavedTheme);
		}

		function start() {
			if (window.top !== window) {
				if (chatPathPattern.test(location.pathname)) {
					startFrameSync();
				}
				return;
			}
			startSiteSync();
		}

		return { start };
	}

	TW5.content = TW5.content || {};
	TW5.content.chatTheme = { create };
})();
