'use strict';

const keepChannelState = 2e4;

let globalParsedAddress = null;

let urlMode = '';

let globalLastCheck = 0;

let globalRequest = null;

let globalChannelCode = '';

let globalIsStreaming = false;

let globalLastUrl = '';

let globalIsAwaitingButtonInsert = false;

const debug = {
	finishAndShowMessage: finishWork2,
	exceptionCaught: finishWork2
};

function finishWork2(errorOrMessageCode) {
	if (!globalIsWorkFinished) {
		console.error(errorOrMessageCode);
		try {
			globalIsWorkFinished = true;
			log.logOk('[content.js] Работа завершена');
		} catch (_) {}
	}
	throw void 0;
}

function setPageUrl(address, shouldReplace = false) {
	location[shouldReplace ? 'replace' : 'assign'](address);
}

function insertIntoPage(insertCallback) {
	// MV3 fix: Call function directly instead of injecting inline script (CSP violation)
	insertCallback();
}

function canRedirectThisUrl(addressObject) {
	return !addressObject.search.includes(urlNoRedirect);
}

function getNonRedirectableUrl(addressObject) {
	return `${addressObject.protocol}//${addressObject.host}${addressObject.pathname}${addressObject.search.length > 1 ? `${addressObject.search}&${urlNoRedirect}` : `?${urlNoRedirect}`}${addressObject.hash}`;
}

function disableAutoRedirectForThisPage() {
	if (canRedirectThisUrl(location)) {
		history.replaceState(history.state, '', getNonRedirectableUrl(location));
	}
}

parseAddress.notChannelCode = new Set([ 'directory', 'embed', 'friends', 'inventory', 'login', 'logout', 'manager', 'messages', 'payments', 'popout', 'search', 'settings', 'signup', 'subscriptions', 'team' ]);

function parseAddress(addressObject) {
	let isMobileVersion = false;
	let page = 'UNKNOWN';
	let channelCode = '';
	let canRedirect = false;
	if (addressObject.protocol === 'https:' && (addressObject.host === 'www.twitch.tv' || addressObject.host === 'm.twitch.tv')) {
		isMobileVersion = addressObject.host === 'm.twitch.tv';
		const parts = addressObject.pathname.split('/');
		if (parts.length <= 3 && parts[1] && !parts[2]) {
			if (!parseAddress.notChannelCode.has(parts[1])) {
				page = 'POSSIBLE_LIVE_STREAM';
				channelCode = decodeURIComponent(parts[1]);
				canRedirect = canRedirectThisUrl(addressObject);
			}
		} else if ((parts[1] === 'embed' || parts[1] === 'popout') && parts[2] && parts[3] === 'chat') {
			page = 'CHANNEL_CHAT';
			channelCode = decodeURIComponent(parts[2]);
		}
	}
	log.logOk(`[content.js] Адрес разобран: Страница=${page} КодКанала=${channelCode} МожноПеренаправлять=${canRedirect}`);
	return {
		isMobileVersion,
		page,
		channelCode,
		canRedirect
	};
}

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
		log.logOk('[content.js] Отменяю незавершенный запрос');
		globalRequest.abort();
	}
}

function sendRequest() {
	log.logOk(`[content.js] Посылаю запрос для канала ${globalChannelCode}`);
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
	log.logOk(`[content.js] Перехожу на страницу ${playerUrl}`);
	disableAutoRedirectForThisPage();
	setPageUrl(playerUrl);
}

function redirectToOurPlayer(channelCode) {
	const playerUrl = getPlayerUrl(channelCode);
	log.logOk(`[content.js] Меняю адрес страницы с ${location.href} на ${playerUrl}`);
	document.documentElement.setAttribute('data-tw5-redirect', playerUrl);
	setPageUrl(playerUrl, true);
}

function handlePointerDownAndClick(event) {
	if (globalParsedAddress) {
		const linkElement = event.target.closest('a[href]');
		if (linkElement && event.isPrimary !== false && event.button === leftButton && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
			log.logOk(`[content.js] Произошло событие ${event.type} у ссылки ${linkElement.href}`);
			requestChannelState(parseAddress(linkElement));
		}
	}
}

function handlePopState(event) {
	if (globalParsedAddress) {
		log.logOk(`[content.js] Произошло событие popstate ${location.href}`);
		if (getBrowserEngineVersion() < 67) {
			document.title = 'Twitch';
		}
		onPageUrlChanged('POPSTATE');
		if (document.documentElement.hasAttribute('data-tw5-redirect')) {
			log.logOk('[content.js] Скрываю событие popstate');
			event.stopImmediatePropagation();
		}
	}
}

function handlePushState() {
	log.logOk(`[content.js] Обнаружен переход на страницу ${location.href}`);
	onPageUrlChanged('PUSHSTATE');
}

function handleOurPlayerLaunch(event) {
	event.preventDefault();
	const addressObject = parseAddress(location);
	if (event.button === leftButton && addressObject.page === 'POSSIBLE_LIVE_STREAM') {
		launchOurPlayer(addressObject.channelCode);
	} else {
		log.logOk(`[content.js] Не запускать player Кнопка=${event.button} Страница=${addressObject.page}`);
	}
}

function handleAutoRedirectToggle(event) {
	event.preventDefault();
	const isFlag = !settings.get('isAutoRedirectAllowed');
	log.logOk(`[content.js] Автоперенаправление разрешено: ${isFlag}`);
	settings.set('isAutoRedirectAllowed', isFlag);
	updateOurButton();
}

function handleHelpClose(event) {
	event.preventDefault();
	log.logOk('[content.js] Закрываю справку');
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
		log.logOk('[content.js] Вставляю нашу кнопку для мобильного сайта');
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
		log.logOk('[content.js] Вставляю нашу кнопку');
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

function insertOurButtonIfNeeded() {
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
	log.logOk(`[content.js] Обнаружена смена адреса ${location.href}`);
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
		log.logOk(`[content.js] Открываю ссылку в новой вкладке: ${linkElement.getAttribute('href')}`);
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
		log.logOk(`[content.js] Чат перешел на канал ${previousChannelCode}, сообщаю о рейде`);
		chrome.runtime.sendMessage({
			requestText: 'Рейд',
			channelCode: previousChannelCode
		});
	}), 500);
}

function removeOldVersionLeftovers() {}

wrapErrors(() => {
	log.logOk(`[content.js] Запущен ${performance.now().toFixed()}мс ${location.href}`);
	if (parseAddress(location).page === 'CHANNEL_CHAT') {
		insertIntoPage(allowChat);
		if (window.top !== window) {
			insertThirdPartyExtensions();
			setChatStyle();
			setChatBehavior();
			watchRaidInChat();
		}
		return;
	}
	removeOldVersionLeftovers();
	const eventName = window.PointerEvent ? 'pointerdown' : 'mousedown';
	window.addEventListener(eventName, handlePointerDownAndClick, true);
	window.addEventListener('click', handlePointerDownAndClick, true);
	window.addEventListener('popstate', handlePopState);
	settings.restore().then(() => {
		onPageUrlChanged('LOAD');
		const addressValue = parseAddress(location);
		if (addressValue.page === 'CHANNEL_CHAT' || addressValue.page === 'POSSIBLE_LIVE_STREAM') {
			watchPageMarkup();
		}
		if (addressValue.page === 'POSSIBLE_LIVE_STREAM' && window.top === window) {
			watchUrl();
		}
	}).catch(debug.exceptionCaught);
})();
