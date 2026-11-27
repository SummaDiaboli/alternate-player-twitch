// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	function create() {
		const cookieName = 'tw5~chat-theme';
		const cookieAttributes = 'path=/tw5~storage/; domain=.twitch.tv; samesite=none; secure; max-age=86400';

		function getThemeValue() {
			return document.documentElement && document.documentElement.classList.contains('tw-root--theme-dark') ? 'dark' : 'light';
		}

		function saveThemeCookie() {
			const themeValue = getThemeValue();
			if (saveThemeCookie.lastValue === themeValue) {
				return;
			}
			saveThemeCookie.lastValue = themeValue;
			document.cookie = `${cookieName}=${themeValue}; ${cookieAttributes}`;
			log.logOk(`[content.js] Twitch chat theme: ${themeValue}`);
		}

		function startObserving() {
			saveThemeCookie();
			if (!document.documentElement) {
				return;
			}
			new MutationObserver(saveThemeCookie).observe(document.documentElement, {
				attributes: true,
				attributeFilter: [ 'class' ]
			});
		}

		function start() {
			if (window.top !== window) {
				return;
			}
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', startObserving, { once: true });
			} else {
				startObserving();
			}
		}

		return { start };
	}

	TW5.content = TW5.content || {};
	TW5.content.chatTheme = { create };
})();
