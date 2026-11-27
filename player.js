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

const Twitch = TW5.player.twitch.create();

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