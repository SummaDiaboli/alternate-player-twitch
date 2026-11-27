// @ts-nocheck: enabled as this script is split into checked modules.
'use strict';

const extensionVersion = chrome.runtime.getManifest().version;

const metadataLoadMaxDuration = 15e3;

const VARIANT_LIST_LOAD_TIMEOUT = 15e3;

const SEGMENT_LIST_LOAD_TIMEOUT = 6e3;

const processingAwaitingLoad = 1;

const processingLoading = 2;

const processingLoaded = 3;

const processingTransformed = 4;

const launchState = 1;

const streamStartState = 2;

const streamEndState = 3;

const loadingState = 4;

const playbackStartState = 5;

const playbackState = 6;

const stoppedState = 7;

const repeatState = 8;

const variantChangeState = 9;

const SUBSCRIPTION_UPDATING = -1;

const subscriptionUnavailable = 0;

const subscriptionNotSubscribed = 1;

const subscriptionDoNotNotify = 2;

const subscriptionNotify = 3;

const responseCode = 'Server returned code ';

function getMaxVolume() {
	return settings.get('volumeBoostEnabled') ? maxAmplifiedVolume : maxVolume;
}

function getVolume() {
	return Math.min(settings.get('volume2'), getMaxVolume());
}

let globalExactTimeMs = NaN;

if (!navigator.clipboard) {
	navigator.clipboard = {};
}

if (!navigator.clipboard.writeText) {
	navigator.clipboard.writeText = function(textString) {
		assert(typeof textString == 'string');
		return new Promise(wrapErrors((execute, reject) => {
			const textElement = document.createElement('input');
			textElement.type = 'text';
			textElement.readOnly = true;
			textElement.value = textString;
			textElement.style.position = 'fixed';
			textElement.style.left = '-100500px';
			document.body.appendChild(textElement);
			textElement.select();
			const isSuccess = document.execCommand('copy');
			textElement.remove();
			if (isSuccess) {
				execute();
			} else {
				reject();
			}
		}));
	};
}

function round(numericValue, precision) {
	assert(typeof numericValue == 'number' && Number.isInteger(precision) && precision >= 0 && precision <= 20);
	if (precision === 0) {
		return Math.round(numericValue);
	}
	const counter = Math.pow(10, precision);
	return Math.round(numericValue * counter) / counter;
}

function limit(numericValue, minValue, maxValue) {
	assert(Number.isFinite(numericValue) && Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue <= maxValue);
	return Math.min(Math.max(numericValue, minValue), maxValue);
}

function chain(objectValue, ...propertyList) {
	assert(propertyList.length !== 0);
	for (const propertyName of propertyList) {
		if (!isObject(objectValue)) {
			return null;
		}
		assert(isNonEmptyString(propertyName));
		objectValue = objectValue[propertyName];
	}
	return objectValue;
}

function ResolveRelativeUrl(sRelativeUrl, sAbsoluteBaseUrl) {
	return new URL(sRelativeUrl, sAbsoluteBaseUrl).href;
}

function setDocumentTitle(heading) {
	history.replaceState(null, '');
	document.title = heading;
}

function assertExtensionPermissions() {
	return new Promise(execute => {
		chrome.permissions.contains({
			origins: chrome.runtime.getManifest().permissions.filter(permission => permission.includes(':'))
		}, isAllowed => {
			if (chrome.runtime.lastError) {
				console.error('permissions.contains', chrome.runtime.lastError.message);
				debug.finishAndShowMessage('J0221');
			}
			if (!isAllowed) {
				debug.finishAndShowMessage('J0215');
			}
			execute();
		});
	});
}

getCurrentTab.tabId = NaN;

getCurrentTab.cookieStore = '';

function getCurrentTab() {
	return new Promise(execute => {
		chrome.tabs.getCurrent(wrapErrors(tab => {
			if (chrome.runtime.lastError || !isObject(tab) || !Number.isSafeInteger(tab.id) || tab.id === chrome.tabs.TAB_ID_NONE) {
				console.error('tabs.getCurrent', chrome.runtime.lastError && chrome.runtime.lastError.message);
				debug.finishAndShowMessage('J0221');
			}
			getCurrentTab.tabId = tab.id;
			execute();
		}));
	});
}

function getAllCookies(address) {
	return new Promise(execute => {
		const params = {
			url: address
		};
		if (getCurrentTab.cookieStore) {
			params.storeId = getCurrentTab.cookieStore;
		}
		chrome.cookies.getAll(params, wrapErrors(cookiesStorage => {
			if (!chrome.runtime.lastError && Array.isArray(cookiesStorage)) {
				log.logInfo(`[API] Cookie count: ${cookiesStorage.length}`);
				execute(cookiesStorage);
			} else {
				console.error('cookies.getAll', chrome.runtime.lastError && chrome.runtime.lastError.message);
				debug.finishAndShowMessage('J0221');
			}
		}));
	});
}

function removeCookie(name, address) {
	return new Promise(execute => {
		chrome.cookies.remove({
			name: name,
			url: address
		}, wrapErrors(() => {
			if (chrome.runtime.lastError) {
				console.error('cookies.remove', chrome.runtime.lastError.message);
				debug.finishAndShowMessage('J0221');
			}
			execute();
		}));
	});
}

function openAddressInNewTab(address) {
	window.open(address);
}

function writeTextToLocalFile(textString, dataTypeName, fileName) {
	assert(typeof textString == 'string' && isNonEmptyString(dataTypeName) && isNonEmptyString(fileName));
	const linkElement = document.createElement('a');
	linkElement.href = URL.createObjectURL(new Blob([ textString ], {
		type: dataTypeName
	}));
	linkElement.download = fileName;
	linkElement.dispatchEvent(new MouseEvent('click'));
}

function createElementEventHandler(invokeCallback) {
	return wrapErrors(event => {
		if (event.target.nodeType === Node.ELEMENT_NODE) {
			invokeCallback(event);
		}
	});
}

function isEventForLink(event) {
	return !!event.target.closest('a[href]');
}

function canScrollElementAtPoint(x, y) {
	for (let elementNode = document.elementFromPoint(x, y); elementNode; elementNode = elementNode.parentElement) {
		if (canScrollElement(elementNode)) {
			return true;
		}
	}
	return false;
}

function canScrollElement(elementNode) {
	const style = getComputedStyle(elementNode);
	return (style.overflowY === 'scroll' || style.overflowY === 'auto') && elementNode.clientHeight < elementNode.scrollHeight;
}

function isElementFullyScrolled(elementItem) {
	return elementItem.scrollHeight - elementItem.scrollTop - elementItem.clientHeight < 2;
}

function showElement(elementValue, shouldShow) {
	const elementNode = element(elementValue);
	if (shouldShow) {
		elementNode.removeAttribute('hidden');
	} else {
		elementNode.setAttribute('hidden', '');
	}
	return elementNode;
}

function isElementShown(elementValue) {
	return !element(elementValue).hasAttribute('hidden');
}

function updateButton(button, state) {
	const buttonElement = element(button);
	const stateNumber = Number(state);
	const stateElements = buttonElement.getElementsByTagName('use');
	assert(stateNumber >= 0 && stateNumber < stateElements.length);
	for (let yMarker = 0; yMarker < stateElements.length; ++yMarker) {
		if (yMarker === stateNumber) {
			const hintText = stateElements[yMarker].getAttributeNS('http://www.w3.org/1999/xlink', 'title');
			if (hintText) {
				buttonElement.title = TW5.messages.getMessageText(hintText);
			}
			stateElements[yMarker].removeAttribute('display');
		} else {
			stateElements[yMarker].setAttribute('display', 'none');
		}
	}
	return buttonElement;
}

const debug = TW5.player.debug.create();

class cancelPromise {
	constructor() {
		this.isCancelled = false;
		this._handler = null;
	}
	cancel() {
		this.isCancelled = true;
		if (this._handler) {
			this._handler();
			this._handler = null;
		}
	}
	replaceHandler(handler) {
		assert(!this.isCancelled);
		assert(typeof handler == 'function' || handler === null);
		this._handler = handler;
	}
}

cancelPromise.reason = new Error('PROMISE_CANCELED');

function wait(promiseCancellation, milliseconds) {
	if (promiseCancellation && promiseCancellation.isCancelled) {
		return Promise.reject(cancelPromise.reason);
	}
	if (milliseconds === -Infinity) {
		let promise = Promise.resolve();
		if (promiseCancellation) {
			promise = promise.then(() => {
				if (promiseCancellation.isCancelled) {
					throw cancelPromise.reason;
				}
			});
		}
		return promise;
	}
	assert(Number.isFinite(milliseconds));
	milliseconds = Math.round(milliseconds);
	assert(milliseconds >= 0 && milliseconds <= 2147483647);
	if (promiseCancellation) {
		return new Promise((execute, reject) => {
			const timerId = setTimeout(() => {
				promiseCancellation.replaceHandler(null);
				execute();
			}, milliseconds);
			promiseCancellation.replaceHandler(() => {
				clearTimeout(timerId);
				reject(cancelPromise.reason);
			});
		});
	}
	return new Promise(execute => {
		setTimeout(execute, milliseconds);
	});
}

class segmentItem {
	constructor(processingCount, dataValue, duration, isGap, number) {
		assert(typeof processingCount == 'number' && processingCount >= processingAwaitingLoad && processingCount <= processingTransformed);
		assert(typeof dataValue == 'number' && processingCount >= processingLoaded || typeof dataValue == 'string' && processingCount === processingAwaitingLoad || isObject(dataValue) && processingCount > processingAwaitingLoad);
		switch (arguments.length) {
		  case 2:
			duration = 0;
			isGap = true;

		  case 4:
			assert(Number.isFinite(duration) && duration >= 0);
			assert(typeof isGap == 'boolean');
			number = ++segmentItem._number;

		  case 5:
			assert(Number.isFinite(number));
			break;

		  default:
			assert(false);
		}
		if (typeof dataValue == 'number') {
			log.logOk(`[Queue] Segment added ${number} State=${dataValue} Processing=${processingCount}`);
		}
		this.processingCount = processingCount;
		this.dataValue = dataValue;
		this.duration = duration;
		this.isGap = isGap;
		this.number = number;
	}
	toString() {
		if (typeof this.dataValue == 'number') {
			return `${this.number}-${this.processingCount}-${this.dataValue}`;
		}
		if (this.isGap) {
			return `${this.number}-${this.processingCount}-G`;
		}
		return `${this.number}-${this.processingCount}`;
	}
}

segmentItem._number = 0;

let globalQueue = [];

let globalIsFmp4 = false;
let globalFmp4Codecs = '';
let globalFmp4Initialization = null;
let globalFmp4InitBuffer = null;
let globalFmp4LoadedInitUrl = '';
let globalFmp4InitLoadCancellation = null;
let globalFmp4HasVideo = false;
let globalFmp4HasAudio = false;

function loadFmp4Init() {
	if (!globalFmp4Initialization || globalFmp4InitLoadCancellation) {
		return;
	}
	const address = globalFmp4Initialization.address;
	globalFmp4InitLoadCancellation = new cancelPromise();
	loader.load(globalFmp4InitLoadCancellation, 'GET', address, 15e3, null, null, 'initialization segment', false, 0).then(wrapErrors(buffer2 => {
		globalFmp4InitLoadCancellation = null;
		if (!globalIsFmp4 || !globalFmp4Initialization || globalFmp4Initialization.address !== address) {
			return;
		}
		globalFmp4InitBuffer = buffer2;
		globalFmp4LoadedInitUrl = address;
		log.logOk(`[fMP4] Loaded initialization segment ${buffer2.byteLength} bytes`);
		converterModule.convertNextSegment();
	})).catch(wrapErrors(reasonValue => {
		globalFmp4InitLoadCancellation = null;
		if (reasonValue !== cancelPromise.reason) {
			throw reasonValue;
		}
	}));
}

globalQueue.countConvertedSegments = function() {
	let quantity = 0, duration = 0;
	for (;quantity < this.length && this[quantity].processingCount === processingTransformed; ++quantity) {
		if (typeof this[quantity].dataValue != 'number') {
			duration += this[quantity].duration;
		}
	}
	return {
		quantity,
		duration
	};
};

globalQueue.add = function(segment) {
	assert(segment instanceof segmentItem);
	for (let objectRef of this) {
		assert(objectRef.number !== segment.number);
	}
	if (segment.processingCount !== processingTransformed) {
		this.push(segment);
	} else {
		const {quantity, duration} = this.countConvertedSegments();
		if (duration > bufferOverflow * 1.5) {
			debug.finishAndShowMessage('J0208');
		}
		this.splice(quantity, 0, segment);
	}
	return segment;
};

globalQueue.remove = function(elementValue, quantity = 1) {
	if (quantity === 0) {
		return;
	}
	assert(Number.isInteger(quantity) && quantity > 0);
	let index;
	if (typeof elementValue == 'number') {
		assert(Number.isInteger(elementValue) && elementValue >= 0);
		index = elementValue;
	} else if ((index = this.indexOf(elementValue)) === -1) {
		assert(elementValue instanceof segmentItem);
		return;
	}
	while (--quantity >= 0) {
		assert(index < this.length);
		switch (this[index].processingCount) {
		  case processingLoading:
			if (isObject(this[index].dataValue)) {
				log.logInfo(`[Queue] Cancelling load of ${this[index]}`);
				this[index].dataValue.cancel();
			}
			break;

		  case processingLoaded:
			trashModule.discard(this[index].dataValue);
			break;

		  case processingTransformed:
			if (isObject(this[index].dataValue)) {
				trashModule.discard(this[index].dataValue.isInitSegment);
				trashModule.discard(this[index].dataValue.mediaSegmentData);
			}
		}
		log.logInfo(`[Queue] Removing ${this[index]}`);
		this.splice(index, 1);
	}
};

globalQueue.clear = function() {
	this.remove(0, this.length);
};

globalQueue.showState = function() {
	log.logInfo(`[Queue] ${this.join(' ')}`);
};

class numberInput {
	constructor(settingName, step, precision, nodeId) {
		assert(precision >= 0 && isNonEmptyString(nodeId));
		this._settingName = settingName;
		this._stepNumber = step;
		this._precision = precision;
		this._addCount = 0;
		this._intervalMs = 0;
		this._timer = 0;
		events.addHandler(`drag-handle-dragging-${nodeId}`, params => this._handleDrag(params));
		this._numberElement = document.querySelector(`#${nodeId} > .number-input-value`);
		this.update();
	}
	update(numericValue = settings.get(this._settingName)) {
		this._numberElement.value = numericValue === autoTune ? TW5.messages.getMessageText(settings.getSettingParam(this._settingName).autoTuneName) : i18n.formatNumber(numericValue, this._precision);
	}
	_handleDrag(params) {
		const VALUE_CHANGE_INTERVAL = 130;
		if (params.step === 1) {
			this._addCount = params.pressedElement.classList.contains('number-input-minus') ? -this._stepNumber : this._stepNumber;
			this._intervalMs = 0;
			this._timer = setInterval(() => this._handleTimer(), VALUE_CHANGE_INTERVAL);
			this._handleTimer();
		}
		if (params.step === 3) {
			clearInterval(this._timer);
		}
	}
}

numberInput.prototype._handleTimer = wrapErrors(function() {
	const VALUE_CHANGE_DELAY = 3;
	if (++this._intervalMs == 1 || this._intervalMs > VALUE_CHANGE_DELAY) {
		const setupParams = settings.getSettingParam(this._settingName);
		const numericValue = settings.get(this._settingName);
		let newNumericValue;
		if (setupParams.autoTuneName && this._addCount < 0 && numericValue === setupParams.minimumNumber || setupParams.autoTuneName && this._addCount > 0 && numericValue === setupParams.maximumNumber) {
			newNumericValue = autoTune;
		} else if (numericValue === autoTune && this._addCount > 0) {
			newNumericValue = setupParams.minimumNumber;
		} else if (numericValue === autoTune && this._addCount < 0) {
			newNumericValue = setupParams.maximumNumber;
		} else {
			newNumericValue = numericValue + this._addCount;
		}
		if (newNumericValue !== autoTune) {
			newNumericValue = limit(round(newNumericValue, this._precision), setupParams.minimumNumber, setupParams.maximumNumber);
		}
		if (newNumericValue !== numericValue) {
			settings.set(this._settingName, newNumericValue);
			this.update(newNumericValue);
			this.afterChange(newNumericValue);
		}
	}
});

numberInput.prototype.afterChange = placeholder;

const events = TW5.player.events.create();

const trashModule = TW5.player.trash.create();

const magicianModule = TW5.player.focus.create();

const pulseModule = TW5.player.pulse.create();

const stats = TW5.player.stats.create();

const windowModule = TW5.player.windows.create();

const menu = TW5.player.menu.create();

const fullscreenMode = TW5.player.fullscreen.create();

const pictureInPictureModule = TW5.player.pictureInPicture.create();

const draggerModule = TW5.player.dragger.create();

const autoHide = TW5.player.autoHide.create();

const mediaQuery = TW5.player.mediaQuery.create();

const themeModule = TW5.player.theme.create();

const notification = TW5.player.notification.create();

const scale = TW5.player.scale.create();

const newsModule = TW5.player.news.create();

const control = TW5.player.controls.create();

const chat = TW5.player.chat.create();

const audioDeviceModule = TW5.player.audioDevices.create();

const volumeBoostModule = TW5.player.volumeBoost.create();

const player = TW5.player.playback.create();

const listModule = TW5.player.variants.create();

const converterModule = TW5.player.converter.create();

const loader = TW5.player.loader.create();

const Twitch = (() => {
	const streamMetadataUpdateInterval = 6e4;
	const WATCH_TRACKING_INTERVAL = 6e4;
	let _viewTrackingUrl = 'https://spade.twitch.tv/track';
	let _channelCode = '';
	let _channelId = '';
	let _streamId = '';
	let _recordUrl = '';
	let _deviceId = '';
	let _viewerId = '';
	let _viewerCode = '';
	let _viewerToken = '';
	let _viewerName = '';
	let _gqlToken = '';
	let _gqlTokenExpiresAt = 0;
	let _sPlaySessionID = '';
	let _metadataUpdateCancel = null;
	let _watchTrackingTimerId = 0;
	let _isRaidHandled = false;
	function goToRaidChannel(channelCode) {
		if (_isRaidHandled || !isNonEmptyString(channelCode) || !settings.get('followRaids') || channelCode === _channelCode) {
			return;
		}
		_isRaidHandled = true;
		log.logOk(`[Twitch] Raid on channel ${channelCode}, switching player`);
		location.replace(getPlayerUrl(channelCode));
	}
	document.addEventListener('tw5-raid', wrapErrors(event => {
		goToRaidChannel(chain(event2.detail, 'channel'));
	}));
	function clearStreamData() {
		_streamId = _recordUrl = '';
	}
	function getChannelUrl(shouldNotRedirect) {
		return shouldNotRedirect ? `https://www.twitch.tv/${encodeURIComponent(_channelCode)}?${urlNoRedirect}` : `https://www.twitch.tv/${encodeURIComponent(_channelCode)}`;
	}
	function getChatPanelUrl() {
		if (settings.get('isFullChat')) {
			return `https://www.twitch.tv/popout/${encodeURIComponent(_channelCode)}/chat?no-mobile-redirect=true&popout=`;
		}
		return `https://www.twitch.tv/embed/${encodeURIComponent(_channelCode)}/chat?${settings.get('shouldDimChat') ? 'darkpopout&' : ''}parent=localhost`;
	}
	function getRecordingUrl(recordId) {
		assert(isNonEmptyString(recordId));
		return `https://www.twitch.tv/videos/${encodeURIComponent(recordId)}`;
	}
	function getCategoryUrl(categoryName) {
		assert(isNonEmptyString(categoryName));
		return `https://www.twitch.tv/directory/category/${encodeURIComponent(categoryName)}`;
	}
	function getCommandUrl(commandName) {
		assert(isNonEmptyString(commandName));
		return `https://www.twitch.tv/team/${encodeURIComponent(commandName)}`;
	}
	function checkUrlAvailability(address) {
		if (address.startsWith('https://coolcmd.github.io/')) {
			return;
		}
		if (!/^https?:\/\/(?:[^/]+\.)?(?:twitch\.tv|twitchcdn\.net|ttvnw\.net|jtvnw\.net|live-video\.net|akamaized\.net|cloudfront\.net)\//.test(address)) {
			throw new Error(`Unknown URL: ${address}`);
		}
	}
	function createUniqueId(lengthCount) {
		assert(Number.isInteger(lengthCount) && lengthCount > 0);
		const allowedChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		let resultText = '';
		while (resultText.length !== lengthCount) {
			resultText += allowedChars[Math.floor(Math.random() * allowedChars.length)];
		}
		return resultText;
	}
	getGqlToken._promise = null;
	getGqlToken.onGqlTokenChanged = null;
	function getGqlToken() {
		const WAIT_FOR_TOKEN = 3e4;
		if (getGqlToken._promise === null) {
			getGqlToken._promise = new Promise((execute, reject) => {
				log.logOk('[Twitch] Inserting frame to intercept GQL token');
				const frame = document.createElement('iframe');
				frame.src = 'https://www.twitch.tv/popout/';
				frame.id = 'gql-token';
				frame.hidden = true;
				assert(!document.getElementById(frame.id));
				document.body.appendChild(frame);
				const timerId = setTimeout(wrapErrors(() => {
					log.logError('[Twitch] Timed out waiting for GQL token');
					frame.remove();
					getGqlToken._promise = getGqlToken.onGqlTokenChanged = null;
					reject('ОТКАЗАНО_В_ДОСТУПЕ');
				}), WAIT_FOR_TOKEN);
				getGqlToken.onGqlTokenChanged = (() => {
					if (_gqlToken !== '') {
						clearTimeout(timerId);
						frame.remove();
						getGqlToken._promise = getGqlToken.onGqlTokenChanged = null;
						execute(_gqlToken);
					}
				});
			});
		}
		return getGqlToken._promise;
	}
	function sendGqlRequest(promiseCancellation, requestText, variables, shouldSendViewerToken, shouldSendGqlToken, shouldRetryRequest, downloadName, maxLoadDuration = metadataLoadMaxDuration) {
		const retryRequestDelay = 5e3;
		assert(isNonEmptyString(_deviceId));
		if (variables !== null) {
			requestText = createGqlRequestBody(requestText, variables);
		}
		const requestHeaders = {
			'Accept-Language': 'en-US',
			'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
			'Content-Type': 'text/plain; charset=UTF-8',
			'X-Device-ID': _deviceId
		};
		if (shouldSendViewerToken && _viewerToken) {
			requestHeaders.Authorization = `OAuth ${_viewerToken}`;
		}
		let isFreshToken = false;
		let promise;
		if (shouldSendGqlToken) {
			if (_gqlToken !== '' && _gqlTokenExpiresAt > Date.now()) {
				log.logInfo(`[Twitch] GQL token expires in ${log.F0((_gqlTokenExpiresAt - Date.now()) / 1e3)}s`);
				requestHeaders['Client-Integrity'] = _gqlToken;
				promise = Promise.resolve();
			} else {
				isFreshToken = true;
				promise = getGqlToken().then(token => {
					requestHeaders['Client-Integrity'] = token;
				});
			}
		} else {
			promise = Promise.resolve();
		}
		return promise.then(() => loader.load(promiseCancellation, 'POST', 'https://gql.twitch.tv/gql', maxLoadDuration, requestHeaders, requestText, downloadName, true, 'json')).then(result => {
			if (!result.errors) {
				return result;
			}
			let promise;
			if (result.errors.some(({message}) => message === 'failed integrity check')) {
				log.logError('[Twitch] Server rejected GQL token');
				if (requestHeaders['Client-Integrity'] === _gqlToken && _gqlToken !== '') {
					clearGqlToken();
				}
				if (!shouldSendGqlToken || isFreshToken) {
					throw 'ОТКАЗАНО_В_ДОСТУПЕ';
				}
				if (requestHeaders['Client-Integrity'] !== _gqlToken && _gqlToken !== '') {
					requestHeaders['Client-Integrity'] = _gqlToken;
					promise = Promise.resolve();
				} else {
					promise = getGqlToken().then(token => {
						requestHeaders['Client-Integrity'] = token;
					});
				}
			} else if (result.errors.some(({message}) => message === 'service timeout')) {
				if (!shouldRetryRequest) {
					log.logError('[Twitch] GQL server busy');
					return result;
				}
				const retryAfter = retryRequestDelay + retryRequestDelay / 2 * Math.random();
				log.logError(`[Twitch] GQL server busy. Request will be retried in ${retryAfter.toFixed()}ms`);
				promise = wait(promiseCancellation, retryAfter);
			} else {
				log.logError('[Twitch] Unknown errors in GQL response');
				return result;
			}
			return promise.then(() => loader.load(promiseCancellation, 'POST', 'https://gql.twitch.tv/gql', maxLoadDuration, requestHeaders, requestText, downloadName, true, 'json')).then(result => {
				if (result.errors) {
					if (result.errors.some(({message}) => message === 'failed integrity check')) {
						log.logError('[Twitch] Server rejected GQL token');
						if (requestHeaders['Client-Integrity'] === _gqlToken && _gqlToken !== '') {
							clearGqlToken();
						}
						throw 'ОТКАЗАНО_В_ДОСТУПЕ';
					}
					log.logError(result.errors.some(({message}) => message === 'service timeout') ? '[Twitch] GQL server busy' : '[Twitch] Unknown errors in GQL response');
				}
				return result;
			});
		});
	}
	function changeViewerSubscriptionToChannel(subscriptionCount) {
		assert(_channelId && _viewerId && _viewerToken);
		assert(_channelId !== _viewerId);
		switch (subscriptionCount) {
		  case subscriptionNotSubscribed:
			unwatchChannel();
			break;

		  case subscriptionDoNotNotify:
		  case subscriptionNotify:
			watchChannel(subscriptionCount);
			break;

		  default:
			assert(false);
		}
	}
	function unwatchChannel() {
		sendGqlRequest(null, `mutation($input: UnfollowUserInput!) {\n\t\t\t\tunfollowUser(input: $input) {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}`, {
			input: {
				targetID: _channelId
			}
		}, true, true, true, 'unfollow channel').then(result => {
			if (result.errors || !result.data || !result.data.unfollowUser) {
				throw 'Server could not complete the operation';
			}
			events.sendEvent('twitch-viewer-metadata-received', {
				subscriptionCount: subscriptionNotSubscribed
			});
		}).catch(reasonValue => {
			if (typeof reasonValue == 'string') {
				log.logError(`[Twitch] Failed to unfollow channel. ${reasonValue}`);
				notification.showButt();
				events.sendEvent('twitch-viewer-metadata-received', {
					subscriptionCount: subscriptionUnavailable
				});
			} else {
				debug.exceptionCaught(reasonValue);
			}
		});
	}
	function watchChannel(subscriptionCount) {
		sendGqlRequest(null, `mutation($input: FollowUserInput!) {
				followUser(input: $input) {
					error {
						code
					}
					follow {
						user {
							id
						}
					}
				}
			}`, {
			input: {
				disableNotifications: subscriptionCount === subscriptionDoNotNotify,
				targetID: _channelId
			}
		}, true, true, true, 'follow channel').then(result => {
			if (result.errors || !result.data || !result.data.followUser || !result.data.followUser.follow || !result.data.followUser.follow.user || result.data.followUser.error) {
				throw 'Server could not complete the operation';
			}
			events.sendEvent('twitch-viewer-metadata-received', {
				subscriptionCount
			});
		}).catch(reasonValue => {
			if (typeof reasonValue == 'string') {
				log.logError(`[Twitch] Failed to follow channel. ${reasonValue}`);
				notification.showButt();
				events.sendEvent('twitch-viewer-metadata-received', {
					subscriptionCount: subscriptionUnavailable
				});
			} else {
				debug.exceptionCaught(reasonValue);
			}
		});
	}
	function isAdSegment(segmentName) {
		return segmentName !== '' && segmentName !== 'live';
	}
	let _shouldSend = null;
	function sendAdTrackingData(segmentList) {
		if (_shouldSend !== null && (segmentList === null || _shouldSend.adToken !== segmentList.adToken)) {
			sendAdBlockView(_shouldSend);
			_shouldSend = null;
		}
		if (_shouldSend === null && segmentList !== null && segmentList.adType) {
			_shouldSend = segmentList;
		}
	}
	function sendAdBlockView(segmentList) {
		wait(null, 3e3).then(() => {
			return sendGqlRequest(null, mergeGqlRequests([ createAdEvent('video_ad_impression', segmentList), createAdEvent('video_ad_quartile_complete', segmentList, 1), createAdEvent('video_ad_quartile_complete', segmentList, 2), createAdEvent('video_ad_quartile_complete', segmentList, 3), createAdEvent('video_ad_quartile_complete', segmentList, 4), createAdEvent('video_ad_pod_complete', segmentList) ]), null, true, false, false, `${segmentList.adType} ${segmentList.adToken.slice(-10)}`, 3e4);
		}).then(resultsMap => {
			for (const result of resultsMap) {
				if (result.errors || !result.data || !result.data.recordAdEvent || result.data.recordAdEvent.error) {
					throw `Server could not complete the operation: ${log.O(result)}`;
				}
			}
		}).catch(reasonValue => {
			if (typeof reasonValue == 'string') {
				log.logError(`[Twitch] Failed to send ad tracking data. ${reasonValue}`);
			} else {
				debug.exceptionCaught(reasonValue);
			}
		});
	}
	function createAdEvent(eventName2, segmentList, quarterNumber) {
		const details = {
			stitched: true,
			player_mute: true,
			player_volume: .5,
			visible: true,
			roll_type: segmentList.adType.toLowerCase()
		};
		switch (eventName2) {
		  case 'video_ad_quartile_complete':
			details.quartile = quarterNumber;

		  case 'video_ad_impression':
			details.total_ads = segmentList.clipCount;
			details.ad_position = segmentList.clipNumber + 1;
			details.duration = Math.round(segmentList.clipDuration);
			details.ad_id = segmentList.clipId1;
			details.creative_id = segmentList.clipId2;
			details.line_item_id = segmentList.clipId3;
			details.order_id = segmentList.clipId4;
			break;

		  case 'video_ad_pod_complete':
			details.ad_session_id = segmentList.clipId5;
			details.format_name = segmentList.clipId6;
			break;

		  default:
			assert(false);
		}
		return createGqlRequestBody(`mutation($input: RecordAdEventInput!) {
				recordAdEvent(input: $input) {
					error {
						code
					}
				}
			}`, {
			input: {
				eventName: eventName2,
				eventPayload: JSON.stringify(details),
				radToken: segmentList.adToken
			}
		});
	}
	getAbsoluteOptionListUrl._expiresAt = -1;
	getAbsoluteOptionListUrl._url = '';
	function getAbsoluteOptionListUrl(promiseCancellation, isHttpsDisabled, isAdFree) {
		const TOKEN_EXPIRES_IN = 15 * 60 * 1e3;
		if (!isAdFree) {
			const expiresIn = getAbsoluteOptionListUrl._expiresAt - performance.now();
			if (expiresIn > 0) {
				log.logInfo(`[Twitch] Stream token expires in ${log.F0(expiresIn / 1e3)}s`);
				return Promise.resolve(getAbsoluteOptionListUrl._url);
			}
		}
		return sendGqlRequest(promiseCancellation, `query(
				$login: String!
				$playerType: String!
				$disableHTTPS: Boolean!
			) {
				streamPlaybackAccessToken(
					channelName: $login
					params: {
						disableHTTPS: $disableHTTPS
						playerType: $playerType
						platform: "web"
						playerBackend: "mediaplayer"
					}
				) {
					value
					signature
				}
			}`, {
			login: _channelCode,
			playerType: isAdFree ? 'picture-by-picture' : 'site',
			disableHTTPS: isHttpsDisabled
		}, true, false, true, `stream token ${+isAdFree}`).then(result => {
			const token = chain(result.data, 'streamPlaybackAccessToken', 'value');
			const signature = chain(result.data, 'streamPlaybackAccessToken', 'signature');
			debug.saveStreamToken(`DeviceId=${_deviceId} ViewerToken=${Boolean(_viewerToken)}\n${token}`, isAdFree);
			if (!isNonEmptyString(token) || !isNonEmptyString(signature)) {
				if (result.errors) {
					throw 'Server could not complete the operation';
				}
				debug.finishAndShowMessage('J0203');
			}
			const tokenData = JSON.parse(token);
			assert(tokenData.channel === _channelCode);
			if (tokenData.ci_gb) {
				debug.finishAndShowMessage('J0217');
			}
			if (_channelId === '') {
				assert(tokenData.channel_id);
				_channelId = String(tokenData.channel_id);
				setTimeout(wrapErrors(updateViewerAndChannelMetadata));
			} else {
				assert(_channelId === String(tokenData.channel_id));
			}
			let address = `${isHttpsDisabled ? 'http' : 'https'}://usher.ttvnw.net/api/channel/hls/${encodeURIComponent(_channelCode)}.m3u8` + '?allow_source=true' + '&allow_audio_only=true' + '&cdm=wv' + '&fast_bread=true' + '&platform=web' + '&player_backend=mediaplayer' + '&playlist_include_framerate=true' + '&reassignments_supported=true' + '&supported_codecs=av1,h265,h264' + '&transcode_mode=cbr_v1' + `&p=${Math.floor(Math.random() * 9999999)}` + `&token=${encodeURIComponent(token)}` + `&sig=${encodeURIComponent(signature)}`;
			if (!isAdFree) {
				_sPlaySessionID = createUniqueId(32);
				address += `&play_session_id=${_sPlaySessionID}`;
				getAbsoluteOptionListUrl._url = address;
				getAbsoluteOptionListUrl._expiresAt = performance.now() + TOKEN_EXPIRES_IN;
			}
			return address;
		});
	}
	function clearGqlToken() {
		_gqlToken = '';
		removeCookie('tw5~gqltoken', 'https://www.twitch.tv/tw5~storage/').catch(debug.exceptionCaught);
	}
	function getUniqueDeviceId() {
		return '0000000000000000' + (settings.get('randomNumber') || .1).toFixed(16).slice(2);
	}
	function parseAuthCookie(cookieString) {
		if (cookieString) {
			try {
				const objectRef = JSON.parse(decodeURIComponent(cookieString));
				assert(isObject(objectRef) && isNonEmptyString(objectRef.id) && isNonEmptyString(objectRef.login) && isNonEmptyString(objectRef.authToken));
				return objectRef;
			} catch (_) {}
			log.logError(`[Twitch] Failed to parse auth cookie: ${cookieString}`);
		}
		return {
			id: '',
			login: '',
			authToken: '',
			displayName: ''
		};
	}
	function parseGqlTokenCookie(cookieString) {
		if (cookieString) {
			try {
				const objectRef = JSON.parse(decodeURIComponent(cookieString));
				assert(isNonEmptyString(objectRef.token) && Number.isSafeInteger(objectRef.expiresAfterMs));
				return [ objectRef.token, objectRef.expiresAfterMs ];
			} catch (_) {
				log.logError(`[Twitch] Failed to parse GQL token cookie: ${cookieString}`);
			}
		}
		return [ '', 0 ];
	}
	function parseCookie(actionIndex, {name, domain, path, value}) {
		if (actionIndex === 3 || typeof value != 'string') {
			value = '';
		}
		switch (name) {
		  case 'twilight-user':
			if (domain === '.twitch.tv' && path === '/') {
				const {id, login, authToken, displayName} = parseAuthCookie(value);
				if (actionIndex !== 1 && (_viewerId !== id || _viewerCode !== login || _viewerToken !== authToken)) {
					debug.finishAndShowMessage('J0222');
				}
				_viewerId = id;
				_viewerCode = login;
				_viewerToken = authToken;
				_viewerName = isNonEmptyString(displayName) ? displayName : login;
			}
			break;

		  case 'unique_id':
			if (domain === '.twitch.tv' && path === '/' && actionIndex === 1 && _deviceId === '') {
				_deviceId = value;
			}
			break;

		  case 'tw5~gqltoken':
			if (domain === 'www.twitch.tv' && path === '/tw5~storage/') {
				[_gqlToken, _gqlTokenExpiresAt] = parseGqlTokenCookie(value);
				if (getGqlToken.onGqlTokenChanged) {
					getGqlToken.onGqlTokenChanged();
				}
			}
		}
	}
	function startInternal(channelCode) {
		assert(isNonEmptyString(channelCode));
		_channelCode = channelCode;
		return getAllCookies('https://www.twitch.tv/tw5~storage/').then(cookiesStorage => {
			for (const cookie of cookiesStorage) {
				parseCookie(1, cookie);
			}
			if (_deviceId === '') {
				log.logError('[Twitch] Device ID not found');
				_deviceId = getUniqueDeviceId();
			}
			chrome.cookies.onChanged.addListener(wrapErrors(({removed, cause, cookie}) => {
				if (!(removed && cause === 'overwrite')) {
					parseCookie(removed ? 3 : 2, cookie);
				}
			}));
		});
	}
	function updateViewerAndChannelMetadata() {
		assert(_channelId);
		sendGqlRequest(null, `query($login: String!, $skip: Boolean!) {
				user(login: $login) {
					broadcastSettings {
						language
					}
					createdAt
					description
					displayName
					followers {
						totalCount
					}
					id
					lastBroadcast {
						startedAt
					}
					primaryTeam {
						displayName
						name
					}
					profileImageURL(width: 70)
					self @skip(if: $skip) {
						canFollow
						follower {
							disableNotifications
						}
					}
				}
			}`, {
			login: _channelCode,
			skip: _channelCode === _viewerCode
		}, true, false, true, 'channel metadata').then(result => {
			if (!result.data) {
				throw 'No metadata in server response';
			}
			const oUser = result.data.user;
			if (!oUser) {
				debug.finishAndShowMessage('J0203');
			}
			assert(oUser.id === _channelId);
			const languageCode = chain(oUser.broadcastSettings, 'language');
			const commandsMap = [];
			if (oUser.primaryTeam) {
				commandsMap.push({
					address: getCommandUrl(oUser.primaryTeam.name),
					name: oUser.primaryTeam.displayName || oUser.primaryTeam.name
				});
			}
			const subscriptionCount = !chain(oUser.self, 'canFollow') ? subscriptionUnavailable : !oUser.self.follower ? subscriptionNotSubscribed : oUser.self.follower.disableNotifications ? subscriptionDoNotNotify : subscriptionNotify;
			events.sendEvent('twitch-channel-metadata-received', {
				name: oUser.displayName || _channelCode,
				avatarUrl: oUser.profileImageURL || 'player.svg#svg-missingavatar',
				descriptionText: oUser.description,
				languageCode: languageCode && languageCode !== 'OTHER' ? languageCode : null,
				subscriberCount: chain(oUser.followers, 'totalCount'),
				channelCreatedAt: Date.parse(oUser.createdAt),
				commandsMap
			});
			events.sendEvent('twitch-viewer-metadata-received', {
				name: _viewerName,
				subscriptionCount
			});
		}).catch(reasonValue => {
			if (typeof reasonValue == 'string') {
				log.logError(`[Twitch] Failed to get channel metadata. ${reasonValue}`);
				events.sendEvent('twitch-channel-metadata-received', {
					name: _channelCode,
					avatarUrl: 'player.svg#svg-missingavatar',
					languageCode: null,
					subscriberCount: null,
					channelCreatedAt: null
				});
				events.sendEvent('twitch-viewer-metadata-received', {
					name: _viewerName,
					subscriptionCount: subscriptionUnavailable
				});
			} else {
				debug.exceptionCaught(reasonValue);
			}
		});
	}
	function updateStreamMetadata(promiseCancellation, delay) {
		assert(_channelId);
		log.logInfo(`[Twitch] Stream metadata loading will start in ${log.F0(delay)}ms`);
		wait(promiseCancellation, delay).then(() => {
			return sendGqlRequest(promiseCancellation, `query($id: ID!, $all: Boolean!) {
					user(id: $id) {
						broadcastSettings {
							game {
								displayName
								slug
							}
							title
						}
						login
						stream {
							archiveVideo @include(if: $all) {
								id
							}
							createdAt
							id
							type
							viewersCount
						}
					}
				}`, {
				id: _channelId,
				all: _streamId === ''
			}, false, false, true, 'stream metadata');
		}).then(result => {
			const oUser = chain(result.data, 'user');
			const channelCode = chain(oUser, 'login');
			if (channelCode !== _channelCode && isNonEmptyString(channelCode)) {
				log.logError(`[Twitch] New channel code ${channelCode}`);
				location.replace(`?channel=${encodeURIComponent(channelCode)}`);
				return;
			}
			const metadata = {
				viewerCount: chain(oUser, 'stream', 'viewersCount')
			};
			const streamId = chain(oUser, 'stream', 'id');
			if (_streamId === '' && isNonEmptyString(streamId)) {
				log.logOk(`[Twitch] Stream ID ${streamId}`);
				_streamId = streamId;
				startWatchingView();
				const recordId = chain(oUser, 'stream', 'archiveVideo', 'id');
				_recordUrl = isNonEmptyString(recordId) ? getRecordingUrl(recordId) : '';
				const streamType = chain(oUser, 'stream', 'type');
				metadata.streamType = streamType === 'live' ? 'live' : streamType === 'rerun' ? 'replay' : null;
			}
			if (_streamId === '' || _streamId === streamId) {
				const streamTitle = chain(oUser, 'broadcastSettings', 'title');
				if (typeof streamTitle == 'string') {
					metadata.streamTitle = streamTitle.trim() || TW5.messages.getMessageText('J0103');
				}
				metadata.gameTitle = chain(oUser, 'broadcastSettings', 'game', 'displayName');
				const gameAddress = chain(oUser, 'broadcastSettings', 'game', 'slug');
				if (gameAddress) {
					metadata.gameAddress = getCategoryUrl(gameAddress);
				}
				metadata.streamDuration = performance.now() + globalExactTimeMs - Date.parse(chain(oUser, 'stream', 'createdAt'));
			}
			events.sendEvent('twitch-stream-metadata-received', metadata);
			updateStreamMetadata(promiseCancellation, streamMetadataUpdateInterval);
		}).catch(wrapErrors(reasonValue => {
			if (typeof reasonValue == 'string') {
				log.logError(`[Twitch] Failed to load stream metadata. ${reasonValue}`);
				updateStreamMetadata(promiseCancellation, streamMetadataUpdateInterval / 2);
			} else if (reasonValue === cancelPromise.reason) {
				log.logInfo('[Twitch] Stream metadata update cancelled');
			} else {
				throw reasonValue;
			}
		}));
	}
	function startCollectingStreamMetadata() {
		clearStreamData();
		assert(!_metadataUpdateCancel);
		_metadataUpdateCancel = new cancelPromise();
		updateStreamMetadata(_metadataUpdateCancel, 0);
	}
	function finishStreamMetadataCollection(isStreamEnded) {
		if (isStreamEnded) {
			clearStreamData();
		}
		if (_metadataUpdateCancel) {
			log.logInfo(`[Twitch] Cancelling stream metadata update chain StreamEnded=${isStreamEnded}`);
			_metadataUpdateCancel.cancel();
			_metadataUpdateCancel = null;
		}
		stopWatchingView();
	}
	function startWatchingView() {
		if (_viewerId !== '') {
			log.logInfo('[Twitch] Starting view tracking');
			assert(_watchTrackingTimerId === 0);
			_watchTrackingTimerId = setInterval(sendViewTrackingData, WATCH_TRACKING_INTERVAL);
			sendViewTrackingData();
		}
	}
	function stopWatchingView() {
		if (_watchTrackingTimerId !== 0) {
			log.logInfo('[Twitch] Stopping view tracking');
			clearInterval(_watchTrackingTimerId);
			_watchTrackingTimerId = 0;
		}
	}
	const sendViewTrackingData = wrapErrors(() => {
		assert(_streamId && _channelId && _viewerId);
		const sendOptions = new URLSearchParams();
		sendOptions.set('data', btoa(JSON.stringify([ {
			event: 'minute-watched',
			properties: {
				broadcast_id: _streamId,
				channel_id: _channelId,
				user_id: Number(_viewerId),
				player: 'site'
			}
		} ])));
		loader.load(null, 'POST', _viewTrackingUrl, metadataLoadMaxDuration, null, sendOptions, 'view tracking', false, 'none').catch(reasonValue => {
			if (typeof reasonValue == 'string') {
				log.logError(`[Twitch] Failed to send view tracking data. ${reasonValue}`);
			} else {
				debug.exceptionCaught(reasonValue);
			}
		});
	});
	function getRecordUrlForCurrentPosition() {
		if (_recordUrl === '') {
			log.logError('[Twitch] Recording URL unknown');
			return '';
		}
		const positionNumber = player.getStreamPlaybackPosition(false);
		if (positionNumber === -1) {
			log.logInfo('[Twitch] Recording URL created without playback position');
			return _recordUrl;
		}
		return `${_recordUrl}?t=${Math.floor(positionNumber / 60 / 60)}h${Math.floor(positionNumber / 60 % 60)}m${Math.floor(positionNumber % 60)}s`;
	}
	function createClip() {
		const positionNumber = player.getStreamPlaybackPosition(true);
		if (_streamId === '' || positionNumber <= 0) {
			log.logError(`[Twitch] Insufficient data to create clip StreamId=${_streamId} Position=${positionNumber}`);
			notification.showButt();
		} else {
			log.logOk(`[Twitch] Creating clip StreamId=${_streamId} Position=${positionNumber} ViewerId=${_viewerId}`);
			notification.show('svg-cut', false);
			openAddressInNewTab(`https://clips.twitch.tv/create?${new URLSearchParams({
				broadcastID: _streamId,
				broadcasterLogin: _channelCode,
				offsetSeconds: Math.ceil(positionNumber)
			})}`);
		}
	}
	function getAbsoluteSegmentListUrl(absoluteSegmentListUrl) {
		return absoluteSegmentListUrl;
	}
	function sortVariantList(optionList) {
		if (optionList.watchTrackingUrl) {
			_viewTrackingUrl = optionList.watchTrackingUrl;
		}
		optionList.options.sort((variant1Obj, variant2) => {
			switch (variant1Obj.identifier) {
			  case 'chunked':
				return -1;

			  case 'audio_only':
				return 1;

			  default:
				return variant2.bitrateKbps - variant1Obj.bitrateKbps;
			}
		});
		return optionList;
	}
	const handleChatMessage = wrapErrors((message, senderObject, replyCallback) => {
		// console.log('[player.js] Message received:', message, 'Sender:', senderObject);
		const isInsertRequest = message.requestText === 'ВставитьСторонниеРасширения' || message.requestText === 'InsertThirdPartyExtensions';
		const isRaidRequest = message.requestText === 'Рейд' || message.requestText === 'Raid';
		if (!isInsertRequest && !isRaidRequest) {
			return false;
		}
		if ((senderObject.tab ? senderObject.tab.id : chrome.tabs.TAB_ID_NONE) !== getCurrentTab.tabId) {
			// console.log('[player.js] Tab ID mismatch, ignoring');
			return false;
		}
		if (isRaidRequest) {
			goToRaidChannel(message.channelCode);
			return false;
		}
		log.logInfo('[Twitch] Received request to insert third-party extensions');
		chrome.management.getAll(wrapErrors(extensionsMap => {
			if (chrome.runtime.lastError) {
				throw new Error(`Failed to get extension list: ${chrome.runtime.lastError.message}`);
			}
		//! Debug: log all extensions (enabled and disabled)
			// console.log('[player.js] All extensions (enabled):', extensionsMap.filter(e => e.enabled).map(e => ({name: e.name, id: e.id})));
			// console.log('[player.js] All extensions (disabled):', extensionsMap.filter(e => !e.enabled).map(e => ({name: e.name, id: e.id})));
			
			//! Send to content script a list of known browser extensions that are currently installed and enabled in the browser.
			//! These extensions will be loaded into <iframe>. See insertThirdPartyExtensions() in content.js.
			//! Chrome itself cannot load installed extensions into another extension.
			//! See https://bugs.chromium.org/p/chromium/issues/detail?id=599167
						message.thirdPartyExtensions = '';
			for (let extensionObject of extensionsMap) {
				if (extensionObject.enabled) {
					// console.log('[player.js] Checking extension:', extensionObject.name, extensionObject.id);
					switch (extensionObject.id) {
					  case /*! Chrome */ 'ajopnjidmegmdimjlfnijceegpefgped':
					  case /*! Opera  */ 'deofbbdfofnmppcjbhjibgodpcdchjii':
					  case /*! Edge   */ 'icllegkipkooaicfmdfaloehobmglglb':
						
						//! BetterTTV browser extension
						//! https://betterttv.com/
						//! https://chrome.google.com/webstore/detail/ajopnjidmegmdimjlfnijceegpefgped
						message.thirdPartyExtensions += 'BTTV ';
						break;

					  case /*! Chrome */ 'fadndhdgpmmaapbmfcknlfgcflmmmieb':
					  case /*! Opera  */ 'djkpepcignmpfblhbfpmlhoindhndkdj':
						
						//! FrankerFaceZ browser extension
						//! https://www.frankerfacez.com/
						//! https://chrome.google.com/webstore/detail/fadndhdgpmmaapbmfcknlfgcflmmmieb
						message.thirdPartyExtensions += 'FFZ ';
					}
				}
			}
			log.logInfo(`[Twitch] Sending response to third-party extension insertion: ${message.thirdPartyExtensions}`);
			try {
				replyCallback(message);
			} catch (exception) {
				log.logError(`[Twitch] Error sending response: ${exception}`);
			}
		}));
		return true;
	});
	function openChat() {
		chrome.runtime.onMessage.addListener(handleChatMessage);
		return getChatPanelUrl();
	}
	function closeChat() {
		chrome.runtime.onMessage.removeListener(handleChatMessage);
	}
	return {
		isAdSegment,
		sendAdTrackingData,
		getAbsoluteOptionListUrl,
		getAbsoluteSegmentListUrl,
		getChannelUrl,
		checkUrlAvailability,
		startCollectingStreamMetadata,
		finishStreamMetadataCollection,
		changeViewerSubscriptionToChannel,
		getRecordUrlForCurrentPosition,
		createClip,
		sortVariantList,
		openChat,
		closeChat,
		startInternal
	};
})();

function finishWork(isFast) {
	try {
		globalIsWorkFinished = true;
		log.logOk('[Launcher] Finishing work');
		window.stop();
		if (!isFast) {
			converterModule.stop();
			player.stop();
			trashModule.burn();
		}
		log.logOk('[Launcher] Work finished');
	} catch (_) {}
}

wrapErrors(() => {
	function isChannelAlreadyOpen(channelName) {
		assert(isNonEmptyString(channelName));
		chrome.runtime.sendMessage({
			requestText: 'ThisChannelIsAlreadyOpen',
			channelName
		}, response => {
			if (response === true) {
				debug.finishAndShowMessage('J0211');
			}
		});
		chrome.runtime.onMessage.addListener(wrapErrors((message, _, replyCallback) => {
			if (message.requestText === 'ЭтотКаналУжеОткрыт' || message.requestText === 'ThisChannelIsAlreadyOpen') {
				log.logError(`[Launcher] Channel ${message.channelName} is open in another tab`);
				if (message.channelName === channelName) {
					replyCallback(true);
				}
			}
		}));
	}
	function handlePageUnload(event) {
		log.logOk(`[Launcher] window.on${event.type}`);
		finishWork(true);
	}
	function startWork() {
		assert(!globalIsWorkFinished);
		log.logInfo(`[Launcher] Start of work ${performance.now().toFixed()}ms`);
		window.addEventListener('unload', handlePageUnload);
		control.start();
		if (player.start()) {
			listModule.start();
		} else {
			control.stopWatchingStream();
		}
		stats.start();
	}
	if (window.top !== window) {
		return;
	}
	if (navigator.userAgent.includes('Gecko/')) {
		debug.finishAndShowMessage('J0204');
	}
	const channelName = (new URLSearchParams(location.search.slice(1)).get('channel') || 'channel').toLowerCase();
	isChannelAlreadyOpen(channelName);
	Promise.all([ assertExtensionPermissions(), settings.restore(), getCurrentTab() ])
		.then(() => i18n.prepare(settings.get('interfaceLanguage')))
		.then(() => Twitch.startInternal(channelName))
		.then(startWork)
		.catch(debug.exceptionCaught);
})();