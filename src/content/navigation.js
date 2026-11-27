// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	function create(pageState) {
		const { parseAddress, setPageUrl, disableAutoRedirectForThisPage } = pageState;

		function requestChannelState(parsedUrl) {
			if (!parsedUrl.canRedirect || !settings.get('isAutoRedirectAllowed')) {
				return;
			}
			if (!globalRequest && globalChannelCode === parsedUrl.channelCode && performance.now() - globalLastCheck < keepChannelState) {
				return;
			}
			if (globalRequest && globalChannelCode === parsedUrl.channelCode) {
				return;
			}
			abortRequest();
			globalChannelCode = parsedUrl.channelCode;
			globalLastCheck = -1;
			sendRequest();
		}
		
		function onPageUrlChanged(modeName) {
			globalParsedAddress = parseAddress(location);
			urlMode = modeName;
			if (!globalParsedAddress.canRedirect || !settings.get('isAutoRedirectAllowed')) {
				if (globalLastCheck === -2) {
					globalLastCheck = -1;
				}
				return;
			}
			if (!globalRequest && globalChannelCode === globalParsedAddress.channelCode && performance.now() - globalLastCheck < keepChannelState) {
				if (globalIsStreaming) {
					redirectToOurPlayer(globalChannelCode);
				}
				return;
			}
			if (globalRequest && globalChannelCode === globalParsedAddress.channelCode) {
				globalLastCheck = -2;
				return;
			}
			abortRequest();
			globalChannelCode = globalParsedAddress.channelCode;
			globalLastCheck = -2;
			sendRequest();
		}
		
		function abortRequest() {
			if (globalRequest) {
				log.logOk('[content.js] Cancelling pending request');
				globalRequest.abort();
			}
		}
		
		function sendRequest() {
			log.logOk(`[content.js] Sending request for channel ${globalChannelCode}`);
			globalRequest = new XMLHttpRequest();
			globalRequest.addEventListener('loadend', handleResponse);
			globalRequest.open('POST', 'https://gql.twitch.tv/gql#origin=twilight');
			globalRequest.responseType = 'json';
			globalRequest.timeout = 15e3;
			globalRequest.setRequestHeader('Accept-Language', 'en-US');
			globalRequest.setRequestHeader('Client-ID', 'kimne78kx3ncx6brgo4mv6wki5h1ko');
			globalRequest.setRequestHeader('Content-Type', 'text/plain; charset=UTF-8');
			if (sendRequest._deviceIdString === void 0) {
				sendRequest._deviceIdString = document.cookie.match(/(?:^|;[ \t]?)unique_id=([^;]+)/);
			}
			if (sendRequest._deviceIdString) {
				globalRequest.setRequestHeader('X-Device-ID', sendRequest._deviceIdString[1]);
			}
			globalRequest.send(createGqlRequestBody(`query($login: String!) {
					user(login: $login) {
						stream {
							isEncrypted
						}
						watchParty {
							session {
								state
							}
						}
					}
				}`, {
				login: globalChannelCode
			}));
		}
		
		function handleResponse({target: request}) {
			globalRequest = null;
			if (request.status >= 200 && request.status < 300 && isObject(request.response)) {
				const shouldRedirect = globalLastCheck === -2;
				globalLastCheck = performance.now();
				let isStreamEndedOrEncoded = true, isSharedViewing = false;
				try {
					isStreamEndedOrEncoded = request.response.data.user.stream.isEncrypted === true;
					isSharedViewing = request.response.data.user.watchParty.session.state === 'IN_PROGRESS';
				} catch (_) {}
				globalIsStreaming = !isStreamEndedOrEncoded && !isSharedViewing;
				if (globalIsStreaming && shouldRedirect) {
					redirectToOurPlayer(globalChannelCode);
				}
			} else {
				globalLastCheck = 0;
			}
		}
		
		function launchOurPlayer(channelCode) {
			const playerUrl = getPlayerUrl(channelCode);
			log.logOk(`[content.js] Navigating to page ${playerUrl}`);
			disableAutoRedirectForThisPage();
			setPageUrl(playerUrl);
		}
		
		function redirectToOurPlayer(channelCode) {
			const playerUrl = getPlayerUrl(channelCode);
			log.logOk(`[content.js] Changing page URL from ${location.href} to ${playerUrl}`);
			document.documentElement.setAttribute('data-tw5-redirect', playerUrl);
			setPageUrl(playerUrl, true);
		}
		
		function handlePointerDownAndClick(event) {
			if (globalParsedAddress) {
				const linkElement = event.target.closest('a[href]');
				if (linkElement && event.isPrimary !== false && event.button === leftButton && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
					log.logOk(`[content.js] Event ${event.type} occurred at link ${linkElement.href}`);
					requestChannelState(parseAddress(linkElement));
				}
			}
		}
		
		function handlePopState(event) {
			if (globalParsedAddress) {
				log.logOk(`[content.js] popstate event occurred ${location.href}`);
				if (getBrowserEngineVersion() < 67) {
					document.title = 'Twitch';
				}
				onPageUrlChanged('POPSTATE');
				if (document.documentElement.hasAttribute('data-tw5-redirect')) {
					log.logOk('[content.js] Suppressing popstate event');
					event.stopImmediatePropagation();
				}
			}
		}
		
		function handlePushState() {
			log.logOk(`[content.js] Detected navigation to page ${location.href}`);
			onPageUrlChanged('PUSHSTATE');
		}
		
		function handleOurPlayerLaunch(event) {
			event.preventDefault();
			const addressObject = parseAddress(location);
			if (event.button === leftButton && addressObject.page === 'POSSIBLE_LIVE_STREAM') {
				launchOurPlayer(addressObject.channelCode);
			} else {
				log.logOk(`[content.js] Not launching player Button=${event.button} Page=${addressObject.page}`);
			}
		}
		
		function handleAutoRedirectToggle(event) {
			event.preventDefault();
			const isFlag = !settings.get('isAutoRedirectAllowed');
			log.logOk(`[content.js] Auto-redirect allowed: ${isFlag}`);
			settings.set('isAutoRedirectAllowed', isFlag);
			updateOurButton();
		}
		
		function handleHelpClose(event) {
			event.preventDefault();
			log.logOk('[content.js] Closing help');
			event.currentTarget.classList.remove('tw5-help');
			event.currentTarget.removeEventListener('mouseover', handleHelpClose);
			event.currentTarget.removeEventListener('touchstart', handleHelpClose, {
				passive: false
			});
			settings.set('isAutoRedirectDetected', true);
		}
		
		function getOurButton() {
			return document.getElementById('tw5-auto-redirect');
		}
		
		function updateOurButton() {
			getOurButton().classList.toggle('tw5-forbidden', !settings.get('isAutoRedirectAllowed'));
		}
		
		function getButtonSpot() {
			if (globalParsedAddress.isMobileVersion) {
				const mobileMenuElement = document.querySelector('.mw-top-nav__menu');
				if (mobileMenuElement && mobileMenuElement.parentNode) {
					return { elementRef: mobileMenuElement, method2: 'beforebegin' };
				}
			} else {
				const navigationElement = document.querySelector('.top-nav__nav-items-container');
				if (navigationElement && navigationElement.nextElementSibling) {
					return { elementRef: navigationElement.nextElementSibling, method2: 'afterend' };
				}
			}
			const modernMenuElement = document.querySelector('.top-nav__menu > div:last-child > div:first-child');
			if (modernMenuElement) {
				return { elementRef: modernMenuElement, method2: 'afterend' };
			}
			return null;
		}
		
		function insertOurButton() {
			const location = getButtonSpot();
			if (!location) {
				return false;
			}
			if (globalParsedAddress.isMobileVersion) {
				log.logOk('[content.js] Inserting our button for mobile site');
				location.elementRef.insertAdjacentHTML(location.method2, `
				<div class="tw5-auto-redirect tw5-js-remove">
					<button id="tw5-auto-redirect">
						<svg viewBox="0 0 128 128">
							<g>
								<path d="M64 53h-19.688l-1.313-15.225h57l1.313-14.7h-74.55l3.937 44.888h51.712l-1.8 19.162-16.6 4.463l-16.8-4.463-1.1-11.813h-14.7l1.838 23.362 30.713 8.4l30.45-8.4 4.2-45.675z"/>
							</g>
						</svg>
					</button>
					<style>
						.tw5-auto-redirect
						{
							flex: 0 0;
							margin: 0 0 0 .5rem;
						}
						.tw5-auto-redirect button
						{
							align-items: center;
							background-color: transparent;
							border-radius: .4rem;
							color: #0e0e10;
							display: inline-flex;
							height: 3.6rem;
							justify-content: center;
							width: 3.6rem;
						}
						.tw-root--theme-dark .tw5-auto-redirect button
						{
							color: #efeff1;
						}
						.tw5-auto-redirect button:active
						{
							background-color: rgba(0, 0, 0, 0.05);
						}
						.tw-root--theme-dark .tw5-auto-redirect button:active
						{
							background-color: rgba(255, 255, 255, 0.15);
						}
						.tw5-auto-redirect svg
						{
							fill: currentColor;
							width: 75%;
						}
						.tw5-forbidden svg
						{
							opacity: .4;
						}
					</style>
				</div>
				`);
			} else {
				log.logOk('[content.js] Inserting our button');
				location.elementRef.insertAdjacentHTML(location.method2, `
				<div class="tw5-auto-redirect tw5-js-remove">
					<button id="tw5-auto-redirect">
						<svg viewBox="0 0 128 128">
							<g>
								<path d="M64 53h-19.688l-1.313-15.225h57l1.313-14.7h-74.55l3.937 44.888h51.712l-1.8 19.162-16.6 4.463l-16.8-4.463-1.1-11.813h-14.7l1.838 23.362 30.713 8.4l30.45-8.4 4.2-45.675z"/>
							</g>
						</svg>
					</button>
					<div class="tw5-tooltip">
						${i18n.GetMessage('F0600')}
					</div>
					<style>
						.tw5-auto-redirect
						{
							flex: 0 0;
							margin: 0 .5rem;
							position: relative;
						}
						.tw5-auto-redirect button
						{
							align-items: center;
							background-color: var(--color-background-button-text-default);
							border-radius: var(--border-radius-medium);
							color: var(--color-fill-button-icon);
							display: inline-flex;
							height: var(--button-size-default);
							justify-content: center;
							width: var(--button-size-default);
						}
						.tw5-auto-redirect button:hover
						{
							background-color: var(--color-background-button-text-hover);
							color: var(--color-fill-button-icon-hover);
						}
						.tw5-auto-redirect button:active
						{
							background-color: var(--color-background-button-text-active);
							color: var(--color-fill-button-icon-active);
						}
						.tw5-auto-redirect svg
						{
							fill: currentColor;
							width: 75%;
						}
						.tw5-forbidden svg
						{
							opacity: .4;
						}
						.tw5-tooltip
						{
							background-color: var(--color-background-tooltip);
							border-radius: var(--border-radius-medium);
							color: var(--color-text-tooltip);
							display: none;
							font-size: var(--font-size-6);
							font-weight: var(--font-weight-semibold);
							left: 50%;
							line-height: var(--line-height-heading);
							margin-top: 6px;
							padding: 3px 6px;
							pointer-events: none;
							position: absolute;
							text-align: left;
							top: 100%;
							transform: translateX(-50%);
							user-select: none;
							white-space: nowrap;
							z-index: var(--z-index-balloon);
						}
						.tw5-tooltip::after
						{
							background-color: inherit;
							content: "";
							height: 6px;
							left: 50%;
							position: absolute;
							top: 0;
							transform: rotate(45deg) translateX(-68%);
							width: 6px;
							z-index: var(--z-index-below);
						}
						.tw5-auto-redirect:hover .tw5-tooltip
						{
							display: block;
						}
						.tw5-help .tw5-tooltip
						{
							background: #f00000;
							color: #fff;
							cursor: pointer;
							display: block;
							pointer-events: auto;
						}
					</style>
				</div>
				`);
			}
			const buttonElement = getOurButton();
			buttonElement.addEventListener('click', handleOurPlayerLaunch);
			buttonElement.addEventListener('contextmenu', handleAutoRedirectToggle);
			if (!globalParsedAddress.isMobileVersion && !settings.get('isAutoRedirectDetected')) {
				buttonElement.parentNode.classList.add('tw5-help');
				buttonElement.parentNode.addEventListener('mouseover', handleHelpClose);
				buttonElement.parentNode.addEventListener('touchstart', handleHelpClose, {
					passive: false
				});
			}
			updateOurButton();
			return true;
		}
		
		function isOurButtonPage() {
			return !!globalParsedAddress && (globalParsedAddress.page === 'CHANNEL_CHAT' || globalParsedAddress.page === 'POSSIBLE_LIVE_STREAM');
		}

		function insertOurButtonIfNeeded() {
			if (!isOurButtonPage()) {
				return false;
			}
			if (getOurButton()) {
				return true;
			}
			if (globalIsAwaitingButtonInsert) {
				return false;
			}
			globalIsAwaitingButtonInsert = true;
			requestAnimationFrame(() => {
				globalIsAwaitingButtonInsert = false;
				if (!getOurButton()) {
					insertOurButton();
				}
			});
			return false;
		}
		
		function watchPageMarkup() {
			if (!document.documentElement) {
				window.addEventListener('DOMContentLoaded', watchPageMarkup, { once: true });
				return;
			}
			insertOurButtonIfNeeded();
			new MutationObserver(() => insertOurButtonIfNeeded()).observe(document.documentElement, {
				childList: true,
				subtree: true
			});
		}
		
		function checkUrlChange() {
			if (document.documentElement && document.documentElement.hasAttribute('data-tw5-redirect')) {
				return;
			}
			if (location.href === globalLastUrl) {
				return;
			}
			globalLastUrl = location.href;
			log.logOk(`[content.js] Detected URL change ${location.href}`);
			handlePushState();
			insertOurButtonIfNeeded();
		}
		
		function watchUrl() {
			globalLastUrl = location.href;
			setInterval(checkUrlChange, 200);
		}
		
		function waitForHomeLoad() {
			return new Promise(execute => {
				if (document.readyState !== 'loading') {
					execute();
				} else {
					document.addEventListener('DOMContentLoaded', function handleHomeLoad() {
						document.removeEventListener('DOMContentLoaded', handleHomeLoad);
						execute();
					});
				}
			});
		}
		
		function waitForPageLoad() {
			return new Promise(execute => {
				if (document.readyState === 'complete') {
					execute();
				} else {
					window.addEventListener('load', function handlePageLoad() {
						window.removeEventListener('load', handlePageLoad);
						execute();
					});
				}
			});
		}

		function start() {
			const eventName = window.PointerEvent ? 'pointerdown' : 'mousedown';
			window.addEventListener(eventName, handlePointerDownAndClick, true);
			window.addEventListener('click', handlePointerDownAndClick, true);
			window.addEventListener('popstate', handlePopState);
			settings.restore().then(() => {
				onPageUrlChanged('LOAD');
				// Twitch switches channels with pushState, so URL polling must run
				// from every top-frame page, not only from an initial channel URL.
				if (window.top === window) {
					watchPageMarkup();
					watchUrl();
				}
			}).catch(debug.exceptionCaught);
		}

		return { start };
	}

	TW5.content = TW5.content || {};
	TW5.content.navigation = { create };
})();
