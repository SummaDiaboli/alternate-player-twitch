// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	function create(pageState) {
		const { parseAddress } = pageState;

		function insertThirdPartyExtensions() {
			chrome.runtime.sendMessage({
				request: 'InsertThirdPartyExtensions'
			}, response => {
				if (chrome.runtime.lastError) {
					console.error(`[content.js] Failed to send request for third-party extensions: ${chrome.runtime.lastError.message}`);
			} else {
				console.log(response.status);
				// BTTV/FFZ scripts are now injected - they handle their own UI
				// No need to remove elements - BTTV emotes work via FFZ integration
			}
			});
		}
		
		function allowChat() {
			const fGetItem = Storage.prototype.getItem;
			Storage.prototype.getItem = function(name) {
				let valueString = fGetItem.apply(this, arguments);
				if (name === 'TwitchCache:Layout' && valueString) {
					valueString = valueString.replace('"isRightColumnClosedByUserAction":true', '"isRightColumnClosedByUserAction":false');
				}
				return valueString;
			};
		}
		
		function setChatStyle() {
			const styleElement = document.createElement('link');
			styleElement.rel = 'stylesheet';
			styleElement.href = chrome.runtime.getURL('content.css');
			styleElement.className = 'tw5-js-remove';
			(document.head || document.documentElement).appendChild(styleElement);
		}
		
		function setChatBehavior() {
			window.addEventListener('click', event => {
				if (event.button !== leftButton) {
					return;
				}
				const linkElement = event.target.closest('a[href^="http:"],a[href^="https:"],a[href]:not([href=""]):not([href^="#"]):not([href*=":"]):not([href$="/not-a-location"])');
				if (!linkElement) {
					return;
				}
				log.logOk(`[content.js] Opening link in new tab: ${linkElement.getAttribute('href')}`);
				linkElement.target = '_blank';
				event.stopImmediatePropagation();
			}, true);
			const observer = new MutationObserver(recordsMap => {
				const selector = document.getElementsByClassName('channel-leaderboard');
				if (selector.length !== 0) {
					selector[0].parentElement.parentElement.classList.add('tw5-parent-channel-leaderboard');
					observer.disconnect();
				}
			});
			observer.observe(document.body || document.documentElement, {
				childList: true,
				subtree: true
			});
			setTimeout(() => observer.disconnect(), 6e4);
		}
		
		function watchRaidInChat() {
			let previousUrl = location.href;
			let previousChannelCode = parseAddress(location).channelCode;
			setInterval(wrapErrors(() => {
				if (location.href === previousUrl) {
					return;
				}
				previousUrl = location.href;
				const addressObject = parseAddress(location);
				if (addressObject.page !== 'CHANNEL_CHAT' || !isNonEmptyString(addressObject.channelCode) || addressObject.channelCode === previousChannelCode) {
					return;
				}
				previousChannelCode = addressObject.channelCode;
				log.logOk(`[content.js] Chat moved to channel ${previousChannelCode}, notifying about raid`);
				chrome.runtime.sendMessage({
					requestText: 'Raid',
					channelCode: previousChannelCode
				});
			}), 500);
		}

		function start() {
			insertIntoPage(allowChat);
			if (window.top !== window) {
				insertThirdPartyExtensions();
				setChatStyle();
				setChatBehavior();
				watchRaidInChat();
			}
		}

		return { start };
	}

	TW5.content = TW5.content || {};
	TW5.content.raid = { create };
})();
