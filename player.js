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

const debug = (() => {
	const maxReportStringLength = 15e4;
	let _streamToken = '';
	let _adFreeStreamToken = '';
	let _variantList = '';
	let _segmentListsString = [];
	function insertFileDownloadLinks(formElement) {}
	function showPage() {
		try {
			fullscreenMode.disable();
		} catch (_) {}
		document.body.textContent = '';
		for (let elementRef of document.querySelectorAll('link[rel="stylesheet"], style')) {
			elementRef.remove();
		}
		for (let elementRef of [ document.documentElement, document.body ]) {
			elementRef.removeAttribute('class');
			elementRef.removeAttribute('style');
			elementRef.removeAttribute('hidden');
		}
		return new Promise(execute => {
			const elementRef = document.createElement('iframe');
			elementRef.src = 'report.html';
			elementRef.style.position = 'fixed';
			elementRef.style.top = '0';
			elementRef.style.left = '0';
			elementRef.style.width = '100%';
			elementRef.style.height = '100%';
			elementRef.style.zIndex = '100500';
			elementRef.style.border = '0';
			elementRef.addEventListener('load', () => {
				i18n.TranslateDocument(elementRef.contentDocument);
				execute(elementRef.contentDocument);
			});
			document.body.appendChild(elementRef);
		});
	}
	function showForm(document, formId, shouldSetupBackground) {
		if (shouldSetupBackground) {
			document.documentElement.classList.add(formId);
		}
		for (let toggleElementVisibility, showOrHideElements = document.forms, yMarker = 0; toggleElementVisibility = showOrHideElements[yMarker]; ++yMarker) {
			if (toggleElementVisibility.id === formId) {
				showElement(toggleElementVisibility, true);
				const focusElement = toggleElementVisibility.querySelector('[autofocus]');
				if (focusElement) {
					focusElement.focus();
				}
			} else {
				showElement(toggleElementVisibility, false);
			}
		}
	}
	function showMessage(messageText, linkCode, linkUrl) {
		showPage().then(document => {
			document.getElementById('debug-message-text').textContent = messageText;
			if (linkCode) {
				const link = document.getElementById('debug-message-link');
				link.textContent = TW5.messages.getMessageText(linkCode);
				link.href = linkUrl;
			}
			showForm(document, 'debug-message', true);
		});
	}
	function showAndSendReport(report, sendBuffer) {
		showPage().then(document => {
			let formElement;
			if (report.terminationReason === 'ОТПРАВИТЬ ОТЗЫВ') {
				formElement = document.getElementById('debug-feedback');
			} else {
				formElement = document.getElementById('debug-error');
				insertFileDownloadLinks(formElement);
			}
			formElement.elements['debug-report'].value = JSON.stringify(report);
			showForm(document, formElement.id, true);
			document.addEventListener('reset', event => {
				event.preventDefault();
				window.location.reload(true);
			});
			let request, data, code;
			document.addEventListener('submit', event => {
				event.preventDefault();
				if (event.target.id === 'debug-sending') {
					code = 200;
					request.abort();
					return;
				}
				document.getElementById('debug-send-progress').value = 0;
				showForm(document, 'debug-sending', false);
				code = 0;
				if (!request) {
					request = new XMLHttpRequest();
					request.upload.addEventListener('progress', event => {
						document.getElementById('debug-send-progress').value = event.loaded / event.total;
					});
					request.addEventListener('load', () => {
						code = request.status;
					});
					request.addEventListener('loadend', () => {
						if (code >= 200 && code <= 299) {
							window.location.reload(true);
						} else if (code === 474) {
							showForm2('debug-browser-outdated', true);
						} else if (code >= 400 && code <= 499) {
							showForm(document, 'debug-version-outdated', true);
						} else {
							showForm(document, 'debug-send-failure', true);
						}
					});
					data = new FormData(formElement);
					if (sendBuffer) {
						data.append('debug-transport-stream-0', new Blob([ sendBuffer ], {
							type: 'video/mp2t'
						}));
					}
				}
				//! This request sends a crash report or user feedback to the extension developer. The user can
				//! view the contents of report and refuse to send it. See https://coolcmd.github.io/privacy.html
								request.open('POST', 'http://r90354g8.beget.tech/tw5/report3.php');
				request.send(data);
			});
		});
	}
	function saveStreamToken(streamToken, isAdFree) {
		streamToken = clampStringLength(streamToken, maxReportStringLength);
		if (isAdFree) {
			_adFreeStreamToken = streamToken;
		} else {
			_streamToken = streamToken;
		}
	}
	function saveVariantList(variantListString) {
		_variantList = variantListString;
	}
	function saveSegmentList(segmentListString) {
		if (_segmentListsString.length === 10) {
			_segmentListsString.shift();
		}
		_segmentListsString.push(segmentListString);
	}
	function saveTransportStream(segment) {}
	function saveConvertedSegment(segment) {}
	function compactList(listName) {
		return clampStringLength(listName.replace(/^(?:https?:\/\/|#EXT-X-TWITCH-PREFETCH:).+$/gm, stringValue => clampStringLength(stringValue, 100)), maxReportStringLength);
	}
	function detectCpuAndMemory(invokeCallback) {
		const processorAndRam = {
			capacity: navigator.deviceMemory,
			numOfProcessors: navigator.hardwareConcurrency
		};
		if (performance.memory) {
			processorAndRam.jsHeapSizeLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
			processorAndRam.totalJSHeapSize = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
			processorAndRam.usedJSHeapSize = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
		}
		try {
			chrome.system.memory.getInfo(ramCache => {
				try {
					processorAndRam.capacity = round(ramCache.capacity / 1024 / 1024 / 1024, 1);
					processorAndRam.availableCapacity = round(ramCache.availableCapacity / 1024 / 1024 / 1024, 1);
					chrome.system.cpu.getInfo(processor => {
						try {
							processorAndRam.numOfProcessors = processor.numOfProcessors;
							processorAndRam.modelName = processor.modelName;
							processorAndRam.archName = processor.archName;
						} catch (_) {}
						invokeCallback(processorAndRam);
					});
				} catch (_) {
					invokeCallback(processorAndRam);
				}
			});
		} catch (_) {
			invokeCallback(processorAndRam);
		}
	}
	function detectGpu() {
		try {
			const oContext = document.createElement('canvas').getContext('webgl');
			const oExtension = oContext.getExtension('WEBGL_debug_renderer_info');
			return `${oContext.getParameter(oExtension.UNMASKED_VENDOR_WEBGL)} | ${oContext.getParameter(oExtension.UNMASKED_RENDERER_WEBGL)}`;
		} catch (_) {}
	}
	function getConnectionParams() {
		const connection = navigator.connection || {};
		return {
			online: navigator.onLine,
			effectiveType: connection.effectiveType,
			downlink: connection.downlink,
			rtt: connection.rtt,
			type: connection.type,
			downlinkMax: connection.downlinkMax
		};
	}
	function getLanguages() {
		try {
			return `${navigator.language} | ${navigator.languages} | ${TW5.messages.getMessageText('J0103')}`;
		} catch (_) {}
	}
	function getDateSettings() {
		try {
			const settingsObject2 = new Intl.DateTimeFormat().resolvedOptions();
			settingsObject2.timezoneOffset = new Date().getTimezoneOffset();
			return settingsObject2;
		} catch (_) {}
	}
	function createShowAndSendReport(finishReason, sendBuffer) {
		detectCpuAndMemory(processorAndRam => {
			showAndSendReport({
				terminationReason: finishReason,
				extensionVersion3: extensionVersion,
				daredevil: navigator.userAgent,
				time2: new Date().toISOString(),
				address2: window.location.href,
				incognito: chrome.extension.inIncognitoContext,
				desync: Date.now() - performance.now() - globalExactTimeMs,
				magician: magicianModule.getState(),
				pulse: pulseModule.getReportData(),
				settingsReport: settings.getReportData(),
				statsReport: stats.getReportData(),
				languages: getLanguages(),
				dateSettings: getDateSettings(),
				connection2: getConnectionParams(),
				gpu: detectGpu(),
				cpuAndMemory: processorAndRam,
				touchPoints: navigator.maxTouchPoints,
				screen: {
					top: window.screen.top,
					left: window.screen.left,
					width: window.screen.width,
					height: window.screen.height,
					availTop: window.screen.availTop,
					availLeft: window.screen.availLeft,
					availWidth: window.screen.availWidth,
					availHeight: window.screen.availHeight,
					colorDepth: window.screen.colorDepth,
					pixelDepth: window.screen.pixelDepth,
					orientation: typeof window.screen.orientation == 'object' ? window.screen.orientation.type : void 0,
					screenX: window.screenX,
					screenY: window.screenY,
					outerWidth: window.outerWidth,
					outerHeight: window.outerHeight,
					innerWidth: window.innerWidth,
					innerHeight: window.innerHeight,
					devicePixelRatio: window.devicePixelRatio
				},
				streamToken2: _streamToken,
				adFreeStreamToken: _adFreeStreamToken,
				variantList: compactList(_variantList),
				segmentLists: _segmentListsString.map(compactList),
				logReport: log.getReportData()
			}, sendBuffer);
		});
	}
	function finishAndShowMessage(messageCode, linkCode, linkUrl) {
		if (!globalIsWorkFinished) {
			console.error(messageCode);
			finishWork(false);
			showMessage(TW5.messages.getMessageText(messageCode), linkCode, linkUrl);
		}
		throw void 0;
	}
	function finishAndSendReport(finishReason, sendBuffer) {
		if (!globalIsWorkFinished) {
			console.error(finishReason);
			finishReason = clampStringLength(String(finishReason), maxReportStringLength);
			if (finishReason.includes('out of memory')) {
				finishAndShowMessage('J0200');
			}
			try {
				player.showState('logInfo', 'Finishing work');
				globalQueue.showState();
			} catch (_) {}
			finishWork(false);
			createShowAndSendReport(finishReason, sendBuffer);
		}
		throw void 0;
	}
	function exceptionCaught(exception) {
		finishAndSendReport(convertExceptionToString(exception));
	}
	function finishAndSendFeedback() {
		try {
			finishAndSendReport('ОТПРАВИТЬ ОТЗЫВ');
		} catch (_) {}
	}
	return {
		exceptionCaught,
		finishAndShowMessage,
		finishAndSendReport,
		finishAndSendFeedback,
		saveStreamToken,
		saveVariantList,
		saveSegmentList,
		saveTransportStream,
		saveConvertedSegment
	};
})();

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

const events = (() => {
	let _handlersMap = new Map();
	function addHandler(eventName, handler) {
		assert(isNonEmptyString(eventName));
		assert(typeof handler == 'function' || isObject(handler));
		let eventHandlers = _handlersMap.get(eventName);
		if (eventHandlers === void 0) {
			eventHandlers = new Set();
			_handlersMap.set(eventName, eventHandlers);
		}
		eventHandlers.add(handler);
	}
	function removeHandler(eventName, handler) {
		assert(isNonEmptyString(eventName));
		assert(typeof handler == 'function' || isObject(handler));
		const eventHandlers = _handlersMap.get(eventName);
		if (eventHandlers !== void 0) {
			eventHandlers.delete(handler);
			if (eventHandlers.size === 0) {
				_handlersMap.delete(eventName);
			}
		}
	}
	function sendEvent(eventName, dataValue) {
		assert(isNonEmptyString(eventName));
		log.logInfo(`[Events] Event occurred: ${eventName}`);
		const eventHandlers = _handlersMap.get(eventName);
		if (eventHandlers !== void 0) {
			assert(eventHandlers.size !== 0);
			let event;
			for (let handler of eventHandlers.values()) {
				if (typeof handler == 'function') {
					handler(dataValue, eventName);
				} else {
					if (event === void 0) {
						event = {
							type: eventName,
							data: dataValue
						};
					}
					handler.handleEvent(event);
				}
			}
		}
	}
	return {
		addHandler,
		removeHandler,
		sendEvent
	};
})();

const trashModule = (() => {
	class dumpsterInMessageChannel {
		constructor() {
			this._messageChannel = null;
		}
		discard(junkValue) {
			if (isObject(junkValue)) {
				const junkBuffer = junkValue.buffer ? junkValue.buffer : junkValue;
				if (junkBuffer.byteLength) {
					log.logInfo(`[Trash] Discarding ${junkBuffer.byteLength} bytes`);
					if (this._messageChannel === null) {
						this._messageChannel = new MessageChannel();
						this._messageChannel.port2.close();
					}
					this._messageChannel.port1.postMessage(junkBuffer, [ junkBuffer ]);
				}
			}
		}
		burn() {}
	}
	class dumpsterInWorker {
		constructor() {
			this._worker = null;
			this._trashByteCount = 0;
			events.addHandler('control-state-changed', stateNumber => {
				if (stateNumber === streamEndState || stateNumber === stoppedState || stateNumber === repeatState) {
					this.burn();
				}
			});
		}
		discard(junkValue) {
			const DUMPSTER_CAPACITY = 1e7;
			if (isObject(junkValue)) {
				const junkBuffer = junkValue.buffer ? junkValue.buffer : junkValue;
				if (junkBuffer.byteLength) {
					log.logInfo(`[Trash] Discarding ${junkBuffer.byteLength} bytes`);
					if (this._worker === null) {
						this._worker = new Worker('/recycler.js');
					}
					this._trashByteCount += junkBuffer.byteLength;
					this._worker.postMessage(junkBuffer, [ junkBuffer ]);
					if (this._trashByteCount > DUMPSTER_CAPACITY) {
						this.burn();
					}
				}
			}
		}
		burn() {
			if (this._worker !== null) {
				log.logInfo(`[Trash] Disposing ${this._trashByteCount} bytes`);
				this._worker.postMessage(null);
				this._worker = null;
				this._trashByteCount = 0;
			}
		}
	}
	if (isMobileDevice()) {
		return {
			discard: placeholder,
			burn: placeholder
		};
	}
	return getBrowserEngineVersion() < 67 ? new dumpsterInWorker() : new dumpsterInMessageChannel();
})();

const magicianModule = (() => {
	let _state2 = getNewState();
	function getState() {
		return _state2;
	}
	function getNewState() {
		const isShown = !document.hidden;
		const isActive = isShown && document.hasFocus();
		return {
			isShown,
			isActive
		};
	}
	const handleEvent = wrapErrors(event => {
		log.logInfo(`[Focus] Event ${event.type}, old state ${log.O(_state2)}`);
		setTimeout(updateState);
	});
	const updateState = wrapErrors(() => {
		const nextState = getNewState();
		if (_state2.isShown !== nextState.isShown || _state2.isActive !== nextState.isActive) {
			log.logOk(`[Focus] New state ${log.O(nextState)}`);
			_state2 = nextState;
			events.sendEvent('focus-manager-state-changed', nextState);
		}
	});
	log.logInfo(`[Focus] Initial state ${log.O(_state2)}`);
	document.addEventListener('visibilitychange', handleEvent);
	window.addEventListener('focus', handleEvent);
	window.addEventListener('blur', handleEvent);
	return {
		getState
	};
})();

const pulseModule = (() => {
	const checkIntervalMs = 970;
	const MIN_TIME_DEVIATION = -30;
	const MAX_TIME_DEVIATION = 200;
	const MAX_DATE_DEVIATION = 40;
	let _maxDeviationMs = 0;
	let _timer = 0;
	let _timeMs;
	let _timestampMs;
	const assertHeartbeat = wrapErrors(() => {
		const time = performance.now();
		const dateValue2 = Date.now();
		const timeDriftMs = time - _timeMs - checkIntervalMs;
		const dateDeviation = dateValue2 - _timestampMs - (time - _timeMs);
		if (timeDriftMs < MIN_TIME_DEVIATION || timeDriftMs > MAX_TIME_DEVIATION || Math.abs(dateDeviation) > MAX_DATE_DEVIATION) {
			log.logError(`[Pulse] ${log.F0(timeDriftMs)} ${log.F0(dateDeviation)}`);
		}
		_maxDeviationMs = Math.max(_maxDeviationMs, timeDriftMs);
		_timeMs = time;
		_timestampMs = dateValue2;
		_timer = setTimeout(assertHeartbeat, checkIntervalMs);
	});
	function handleStateChange(stateNumber) {
		if (stateNumber === streamEndState || stateNumber === stoppedState || stateNumber === repeatState) {
			if (_timer !== 0) {
				log.logInfo('[Pulse] Timer stopped');
				clearTimeout(_timer);
				_timer = 0;
			}
		} else if (_timer === 0) {
			log.logInfo('[Pulse] Timer started');
			_timeMs = performance.now();
			_timestampMs = Date.now();
			_timer = setTimeout(assertHeartbeat, checkIntervalMs);
		}
	}
	function getReportData() {
		return _maxDeviationMs;
	}
	events.addHandler('control-state-changed', handleStateChange);
	return {
		getReportData
	};
})();

const stats = (() => {
	const STATS_UPDATE_FREQUENCY = 3;
	const listHistorySize = 30;
	const loadHistorySize = 30;
	const BUFFER_HISTORY_SIZE = 30;
	const AD_HISTORY_SIZE = 15;
	const HIGHLIGHT_RESPONSE_WAIT = 1;
	const HIGHLIGHT_CONVERTED = 2;
	const HIGHLIGHT_NOT_VIEWED_MIN = 1;
	const HIGHLIGHT_NOT_VIEWED_MAX = .5;
	const HIGHLIGHT_DROPPED_FRAMES = 100;
	const HIGHLIGHT_FRAME_RATE = .85;
	const HIGHLIGHT_VIDEO_LOSS_RELATIVE = 1 / 5;
	const HIGHLIGHT_VIDEO_LOSS_ABSOLUTE = 300;
	const highlightBufferExhaustion = 5;
	let _timer = 0;
	let _nTargetDuration = 0;
	let _minVideoSampleDurationMs = -Infinity;
	let _maxVideoSampleDurationMs = +Infinity;
	let _updateInterval = null;
	let _segmentsAddedInfo = null;
	let _secondsAddedInfo = null;
	let _segmentThickness = null;
	let _channelThickness = null;
	let _responseWaitState = null;
	let _unwatchedState = null;
	let _sourceSegmentCount = 0;
	let _rejectedSegmentCount = 0;
	let _totalDownloadedKb = 0;
	let _loadErrorCount = 0;
	let _skippedSegmentCount = 0;
	let _unloadedSegmentCount = 0;
	let _videoLossCount = 0;
	let _audioLossCount = 0;
	let _bufferUnderrunCount = 0;
	let _earlyBufferExhaustionCount = 0;
	let _bufferOverflowCount = 0;
	let _skippedInBufferCount = 0;
	let _adCount = 0;
	let _adStartCount = [];
	let _adEndCount = [];
	let _lastUpdateTimeMs;
	function highlightAddedSegments(count) {
		return count !== 1 && count !== 2;
	}
	function highlightResponseWait(count) {
		return count >= HIGHLIGHT_RESPONSE_WAIT;
	}
	function selectUnwatched(count) {
		return count < HIGHLIGHT_NOT_VIEWED_MIN || count >= settings.get('maxBufferSizeSetting') + settings.get('bufferStretchMs') * HIGHLIGHT_NOT_VIEWED_MAX;
	}
	class analysis {
		constructor(nodeId, historySize, precision) {
			assert(historySize > 0 && precision >= 0);
			this._tableElement = element(nodeId);
			this._historyCount = new Array(historySize);
			this._moduleSelectFlag = new Array(historySize);
			this._precision = precision;
			this._clear();
		}
		release() {
			this._tableElement.textContent = '';
			this._tableElement = null;
		}
		clear() {
			if (this._filledCount !== 0) {
				this._clear();
			}
		}
		getLastNumber(stub) {
			return this._filledCount === 0 ? stub : this._historyCount[this._index];
		}
		addNumber(count, selectionValue, averageSelectionValue) {
			const historyStart = 5;
			const shouldSelect = Boolean(typeof selectionValue == 'function' ? selectionValue(count) : selectionValue);
			if (this._filledCount !== 0) {
				this._tableElement.children[historyStart + this._index].classList.add('stats-detailed');
			}
			if (this._filledCount !== this._historyCount.length) {
				++this._filledCount;
			}
			if (++this._index === this._historyCount.length) {
				this._index = 0;
			}
			this._historyCount[this._index] = count;
			this._moduleSelectFlag[this._index] = shouldSelect;
			let minNumber = Infinity, shouldHighlightMinimal = false;
			let maxNumber = -Infinity, shouldHighlightMaximal = false;
			let averageNumber = 0, numbersCount = 0;
			for (let yMarker = 0; yMarker < this._filledCount; ++yMarker) {
				if (Number.isFinite(this._historyCount[yMarker])) {
					if (this._historyCount[yMarker] < minNumber || this._historyCount[yMarker] === minNumber && this._moduleSelectFlag[yMarker]) {
						minNumber = this._historyCount[yMarker];
						shouldHighlightMinimal = this._moduleSelectFlag[yMarker];
					}
					if (this._historyCount[yMarker] > maxNumber || this._historyCount[yMarker] === maxNumber && this._moduleSelectFlag[yMarker]) {
						maxNumber = this._historyCount[yMarker];
						shouldHighlightMaximal = this._moduleSelectFlag[yMarker];
					}
					averageNumber += this._historyCount[yMarker];
					++numbersCount;
				}
			}
			let shouldSelectAverage;
			if (numbersCount === 0) {
				averageNumber = NaN;
				shouldSelectAverage = false;
			} else {
				averageNumber /= numbersCount;
				shouldSelectAverage = Boolean(typeof averageSelectionValue == 'function' ? averageSelectionValue(averageNumber) : averageSelectionValue);
			}
			updateValue(this._tableElement.children[0], this._toString(minNumber), shouldHighlightMinimal);
			updateValue(this._tableElement.children[2], this._toString(averageNumber), shouldSelectAverage);
			updateValue(this._tableElement.children[4], this._toString(maxNumber), shouldHighlightMaximal);
			updateValue(this._tableElement.children[historyStart + this._index], this._toString(count), shouldSelect).classList.remove('stats-detailed');
			return averageNumber;
		}
		_clear() {
			this._filledCount = 0;
			this._index = -1;
			const fragmentElement = document.createDocumentFragment();
			fragmentElement.appendChild(document.createElement('td')).className = 'analysis-min';
			fragmentElement.appendChild(document.createElement('td')).textContent = ' < ';
			fragmentElement.lastChild.className = 'stats-symbol';
			fragmentElement.appendChild(document.createElement('td')).className = 'analysis-average';
			fragmentElement.appendChild(document.createElement('td')).textContent = ' < ';
			fragmentElement.lastChild.className = 'stats-symbol';
			fragmentElement.appendChild(document.createElement('td')).className = 'analysis-max';
			for (let yMarker = this._historyCount.length; --yMarker >= 0; ) {
				fragmentElement.appendChild(document.createElement('td')).className = 'analysis-history stats-detailed';
			}
			this._tableElement.textContent = '';
			this._tableElement.appendChild(fragmentElement);
		}
		_toString(count) {
			return Number.isFinite(count) ? count.toFixed(count < 100 ? this._precision : 0) : ' ';
		}
	}
	function updateValue(elementValue, value, shouldSelect) {
		const elementNode = element(elementValue);
		elementNode.classList.toggle('stats-highlight', shouldSelect);
		elementNode.textContent = value;
		return elementNode;
	}
	function getH264ProfileName(nProfileIndication, nConstraintSetFlag) {
		switch (nProfileIndication) {
		  case 66:
			return (nConstraintSetFlag & 64) == 0 ? 'Baseline' : 'Constrained Baseline';

		  case 77:
			return 'Main';

		  case 88:
			return 'Extended';

		  case 100:
			switch (nConstraintSetFlag & 12) {
			  case 8:
				return 'Progressive High';

			  case 12:
				return 'Constrained High';
			}
			return 'High';

		  case 110:
			return (nConstraintSetFlag & 16) == 0 ? 'High 10' : 'High 10 Intra';

		  case 122:
			return (nConstraintSetFlag & 16) == 0 ? 'High 4:2:2' : 'High 4:2:2 Intra';

		  case 244:
			return (nConstraintSetFlag & 16) == 0 ? 'High 4:4:4 Predictive' : 'High 4:4:4 Intra';

		  case 44:
			return 'CAVLC 4:4:4 Intra';
		}
		log.logError(`[Stats] Unknown H.264 profile ProfileIndication=${nProfileIndication} ConstraintSetFlag=${nConstraintSetFlag}`);
		return `P${nProfileIndication}C${nConstraintSetFlag}`;
	}
	function updateStats() {
		document.getElementById('stats-watch-duration').textContent = i18n.secondsToString(performance.now() / 1e3, true);
		const {droppedVideoFrames, totalVideoFrames} = player.getDroppedFrameCount();
		updateValue('stats-skipped', droppedVideoFrames, droppedVideoFrames >= HIGHLIGHT_DROPPED_FRAMES).nextElementSibling.nextElementSibling.textContent = totalVideoFrames;
		let awaitingLoadCount = 0, loadingValue = 0, convertedCount = 0, convertedValue = 0;
		for (let segment of globalQueue) {
			switch (segment.processingCount) {
			  case processingAwaitingLoad:
				awaitingLoadCount += segment.duration;
				break;

			  case processingLoading:
			  case processingLoaded:
				loadingValue += segment.duration;
				break;

			  case processingTransformed:
				convertedCount++;
				convertedValue += segment.duration;
				break;

			  default:
				assert(false);
			}
		}
		const {watchedCount, unwatchedCount} = player.getBufferFill();
		let elementRef = updateValue('stats-queue', awaitingLoadCount.toFixed(1), awaitingLoadCount > settings.get('maxBufferSizeSetting'));
		elementRef = elementRef.nextElementSibling.nextElementSibling;
		elementRef.textContent = loadingValue.toFixed(1);
		elementRef = elementRef.nextElementSibling;
		updateValue(elementRef, convertedValue.toFixed(1), convertedCount >= HIGHLIGHT_CONVERTED);
		elementRef = elementRef.nextElementSibling;
		updateValue(elementRef, unwatchedCount.toFixed(1), selectUnwatched(unwatchedCount));
		elementRef = elementRef.nextElementSibling.nextElementSibling;
		elementRef.textContent = watchedCount.toFixed(1);
	}
	function isWindowOpen() {
		return _timer !== 0;
	}
	function openWindow() {
		if (isWindowOpen()) {
			return;
		}
		_updateInterval = new analysis('stats-update-interval', listHistorySize, 1);
		_segmentsAddedInfo = new analysis('stats-segments-added', listHistorySize, 0);
		_secondsAddedInfo = new analysis('stats-seconds-added', listHistorySize, 1);
		_segmentThickness = new analysis('stats-segment-thickness', loadHistorySize, 1);
		_channelThickness = new analysis('stats-channel-thickness', loadHistorySize, 1);
		_responseWaitState = new analysis('stats-response-wait', loadHistorySize, 1);
		_unwatchedState = new analysis('stats-unwatched', BUFFER_HISTORY_SIZE, 1);
		_lastUpdateTimeMs = NaN;
		element('stats-ad-count').textContent = _adCount;
		element('stats-ad-frequency').textContent = getAdFrequency();
		element('stats-original').textContent = _sourceSegmentCount;
		updateValue('stats-rejected', _rejectedSegmentCount, _rejectedSegmentCount !== 0);
		updateValue('stats-load-errors', _loadErrorCount, _loadErrorCount !== 0);
		updateValue('stats-missed-segments', _skippedSegmentCount, _skippedSegmentCount !== 0);
		element('stats-unloaded-segments').textContent = _unloadedSegmentCount;
		updateValue('stats-video-loss', _videoLossCount, _videoLossCount !== 0);
		updateValue('stats-audio-loss', _audioLossCount, _audioLossCount !== 0);
		updateValue('stats-exhausted', _bufferUnderrunCount, _bufferUnderrunCount >= highlightBufferExhaustion);
		updateValue('stats-overflowed', _bufferOverflowCount, _bufferOverflowCount !== 0).nextElementSibling.nextElementSibling.textContent = _skippedInBufferCount.toFixed(1);
		_timer = setInterval(wrapErrors(updateStats), 1e3 / STATS_UPDATE_FREQUENCY);
		updateStats();
		events.addHandler('drag-handle-drag-stats', handleWindowDrag);
		showElement('stats', true);
		settings.set('shouldShowStats', true);
	}
	function closeWindow() {
		if (!isWindowOpen()) {
			return;
		}
		showElement('stats', false);
		_updateInterval.release();
		_updateInterval = null;
		_segmentsAddedInfo.release();
		_segmentsAddedInfo = null;
		_secondsAddedInfo.release();
		_secondsAddedInfo = null;
		_segmentThickness.release();
		_segmentThickness = null;
		_channelThickness.release();
		_channelThickness = null;
		_responseWaitState.release();
		_responseWaitState = null;
		_unwatchedState.release();
		_unwatchedState = null;
		for (let elementRef of document.querySelectorAll('[data-clear]')) {
			elementRef.textContent = '';
		}
		clearInterval(_timer);
		_timer = 0;
		settings.set('shouldShowStats', false);
	}
	function handleWindowDrag(params) {
		switch (params.step) {
		  case 1:
			const style = getComputedStyle(params.draggedElement);
			params._initialX = Number.parseInt(style.left, 10);
			params._initialY = Number.parseInt(style.top, 10);
			break;

		  case 2:
			params.draggedElement.style.setProperty('--x', `${params._initialX + params.deltaX}px`);
			params.draggedElement.style.setProperty('--y', `${params._initialY + params.deltaY}px`);
			break;

		  case 3:
			break;

		  default:
			assert(false);
		}
	}
	function start() {
		if (settings.get('shouldShowStats')) {
			openWindow();
		}
	}
	function clearHistory() {
		if (_updateInterval !== null) {
			_updateInterval.clear();
			_segmentsAddedInfo.clear();
			_secondsAddedInfo.clear();
			_segmentThickness.clear();
			_channelThickness.clear();
			_responseWaitState.clear();
			_unwatchedState.clear();
			_lastUpdateTimeMs = NaN;
		}
		updateValue('stats-load-errors', _loadErrorCount = 0, false);
		updateValue('stats-missed-segments', _skippedSegmentCount = 0, false);
		element('stats-unloaded-segments').textContent = _unloadedSegmentCount = 0;
		updateValue('stats-exhausted', _bufferUnderrunCount = 0, false);
		updateValue('stats-overflowed', _bufferOverflowCount = 0, false).nextElementSibling.nextElementSibling.textContent = (_skippedInBufferCount = 0).toFixed(1);
	}
	function getTargetDuration() {
		return _nTargetDuration;
	}
	function getFrameDurationSeconds() {
		return {
			min: Math.max(17, _minVideoSampleDurationMs) / 1e3,
			max: Math.min(1e3 / 25, _maxVideoSampleDurationMs) / 1e3
		};
	}
	function getReportData() {
		return {
			videoParams: element('stats-video-resolution').textContent + ' ' + element('stats-video-compression').textContent,
			audioParams: element('stats-audio-compression').textContent,
			rejectedSegments: _rejectedSegmentCount,
			skippedSegments: _skippedSegmentCount,
			loadErrors: _loadErrorCount,
			unloadedSegments: _unloadedSegmentCount,
			videoLoss: _videoLossCount,
			audioLoss: _audioLossCount,
			bufferExhaustions: _bufferUnderrunCount,
			earlyBufferExhaustions: _earlyBufferExhaustionCount,
			bufferOverflows: _bufferOverflowCount,
			skippedInBuffer: _skippedInBufferCount,
			ad: `${_adCount} ${getAdFrequency()}`
		};
	}
	function segmentListParsed(list) {
		_nTargetDuration = list.nTargetDuration;
		if (isWindowOpen()) {
			if (list.segments.length !== 0) {
				element('stats-server').textContent = new URL(list.segments[list.segments.length - 1].address).host;
			}
			const listDurationMs = list.segments.reduce((sum, {duration}) => sum + duration, 0);
			element('stats-list').textContent = `${list.segments.length} × ${(listDurationMs / list.segments.length).toFixed(1)} = ${listDurationMs.toFixed(1)} − ${list.adSegmentCount}`;
			element('stats-target-duration').textContent = list.nTargetDuration;
		}
	}
	function segmentsQueued(segmentsAddedCount, secondsAddedCount) {
		if (isWindowOpen()) {
			const time = performance.now();
			_updateInterval.addNumber((time - _lastUpdateTimeMs) / 1e3);
			_lastUpdateTimeMs = time;
			_segmentsAddedInfo.addNumber(segmentsAddedCount, highlightAddedSegments, highlightAddedSegments);
			_secondsAddedInfo.addNumber(secondsAddedCount);
		}
	}
	function originalSegmentReceived() {
		++_sourceSegmentCount;
		if (isWindowOpen()) {
			document.getElementById('stats-original').textContent = _sourceSegmentCount;
		}
	}
	function segmentRejected() {
		++_rejectedSegmentCount;
		if (isWindowOpen()) {
			updateValue('stats-rejected', _rejectedSegmentCount, true);
		}
	}
	function someDataDownloaded(downloadedKb) {
		if (Number.isFinite(downloadedKb)) {
			_totalDownloadedKb += downloadedKb;
			if (isWindowOpen()) {
				document.getElementById('stats-downloaded').textContent = (_totalDownloadedKb / 1024 / 1024).toFixed();
			}
		}
	}
	function segmentLoaded(segmentSize, segmentDuration, loadDurationMs, responseWait) {
		if (isWindowOpen()) {
			const averageSegmentThickness = _segmentThickness.addNumber(segmentSize * 8 / 1e6 / segmentDuration);
			loadDurationMs /= 1e3;
			_channelThickness.addNumber(segmentSize * 8 / 1e6 / loadDurationMs, loadDurationMs > segmentDuration, count => count < averageSegmentThickness);
			_responseWaitState.addNumber(responseWait / 1e3, highlightResponseWait, highlightResponseWait);
		}
	}
	function segmentsNotLoaded(unloadedSegmentCount) {
		assert(unloadedSegmentCount > 0);
		_loadErrorCount++;
		_unloadedSegmentCount += unloadedSegmentCount;
		if (isWindowOpen()) {
			updateValue('stats-load-errors', _loadErrorCount, true);
			element('stats-unloaded-segments').textContent = _unloadedSegmentCount;
		}
	}
	function segmentsSkipped(skippedSegmentCount) {
		assert(skippedSegmentCount > 0);
		_skippedSegmentCount++;
		_unloadedSegmentCount += skippedSegmentCount;
		if (isWindowOpen()) {
			updateValue('stats-missed-segments', _skippedSegmentCount, true);
			element('stats-unloaded-segments').textContent = _unloadedSegmentCount;
		}
	}
	function convertedSegmentReceived(segment) {
		const isWindowOpen2 = isWindowOpen();
		const data = segment.dataValue;
		if (data.hasOwnProperty('mediaSegmentData')) {
			if (segment.isGap) {
				if (data.hasVideo) {
					let videoCompression = 'H.264' + ` ${getH264ProfileName(data.nProfileIndication, data.nConstraintSetFlag)}` + ` L${(data.nLevelIndication / 10).toFixed(1)}` + ` RF${data.nMaxNumberReferenceFrames}`;
					if (data.range !== -1) {
						videoCompression += data.range === 0 ? ' 16-235' : ' 0-255';
					}
					if (data.isInterlaced) {
						videoCompression += ' interlaced';
					}
					if (data.frameRate !== 0) {
						videoCompression += ` ${data.frameRate < 0 ? '≈' : ''}${Math.abs(data.frameRate).toFixed(2)} ${TW5.messages.getMessageText('J0140')}`;
					}
					element('stats-video-compression').textContent = videoCompression;
					element('stats-video-resolution').textContent = `${data.чШиринаКартинки}x${data.чВысотаКартинки}`;
				} else {
					element('stats-video-compression').textContent = '—';
					element('stats-video-resolution').textContent = '—';
				}
				element('stats-frame-rate').textContent = '';
				if (data.hasAudio) {
					element('stats-audio-compression').textContent = [ 'AAC-Main', 'AAC-LC', 'AAC-SSR', 'AAC-LTP' ][data.nAudioObjectType - 1] + ` ${data.чЧастотаДискретизации} ${TW5.messages.getMessageText('J0141')}` + ` ${data.чКоличествоКаналов} ${TW5.messages.getMessageText('J0142')}`;
				} else {
					element('stats-audio-compression').textContent = '—';
				}
				element('stats-audio-bitrate').textContent = '';
			}
			if (Number.isFinite(data.avgVideoSampleDuration)) {
				_minVideoSampleDurationMs = data.minVideoSampleDuration;
				_maxVideoSampleDurationMs = data.maxVideoSampleDurationMs;
				assert(_minVideoSampleDurationMs <= _maxVideoSampleDurationMs);
				const relativeDeviation = data.avgVideoSampleDuration / data.maxVideoSampleDurationMs;
				const absoluteDeviation = data.maxVideoSampleDurationMs - data.avgVideoSampleDuration;
				if (relativeDeviation <= HIGHLIGHT_VIDEO_LOSS_RELATIVE && absoluteDeviation >= HIGHLIGHT_VIDEO_LOSS_ABSOLUTE) {
					log.logError(`[Stats] Frame duration deviation exceeded in segment ${segment.number}` + ` AvgFrameDuration=${log.F0(data.avgVideoSampleDuration)}ms` + ` AbsoluteDeviation=${log.F0(absoluteDeviation)}ms` + ` RelativeDeviation=${log.F2(relativeDeviation)}`);
					data.hasVideoLoss = true;
				}
				if (isWindowOpen2) {
					let deviationText = `@${(1e3 / data.avgVideoSampleDuration).toFixed(1)}`;
					if (data.maxVideoSampleDurationMs - data.minVideoSampleDuration > 2) {
						deviationText += ` −${(100 - data.avgVideoSampleDuration / data.maxVideoSampleDurationMs * 100).toFixed()}%` + ` +${(data.avgVideoSampleDuration / data.minVideoSampleDuration * 100 - 100).toFixed()}%`;
					}
					updateValue('stats-frame-rate', deviationText, relativeDeviation <= HIGHLIGHT_FRAME_RATE);
				}
			}
			if (Number.isFinite(data.audioBitrate) && isWindowOpen2) {
				element('stats-audio-bitrate').textContent = `${data.audioBitrate.toFixed()} ${TW5.messages.getMessageText('J0143')}`;
			}
		}
		if (thisNumber(data.conversionTime) && isWindowOpen2) {
			element('stats-converted-in').textContent = data.conversionTime.toFixed();
		}
		if (data.isRejected) {
			segmentRejected();
		}
		if (data.hasVideoLoss) {
			++_videoLossCount;
			if (isWindowOpen2) {
				updateValue('stats-video-loss', _videoLossCount, true);
			}
		}
		if (data.hasAudioLoss) {
			++_audioLossCount;
			if (isWindowOpen2) {
				updateValue('stats-audio-loss', _audioLossCount, true);
			}
		}
	}
	function updateBufferFullness(unwatchedCount) {
		if (isWindowOpen()) {
			_unwatchedState.addNumber(unwatchedCount, selectUnwatched, selectUnwatched);
		}
	}
	function playerBufferExhausted(isEarly) {
		++_bufferUnderrunCount;
		if (isEarly) {
			++_earlyBufferExhaustionCount;
		}
		if (isWindowOpen()) {
			updateValue('stats-exhausted', _bufferUnderrunCount, _bufferUnderrunCount >= highlightBufferExhaustion);
		}
	}
	function getAdFrequency() {
		let resultText = '';
		for (let yMarker = 0; yMarker < _adStartCount.length; ++yMarker) {
			if (yMarker !== 0) {
				resultText += ` <${((_adStartCount[yMarker] - _adEndCount[yMarker - 1]) / 1e3).toFixed()}> `;
			}
			if (yMarker < _adEndCount.length) {
				resultText += ((_adEndCount[yMarker] - _adStartCount[yMarker]) / 1e3).toFixed();
			} else {
				resultText += '?';
			}
		}
		return resultText;
	}
	events.addHandler('list-ad-start', () => {
		assert(_adStartCount.length === _adEndCount.length);
		_adCount++;
		_adStartCount.push(performance.now());
		if (isWindowOpen()) {
			element('stats-ad-count').textContent = _adCount;
			element('stats-ad-frequency').textContent = getAdFrequency();
		}
	});
	events.addHandler('list-ad-end', () => {
		if (_adStartCount.length !== _adEndCount.length) {
			if (_adEndCount.length === AD_HISTORY_SIZE) {
				_adStartCount.shift();
				_adEndCount.shift();
			}
			_adEndCount.push(performance.now());
			if (isWindowOpen()) {
				element('stats-ad-frequency').textContent = getAdFrequency();
			}
		}
	});
	events.addHandler('player-buffer-overflow', skipped => {
		++_bufferOverflowCount;
		_skippedInBufferCount += skipped;
		if (isWindowOpen()) {
			updateValue('stats-overflowed', _bufferOverflowCount, true).nextElementSibling.nextElementSibling.textContent = _skippedInBufferCount.toFixed(1);
		}
	});
	events.addHandler('control-state-changed', stateNumber => {
		if (stateNumber === launchState) {
			clearHistory();
		}
	});
	events.addHandler('stream-variant-selected', ([options]) => {
		if (options) {
			clearHistory();
		}
	});
	return {
		start,
		isWindowOpen,
		openWindow,
		closeWindow,
		updateValue,
		clearHistory,
		getTargetDuration,
		getFrameDurationSeconds,
		getReportData,
		segmentListParsed,
		segmentsQueued,
		originalSegmentReceived,
		segmentRejected,
		someDataDownloaded,
		segmentLoaded,
		segmentsNotLoaded,
		segmentsSkipped,
		convertedSegmentReceived,
		updateBufferFullness,
		playerBufferExhausted
	};
})();

const windowModule = (() => {
	function getOpenState() {
		return document.body.getAttribute('data-window-opened') || '';
	}
	function openWindow2(windowId) {
		const windowElement = element(windowId);
		assert(windowElement.classList.contains('window'));
		windowElement.classList.add('window-open', 'window-animation');
		document.body.setAttribute('data-window-opened', windowId);
		events.sendEvent(`window-opened-${windowId}`);
	}
	function closePlayerWindow(windowId, isAnimated = true) {
		const windowElement = element(windowId);
		assert(windowElement.classList.contains('window'));
		windowElement.classList.remove('window-open');
		windowElement.classList.toggle('window-animation', isAnimated);
		document.body.removeAttribute('data-window-opened');
	}
	function open(windowId) {
		assert(isNonEmptyString(windowId));
		const openWindowId = getOpenState();
		if (windowId === openWindowId) {
			return false;
		}
		if (openWindowId) {
			closePlayerWindow(openWindowId);
		}
		openWindow2(windowId);
		return true;
	}
	function close(isAnimated = true) {
		const openWindowId = getOpenState();
		if (openWindowId) {
			closePlayerWindow(openWindowId, isAnimated);
		}
	}
	function toggle(windowId) {
		open(windowId) || closePlayerWindow(windowId);
	}
	function setupScrollIndicator(scroll) {
		const scrollElement = element(scroll);
		scrollElement.scrollTop = 0;
		updateScrollIndicator(scrollElement);
	}
	function updateScrollIndicator(scrollElement) {
		const shouldShow = !isElementFullyScrolled(scrollElement);
		showElement(element(`scroll-indicator-${scrollElement.id}`), shouldShow);
		scrollElement[shouldShow ? 'addEventListener' : 'removeEventListener']('scroll', handleScroll);
	}
	const handleScroll = wrapErrors(event => {
		updateScrollIndicator(event.target);
	});
	events.addHandler('control-left-click', ({target: clickElement}) => {
		const windowId = clickElement.getAttribute('data-window-toggle');
		if (windowId) {
			toggle(windowId);
			return;
		}
		const openWindowId = getOpenState();
		if (openWindowId && !element(openWindowId).contains(clickElement) && element('player').contains(clickElement)) {
			closePlayerWindow(openWindowId);
		}
	});
	return {
		open,
		close,
		toggle,
		setupScrollIndicator
	};
})();

const menu = (() => {
	function setItemAvailability(item, isAvailable) {
		element(item).tabIndex = isAvailable ? 0 : -1;
	}
	element('eye').addEventListener('contextmenu', event => {
		event.preventDefault();
		windowModule.toggle('main-menu');
	});
	events.addHandler('control-left-click', event => {
		if (event.target.classList.contains('menu-item')) {
			windowModule.close(false);
		}
	});
	return {
		setItemAvailability
	};
})();

const fullscreenMode = (() => {
	let _sRequestFullscreen = 'requestFullscreen';
	let _sExitFullscreen = 'exitFullscreen';
	let _sFullscreenElement = 'fullscreenElement';
	let _sFullscreenchange = 'fullscreenchange';
	if (!document.exitFullscreen) {
		_sRequestFullscreen = 'webkitRequestFullscreen';
		_sExitFullscreen = 'webkitExitFullscreen';
		_sFullscreenElement = 'webkitFullscreenElement';
		_sFullscreenchange = 'webkitfullscreenchange';
	}
	const handleModeChange2 = wrapErrors(() => {
		events.sendEvent('fullscreen-mode-changed', update());
	});
	const handleDoubleClick = wrapErrors(event => {
		if (event.button === leftButton) {
			event.preventDefault();
			toggle2();
		}
	});
	function getElement() {
		return element('player-and-chat');
	}
	function isEnabled2() {
		return !!document[_sFullscreenElement];
	}
	function update() {
		const isEnabled = isEnabled2();
		log.logOk(`[Fullscreen] Mode enabled: ${isEnabled}`);
		updateButton('toggle-fullscreen', isEnabled);
		return isEnabled;
	}
	function enable() {
		if (isEnabled2()) {
			return false;
		}
		log.logInfo('[Fullscreen] Enabling mode');
		autoHide.hide(false);
		pictureInPictureModule.disableControl();
		getElement()[_sRequestFullscreen]();
		return true;
	}
	function disable() {
		if (!isEnabled2()) {
			return false;
		}
		log.logInfo('[Fullscreen] Disabling mode');
		autoHide.hide(false);
		document[_sExitFullscreen]();
		return true;
	}
	function toggle2() {
		enable() || disable();
	}
	document.addEventListener(_sFullscreenchange, handleModeChange2);
	element('eye').addEventListener('dblclick', handleDoubleClick);
	update();
	return {
		isEnabled2,
		disable,
		toggle2,
		getElement
	};
})();

const pictureInPictureModule = (() => {
	let _oMediaElement = null;
	const handleModeChange = wrapErrors(() => {
		refresh();
	});
	function isTurnedOn() {
		return Boolean(document.pictureInPictureElement);
	}
	function refresh() {
		const isEnabled = isTurnedOn();
		log.logOk(`[PictureInPicture] Mode enabled: ${isEnabled}`);
		updateButton('toggle-picture-in-picture', isEnabled);
	}
	function turnOn() {
		if (isTurnedOn()) {
			return false;
		}
		log.logInfo('[PictureInPicture] Enabling mode');
		fullscreenMode.disable();
		_oMediaElement.requestPictureInPicture();
		return true;
	}
	function disableControl() {
		if (!isTurnedOn()) {
			return false;
		}
		log.logInfo('[PictureInPicture] Disabling mode');
		document.exitPictureInPicture();
		return true;
	}
	function toggle() {
		_oMediaElement && !document.body.classList.contains('no-video') && (turnOn() || disableControl());
	}
	function startInternal(oMediaElement) {
		if (!document.pictureInPictureEnabled || oMediaElement.disablePictureInPicture) {
			log.logError(`[PictureInPicture] pictureInPictureEnabled=${document.pictureInPictureEnabled} disablePictureInPicture=${oMediaElement.disablePictureInPicture}`);
			return;
		}
		_oMediaElement = oMediaElement;
		oMediaElement.addEventListener('enterpictureinpicture', handleModeChange);
		oMediaElement.addEventListener('leavepictureinpicture', handleModeChange);
		refresh();
		showElement('toggle-picture-in-picture', true);
	}
	return {
		startInternal,
		disableControl,
		toggle
	};
})();

const draggerModule = (() => {
	const MIN_DRAG_INTERVAL = 45;
	let _pointerId = NaN;
	let _params = null;
	let _lastDragTimeMs;
	let _initialX, _initialY;
	let _lastX, _lastY;
	function params3(pressedElement, draggedElement) {
		this.pressedElement = pressedElement;
		this.draggedElement = draggedElement;
		this.step = 1;
		this.isCancelled2 = false;
		this.hasXChanged = false;
		this.hasYChanged = false;
		this.deltaX = 0;
		this.deltaY = 0;
	}
	const handlePointerDown = createElementEventHandler(event => {
		if (!Number.isNaN(_pointerId) || event.button !== leftButton) {
			return;
		}
		const pressedElement = event.target.closest('[data-drag-handle]');
		if (pressedElement === null) {
			return;
		}
		_pointerId = event.pointerId;
		_params = new params3(pressedElement, element(pressedElement.getAttribute('data-drag-handle')));
		_lastDragTimeMs = 0;
		_initialX = _lastX = event.clientX;
		_initialY = _lastY = event.clientY;
		log.logOk(`[Drag] Starting drag of ${_params.draggedElement.id} X=${_initialX} Y=${_initialY} id=${_pointerId} type=${event.pointerType} primary=${event.isPrimary}`);
		document.addEventListener('pointermove', handlePointerMove, passiveHandler);
		document.addEventListener('pointerup', handlePointerUpAndCancel, passiveHandler);
		document.addEventListener('pointercancel', handlePointerUpAndCancel);
		events.addHandler('focus-manager-state-changed', handleTabLeave);
		fullscreenMode.getElement().style.setProperty('cursor', getComputedStyle(pressedElement).cursor, 'important');
		fullscreenMode.getElement().classList.add('drag-handle-intercept');
		_params.draggedElement.classList.add('drag-handle');
		events.sendEvent(`drag-handle-dragging-${_params.draggedElement.id}`, _params);
	});
	const handlePointerMove = wrapErrors(event => {
		if (_pointerId === event.pointerId) {
			if ((event.buttons & leftButtonPressed) == 0) {
				endDrag('button released');
			} else {
				const time = performance.now();
				if (time - _lastDragTimeMs >= MIN_DRAG_INTERVAL) {
					_lastDragTimeMs = time;
					_params.hasXChanged = _lastX !== event.clientX;
					_params.hasYChanged = _lastY !== event.clientY;
					if (_params.hasXChanged || _params.hasYChanged) {
						_lastX = event.clientX;
						_lastY = event.clientY;
						_params.step = 2;
						_params.deltaX = _lastX - _initialX;
						_params.deltaY = _lastY - _initialY;
						events.sendEvent(`drag-handle-dragging-${_params.draggedElement.id}`, _params);
					}
				}
			}
		}
	});
	const handlePointerUpAndCancel = wrapErrors(event => {
		if (_pointerId === event.pointerId) {
			endDrag(event.type);
		}
	});
	function handleTabLeave({isActive}) {
		if (!isActive) {
			endDrag('tab inactive');
		}
	}
	function cancelDrag(nodeId) {
		assert(nodeId === void 0 || isNonEmptyString(nodeId));
		if (!Number.isNaN(_pointerId) && (nodeId === void 0 || nodeId === _params.draggedElement.id)) {
			_params.isCancelled2 = true;
			endDrag('operation cancelled');
		}
	}
	function endDrag(reasonText) {
		if (_params.step !== 3) {
			log.logOk(`[Drag] Ending drag: ${reasonText} X=${_lastX} Y=${_lastY}`);
			_params.step = 3;
			events.sendEvent(`drag-handle-dragging-${_params.draggedElement.id}`, _params);
			fullscreenMode.getElement().style.removeProperty('cursor');
			fullscreenMode.getElement().classList.remove('drag-handle-intercept');
			_params.draggedElement.classList.remove('drag-handle');
			document.removeEventListener('pointermove', handlePointerMove, passiveHandler);
			document.removeEventListener('pointerup', handlePointerUpAndCancel, passiveHandler);
			document.removeEventListener('pointercancel', handlePointerUpAndCancel);
			events.removeHandler('focus-manager-state-changed', handleTabLeave);
			_pointerId = NaN;
			_params = null;
		}
	}
	document.addEventListener('pointerdown', handlePointerDown, passiveHandler);
	return {
		cancelDrag
	};
})();

const autoHide = (() => {
	const MIN_MOVE_INTERVAL = 150;
	const movementThreshold = 3;
	const _autoHideElement = document.getElementById('player');
	let _timer = 0;
	let _hideAfterMs = 0;
	let _hideUntilMs = 0;
	let _screenX = 0, _screenY = 0;
	let _clientX = 0, _clientY = 0;
	let _speedSelectTimerId = 0;
	function show() {
		if (_timer === 0) {
			document.body.classList.remove('auto-hide');
			document.body.classList.add('panel-animation');
			_timer = setTimeout(handleTimer, settings.get('autoHideInterval') * 1e3);
			_hideAfterMs = _hideUntilMs = 0;
		} else {
			_hideAfterMs = performance.now() + settings.get('autoHideInterval') * 1e3;
		}
	}
	function hide(isAnimated = true) {
		if (_timer !== 0) {
			clearTimeout(_timer);
			_timer = 0;
			document.body.classList.add('auto-hide');
		}
		document.body.classList.toggle('panel-animation', isAnimated);
		if (!isAnimated) {
			document.body.clientTop;
			document.body.classList.add('panel-animation');
			_hideUntilMs = performance.now() + 500;
		}
	}
	const handleTimer = wrapErrors(() => {
		assert(_timer !== 0);
		const hideAfterMs = _hideAfterMs - performance.now();
		if (hideAfterMs > 50) {
			_timer = setTimeout(handleTimer, hideAfterMs);
			_hideAfterMs = 0;
		} else {
			hide();
		}
	});
	const handlePointerMovement = wrapErrors(({screenX, screenY, clientX, clientY}) => {
		_autoHideElement.removeEventListener('pointermove', handlePointerMovement, passiveHandler);
		setTimeout(interceptPointerMovement, MIN_MOVE_INTERVAL);
		if ((_screenX !== screenX || _screenY !== screenY) && (_clientX !== clientX || _clientY !== clientY) && (Math.abs(_clientX - clientX) >= movementThreshold || Math.abs(_clientY - clientY) >= movementThreshold) && performance.now() >= _hideUntilMs) {
			show();
		}
		_screenX = screenX;
		_screenY = screenY;
		_clientX = clientX;
		_clientY = clientY;
	});
	const interceptPointerMovement = wrapErrors(() => {
		_autoHideElement.addEventListener('pointermove', handlePointerMovement, passiveHandler);
	});
	const handleClickInternal = wrapErrors(() => {
		show();
	});
	const handlePointerLeave = wrapErrors(() => {
		hide();
	});
	const handleSpeedSelect = wrapErrors(event => {
		if (event.button === leftButton) {
			if (_speedSelectTimerId !== 0) {
				clearTimeout(_speedSelectTimerId);
			}
			_speedSelectTimerId = setTimeout(() => document.body.classList.remove('speed-select'), 5e3);
			document.body.classList.add('speed-select');
		}
	});
	function start() {
		interceptPointerMovement();
		_autoHideElement.addEventListener('click', handleClickInternal);
		_autoHideElement.addEventListener('mouseleave', handlePointerLeave);
		element('speed').addEventListener('pointerdown', handleSpeedSelect);
	}
	return {
		start,
		show,
		hide
	};
})();

const mediaQuery = (() => {
	let _timer = -2;
	const refresh = wrapErrors(() => {
		assert(_timer !== 0);
		_timer = 0;
		const playerElement = element('player');
		const playerHeightPx = playerElement.clientHeight * 100 / settings.get('uiSize');
		assert(playerHeightPx > 0);
		playerElement.classList.toggle('collapse-main-menu', playerHeightPx <= 460);
		playerElement.classList.toggle('collapse-settings', playerHeightPx <= 412);
		const FONT_SIZE_MIN = 100;
		const FONT_SIZE_MAX = 124;
		const FONT_SIZE_STEP = 8;
		const panelStyle = element('top-panel').style;
		const fillerElement = element('placeholder');
		for (let fontSize = FONT_SIZE_MAX; ;fontSize -= FONT_SIZE_STEP) {
			panelStyle.fontSize = `${fontSize}%`;
			if (fontSize === FONT_SIZE_MIN || fillerElement.clientWidth > 0) {
				break;
			}
		}
	});
	function refreshFast() {
		if (_timer !== -1) {
			if (_timer > 0) {
				clearTimeout(_timer);
			}
			_timer = -1;
			requestAnimationFrame(refresh);
		}
	}
	function updateSlowly() {
		if (_timer === -2 || _timer === 0) {
			_timer = setTimeout(refresh, 200);
			assert(_timer > 0);
		}
	}
	window.addEventListener('resize', wrapErrors(() => {
		if (_timer !== -2) {
			updateSlowly();
		}
	}));
	return {
		refreshFast,
		updateSlowly
	};
})();

const themeModule = (() => {
	const colorButtonSelector = 'input[type="color"]';
	const colorSettingNames = new Map([
		[ 'background-color', 'backgroundColor' ],
		[ 'gradient-color', 'gradientColor' ],
		[ 'button-color', 'buttonColor' ],
		[ 'header-color', 'titleColor' ],
		[ 'selection-color', 'selectionColor' ]
	]);
	function getColorSettingName(buttonElement) {
		const name = colorSettingNames.get(buttonElement.id);
		assert(name);
		return name;
	}
	let _opacityInfo = null;
	const handleColorInput = wrapErrors(event => {
		if (event.target.matches(colorButtonSelector)) {
			updateStyles();
		}
	});
	const handleColorChange = wrapErrors(event => {
		if (event.target.matches(colorButtonSelector)) {
			settings.set(getColorSettingName(event.target), event.target.value);
		}
	});
	function handleThemePresetChange() {
		updateSettingsWindow();
		updateStyles();
	}
	function updateSettingsWindow() {
		for (let buttonElement of document.querySelectorAll(colorButtonSelector)) {
			buttonElement.value = settings.get(getColorSettingName(buttonElement));
		}
		_opacityInfo.update();
	}
	function updateStyles() {
		const style = document.documentElement.style;
		for (let buttonElement of document.querySelectorAll(colorButtonSelector)) {
			style.setProperty(`--${buttonElement.id}`, Number.parseInt(buttonElement.value.slice(1, 3), 16) + ',' + Number.parseInt(buttonElement.value.slice(3, 5), 16) + ',' + Number.parseInt(buttonElement.value.slice(5, 7), 16));
		}
		const opacity = round(1 - settings.get('opacityValue') / 100, 2);
		style.setProperty('--opacity', opacity);
		style.setProperty('--window-opacity', limit(opacity, .85, 1));
	}
	function applyUiSize() {
		document.documentElement.style.fontSize = `${16 * settings.get('uiSize') / 100}px`;
		mediaQuery.updateSlowly();
	}
	function start() {
		i18n.TranslateDocument(document);
		_opacityInfo = new numberInput('opacityValue', 5, 0, 'transparency');
		_opacityInfo.afterChange = updateStyles;
		document.addEventListener('input', handleColorInput);
		document.addEventListener('change', handleColorChange);
		events.addHandler('settings-appearance-preset-changed', handleThemePresetChange);
		handleThemePresetChange();
		new numberInput('uiSize', 1, 0, 'interface-size').afterChange = applyUiSize;
		applyUiSize();
		showElement(document.body, true);
	}
	return {
		start
	};
})();

const notification = (() => {
	const SHOW_NOTIFICATION = 2e3;
	let _timer = 0;
	function show(badgeId, isAnnoying) {
		assert(document.getElementById(badgeId) && typeof isAnnoying == 'boolean');
		const notificationElement = element('notification');
		notificationElement.classList.toggle('butt', isAnnoying);
		showElement(notificationElement, true);
		notificationElement.firstElementChild.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${badgeId}`);
		if (_timer !== 0) {
			clearTimeout(_timer);
		}
		_timer = setTimeout(hideNotification, SHOW_NOTIFICATION);
	}
	function showHappiness() {
		show('svg-success', false);
	}
	function showButt() {
		show('svg-fail', true);
	}
	const hideNotification = wrapErrors(() => {
		showElement('notification', false);
		_timer = 0;
	});
	return {
		show,
		showHappiness,
		showButt
	};
})();

const scale = (() => {
	let _startTime = 0;
	let _endPosition = 0;
	let _watchedCount;
	function clampTime(time) {
		return limit(time, _startTime, _endPosition);
	}
	function update() {
		assert(Number.isFinite(_startTime) && Number.isFinite(_endPosition) && Number.isFinite(_watchedCount));
		element('scale-watched').style.transform = `scaleX(${((_watchedCount - _startTime) / (_endPosition - _startTime)).toFixed(4)})`;
	}
	const handleClick = wrapErrors(event => {
		if (control.getState() !== repeatState) {
			return;
		}
		const borderObject = event.currentTarget.getBoundingClientRect();
		const style = getComputedStyle(event.currentTarget);
		const scaleStart = Math.round(borderObject.left + Number.parseFloat(style.paddingLeft));
		const scaleEnd = Math.round(borderObject.right - Number.parseFloat(style.paddingRight));
		const pointer = event.clientX + 1;
		const seekToTime = clampTime((pointer - scaleStart) / (scaleEnd - scaleStart) * (_endPosition - _startTime) + _startTime);
		log.logOk(`[Timeline] Seeking to ${seekToTime}`);
		player.seekReplayBack(seekToTime);
	});
	function setStartAndEnd(startTime, endTime) {
		assert(startTime <= endTime);
		_startTime = startTime;
		_endPosition = endTime;
		document.getElementById('scale').addEventListener('click', handleClick);
	}
	function setWatched(watchedCount) {
		_watchedCount = clampTime(watchedCount);
		update();
	}
	function getStart() {
		return _startTime;
	}
	function getEnd() {
		return _endPosition;
	}
	return {
		setStartAndEnd,
		setWatched,
		getStart,
		getEnd
	};
})();

const newsModule = (() => {
	const showOnce = '2000.1.1';
	const alwaysShow = '2000.2.2';
	const fullHelp = '2000.3.3';
	const forTablet = '2000.4.4';
	const _newsModule = [ [ '2025.5.28', 'J1010', 'F1078' ], [ '2024.6.14', 'J1010', 'F1077' ], [ '2024.6.5', 'J1010', 'F1076' ], [ '2024.6.5', 'J1010', 'F1074' ], [ '2024.5.31', 'F1072', 'F1073' ], [ '2022.1.20', 'J1513', 'F1515' ], [ '2021.12.17', 'J1066', 'F1070', 'F1514' ], [ '2021.12.17', 'J1010', 'F1069' ], [ '2021.3.7', 'J1010', 'F1068' ], [ '2020.10.30', 'J1066', 'F1067' ], [ '2020.10.5', 'J1010', 'F1065' ], [ '2019.10.9', 'J1010', 'F1064' ], [ '2019.3.17', 'J1010', 'F1063' ], [ '2018.10.28', 'J1010', 'F1062' ], [ '2018.8.17', 'J1010', 'F1060' ], [ '2018.7.30', 'J1010', 'F1059' ], [ '2018.6.27', 'J1010', 'F1058' ], [ '2018.6.12', 'J1010', 'F1057' ], [ '2018.5.18', 'J1010', 'F1049' ], [ '2018.4.24', 'J1036', 'F1048' ], [ '2018.4.6', 'J1010', 'F1047' ], [ '2018.3.17', 'J1010', 'F1046' ], [ '2018.3.4', 'J1041', 'F1042' ], [ '2018.2.17', 'J1010', 'F1044' ], [ '2018.1.7', 'J1010', 'F1043' ], [ '2017.11.6', 'J1010', 'F1037', 'F1038' ], [ '2017.10.22', 'J1010', 'F1023' ], [ '2017.10.14', 'J1010', 'F1020' ], [ '2017.9.11', 'J1010', 'F1018' ], [ '2017.8.8', 'J1035', 'F1017' ], [ '2017.6.23', 'J1010', 'F1014' ], [ '2017.5.29', 'J1010', 'F1013' ], [ '2017.3.31', 'J1031', 'F1012' ], [ '2017.2.26', 'J1030', 'F1011' ], [ fullHelp, 'J1500', 'F1501', 'F1503', 'F1502', 'F1575', 'F1509', 'F1573', 'F1574', 'F1504', 'F1514', 'F1507' ], [ fullHelp, 'J1513', 'F1570', 'F1571', 'F1572', 'F1515', 'F1511', 'F1506', 'F1510' ], [ showOnce, 'J1054', 'F1501' ], [ forTablet, 'J1055', 'F1056' ], [ alwaysShow, 'J1003', 'F1000' ] ];
	function convertVersionToMilliseconds(versionName) {
		const partCount = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(versionName);
		partCount[1] |= 0;
		partCount[2] |= 0;
		partCount[3] |= 0;
		partCount[4] |= 0;
		return Date.UTC(partCount[1], partCount[2] - 1, partCount[3], 0, 0, 0, partCount[4]);
	}
	function hasNewsWithNewerVersion(versionName) {
		const versionNumber = convertVersionToMilliseconds(versionName);
		return _newsModule.some(news => convertVersionToMilliseconds(news[0]) > versionNumber);
	}
	function addNews(versionsOlderToAddCount, helpVersionToAdd) {
		assert(typeof versionsOlderToAddCount == 'number' && versionsOlderToAddCount >= 0);
		assert(helpVersionToAdd === '' || helpVersionToAdd.startsWith('2000'));
		assert(Number.isFinite(versionsOlderToAddCount) || helpVersionToAdd !== '');
		const addToElement = element('news-body');
		addToElement.textContent = '';
		for (let news of _newsModule) {
			const versionName = news[0];
			if (versionName.startsWith('2000')) {
				if (versionName === helpVersionToAdd || versionName === forTablet && isMobileDevice() || versionName === alwaysShow) {
					addNews2(addToElement, news, 0);
				}
			} else {
				const versionNumber = convertVersionToMilliseconds(versionName);
				if (versionNumber > versionsOlderToAddCount) {
					addNews2(addToElement, news, versionNumber);
				}
			}
		}
		windowModule.setupScrollIndicator(addToElement);
	}
	function addNews2(addToElement, news, newsDate) {
		if (addToElement.firstElementChild) {
			addToElement.appendChild(document.createElement('hr'));
		}
		const titleElement = document.createElement('h4');
		if (newsDate === 0) {
			titleElement.textContent = TW5.messages.getMessageText(news[1]);
		} else {
			titleElement.textContent = `${i18n.formatDate(newsDate)} · ${TW5.messages.getMessageText(news[1])}`;
		}
		addToElement.appendChild(titleElement);
		if (TW5.messages.getMessageText('M0010') !== 'ru') {
			const link = titleElement.appendChild(document.createElement('a'));
			link.className = 'translate-news';
			link.href = 'translate:';
			link.target = '_blank';
			link.title = TW5.messages.getMessageText('J0148');
		}
		for (let yMarker = 2; yMarker < news.length; ++yMarker) {
			i18n.InsertAdjacentHtmlMessage(addToElement, 'beforeend', news[yMarker]);
		}
	}
	function openWindow(shouldConfirmRead) {
		if (shouldConfirmRead) {
			i18n.InsertAdjacentHtmlMessage('close-news', 'content', 'F0619').title = TW5.messages.getMessageText('A0620');
			showElement('postpone-news', true);
		} else {
			i18n.InsertAdjacentHtmlMessage('close-news', 'content', 'F0663').title = '';
			showElement('postpone-news', false);
		}
		events.addHandler('control-left-click', handleLeftClick);
		windowModule.open('news');
	}
	function handleLeftClick(event) {
		if (event.callSign === 'close-news' && isElementShown('postpone-news')) {
			showElement('open-news', false);
			settings.set('previousVersionName', extensionVersion);
		} else if (event.target.href === 'translate:') {
			let textString = '';
			for (let textElement2 = event.target.parentElement; textElement2 && textElement2.nodeName !== 'HR'; textElement2 = textElement2.nextElementSibling) {
				textString += `${textElement2.textContent}\n\n`;
			}
			event.target.href = `https://translate.google.com/?op=translate&sl=${TW5.messages.getMessageText('M0010')}&text=${encodeURIComponent(textString)}`;
		}
	}
	function openHelp() {
		addNews(Infinity, fullHelp);
		openWindow(false);
	}
	function openNews() {
		const {currentValue: previousVersionName, initialValue: initialVersion} = settings.getSettingParam('previousVersionName');
		if (previousVersionName === initialVersion) {
			addNews(Infinity, showOnce);
			openWindow(false);
			showElement('open-news', false);
			settings.set('previousVersionName', extensionVersion);
		} else if (previousVersionName !== extensionVersion) {
			addNews(convertVersionToMilliseconds(previousVersionName), '');
			openWindow(true);
			element('open-news').classList.remove('unread');
		} else {
			addNews(0, '');
			openWindow(false);
		}
	}
	function assertExtensionUpdate() {
		const updateCheckInterval = 1e3 * 60 * 60 * 24 * 5;
		const UPDATE_INSTALLATION_IN_PROGRESS = 1e3 * 60 * 60 * 24 * 3;
		const now = Date.now();
		let lastCheck = settings.get('lastExtensionUpdateCheck');
		if (Math.abs(now - Math.abs(lastCheck)) < updateCheckInterval) {
			return;
		}
		wait(null, 900).then(() => {
			return loader.loadJson(null, `https://coolcmd.github.io/tw5/version.json?${now}`, 3e4, 'extension update', false);
		}).then(result => {
			let isUpdateAvailable = false;
			try {
				const {supportedVersion: {chrome: {extensionVersion2, browserVersion}}} = result;
				assert(isNonEmptyString(extensionVersion2) && Number.isSafeInteger(browserVersion));
				isUpdateAvailable = getBrowserEngineVersion() >= browserVersion && convertVersionToMilliseconds(extensionVersion) < convertVersionToMilliseconds(extensionVersion2);
			} catch (exception) {
				throw String(exception);
			}
			if (!isUpdateAvailable) {
				lastCheck = now;
			} else if (lastCheck >= 0) {
				lastCheck = -(now - (updateCheckInterval - UPDATE_INSTALLATION_IN_PROGRESS));
			} else {
				lastCheck = -now;
				windowModule.open('extension-update');
			}
			settings.set('lastExtensionUpdateCheck', lastCheck);
			settings.flushChanges();
		}).catch(wrapErrors(reasonValue => {
			if (typeof reasonValue == 'string') {
				log.logError(`[News] Failed to check for extension update. ${reasonValue}`);
				settings.set('lastExtensionUpdateCheck', lastCheck < 0 ? -now : now);
				settings.flushChanges();
			} else {
				throw reasonValue;
			}
		}));
	}
	function start() {
		const {currentValue: previousVersionName, initialValue: initialVersion} = settings.getSettingParam('previousVersionName');
		if (previousVersionName !== extensionVersion) {
			log.logOk(`[News] Extension version changed from ${previousVersionName} to ${extensionVersion}`);
			if (previousVersionName === initialVersion || hasNewsWithNewerVersion(previousVersionName)) {
				showElement('open-news', true).classList.add('unread');
			} else {
				settings.set('previousVersionName', extensionVersion);
			}
		}
		assertExtensionUpdate();
	}
	return {
		start,
		openNews,
		openHelp
	};
})();

const control = (() => {
	const arrowSeekTo = 5;
	const FRAME_SEEK_STEP = 3;
	const unknownStreamTitle = '• • •';
	let _state;
	let _playbackStartInfo, _bufferSizeInfo, _bufferStretchInfo, _repeatDurationObj;
	let _autoHideIntervalObj;
	function startWheelVolumeChange() {
		document.removeEventListener('pointerdown', handleWheelPress);
		document.removeEventListener('wheel', handleWheelRotation);
		if (settings.get('shouldChangeVolumeWithWheel')) {
			document.addEventListener('pointerdown', handleWheelPress);
			if (settings.get('wheelVolumeStep') !== 0) {
				document.addEventListener('wheel', handleWheelRotation, {
					passive: false
				});
			}
		}
	}
	const handleWheelPress = createElementEventHandler(event => {
		if (!(event.button !== middleButton || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || isEventForLink(event))) {
			event.preventDefault();
			saveAndApplyVolume(!settings.get('isMuted'));
		}
	});
	const handleWheelRotation = wrapErrors(event => {
		if (!(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || canScrollElementAtPoint(event.clientX, event.clientY))) {
			event.preventDefault();
			log.logInfo(`[Controls] Wheel movement deltaY=${event.deltaY} deltaMode=${event.deltaMode}`);
			if (event.deltaY !== 0) {
				saveAndApplyVolume(void 0, limit(getVolume() - settings.get('wheelVolumeStep') * Math.sign(event.deltaY), minVolume, getMaxVolume()));
			}
		}
	});
	function applyImageScaling() {
		element('eye').classList.toggle('zoom', settings.get('shouldScaleImage'));
	}
	function applyUiAnimation() {
		document.body.classList.toggle('interface-animation', settings.get('isUiAnimationEnabled'));
	}
	function stopWatchingStream() {
		if (_state === stoppedState || _state === repeatState) {
			return false;
		}
		log.logOk('[Controls] Stopping stream viewing');
		listModule.stop();
		converterModule.stop();
		globalQueue.clear();
		globalQueue.add(new segmentItem(processingTransformed, repeatState));
		player.addNextSegment();
		return true;
	}
	function toggleStreamViewing() {
		if (!stopWatchingStream()) {
			log.logOk('[Controls] Starting stream viewing');
			globalQueue.clear();
			player.reload(launchState);
			listModule.start();
		}
	}
	function toggleStatsWindow() {
		if (stats.isWindowOpen()) {
			stats.closeWindow();
		} else {
			stats.openWindow();
		}
	}
	function toggleColorCheck(event) {
		if (document.body.classList.toggle('color-check')) {
			document.body.classList.toggle('background-color-check', !event.shiftKey);
			newsModule.openHelp();
		} else {
			document.body.classList.remove('background-color-check');
		}
	}
	function copyTextToClipboard(textString) {
		assert(typeof textString == 'string');
		if (textString === '') {
			notification.showButt();
			return;
		}
		navigator.clipboard.writeText(textString).then(() => {
			log.logInfo('[Controls] Clipboard copy completed');
			notification.showHappiness();
		}, reasonValue => {
			log.logError(`[Controls] Error copying to clipboard: ${reasonValue}`);
			notification.showButt();
		}).catch(debug.exceptionCaught);
	}
	function copyStreamUrlToClipboard() {
		if (copyStreamUrlToClipboard.isRunning) {
			return;
		}
		copyStreamUrlToClipboard.isRunning = true;
		log.logOk('[Controls] Getting stream URL for copying');
		Twitch.getAbsoluteOptionListUrl(null, true, false).then(resultText => {
			log.logInfo('[Controls] Copying stream URL to clipboard');
			return navigator.clipboard.writeText(resultText).then(() => {
				copyStreamUrlToClipboard.isRunning = false;
				log.logInfo('[Controls] Clipboard copy completed');
				control.stopWatchingStream();
				notification.showHappiness();
			}, reasonValue => {
				throw `Error copying to clipboard: ${reasonValue}`;
			});
		}).catch(wrapErrors(reasonValue => {
			copyStreamUrlToClipboard.isRunning = false;
			if (typeof reasonValue == 'string') {
				log.logError(`[Controls] Error copying stream URL to clipboard: ${reasonValue}`);
				notification.showButt();
			} else {
				throw reasonValue;
			}
		}));
	}
	const handleVolumeChange = wrapErrors(event => {
		saveAndApplyVolume(false, event.target.valueAsNumber);
	});
	function saveAndApplyVolume(isMuted, volume) {
		assert(isMuted !== void 0 || volume !== void 0);
		if (document.body.classList.contains('no-sound')) {
			return;
		}
		if (isMuted !== void 0) {
			settings.set('isMuted', isMuted);
		}
		if (volume !== void 0) {
			settings.set('volume2', limit(Math.round(volume), minVolume, getMaxVolume()));
		}
		player.applyVolume();
		updateVolume();
		autoHide.show();
	}
	function updateVolume() {
		const maxVolume2 = getMaxVolume();
		const volume = getVolume();
		const volumeElement = element('volume');
		volumeElement.max = maxVolume2;
		volumeElement.value = volume;
		volumeElement.style.setProperty('--width', `${(volume - minVolume) / (maxVolume2 - minVolume) * 100}%`);
		updateButton('toggle-mute', settings.get('isMuted'));
	}
	function updateTrackCount(hasVideo, hasAudio) {
		document.body.classList.toggle('no-video', !hasVideo);
		document.body.classList.toggle('no-sound', !hasAudio);
	}
	function changeViewerSubscriptionToChannel(subscriptionCount) {
		if (!document.getElementById('viewer-subscription').classList.contains('updating')) {
			Twitch.changeViewerSubscriptionToChannel(subscriptionCount);
		}
	}
	const handleLeftClick = createElementEventHandler(event => {
		if (event.button !== leftButton) {
			return;
		}
		const clickedElement = event.target;
		let callSignElement = clickedElement;
		let callSign = callSignElement.id || callSignElement.name;
		if (!callSign && clickedElement.parentNode) {
			callSignElement = clickedElement.parentNode;
			callSign = callSignElement.id || callSignElement.name;
		}
		event.callSignElement = callSignElement;
		event.callSign = callSign;
		events.sendEvent('control-left-click', event);
		switch (callSign) {
		  case 'toggle-stream':
			toggleStreamViewing();
			break;

		  case 'toggle-pause':
			if (_state === repeatState) {
				player.togglePause();
			}
			break;

		  case 'toggle-mute':
			saveAndApplyVolume(!settings.get('isMuted'));
			break;

		  case 'toggle-chat':
			chat.togglePanelState();
			break;

		  case 'create-clip':
			Twitch.createClip();
			break;

		  case 'toggle-picture-in-picture':
			pictureInPictureModule.toggle();
			break;

		  case 'toggle-fullscreen':
			fullscreenMode.toggle2();
			break;

		  case 'concurrent-loads':
			assert(clickedElement.checked);
			settings.set('concurrentLoadCount', Number.parseInt(clickedElement.value, 10));
			stats.clearHistory();
			break;

		  case 'follow-raids':
			settings.set('followRaids', clickedElement.checked);
			break;

		  case 'allow-volume-boost':
			settings.set('volumeBoostEnabled', clickedElement.checked);
			if (!clickedElement.checked && settings.get('volume2') > maxVolume) {
				settings.set('volume2', maxVolume);
			}
			player.applyVolume();
			updateVolume();
			break;

		  case 'interface-animation':
			settings.set('isUiAnimationEnabled', clickedElement.checked);
			applyUiAnimation();
			break;

		  case 'scale-image':
			settings.set('shouldScaleImage', clickedElement.checked);
			applyImageScaling();
			break;

		  case 'auto-chat-position':
			settings.set('isChatAutoPosition', clickedElement.checked);
			updateSettingsWindow();
			chat.applyPanelPosition();
			break;

		  case 'chat-horizontal-position-setting':
			assert(clickedElement.checked);
			settings.set('chatHorizontalPosition', Number.parseInt(clickedElement.value, 10));
			chat.applyPanelPosition();
			break;

		  case 'chat-vertical-position-setting':
			assert(clickedElement.checked);
			settings.set('chatVerticalPosition', Number.parseInt(clickedElement.value, 10));
			chat.applyPanelPosition();
			break;

		  case 'chat-position':
			assert(clickedElement.checked);
			settings.set('chatPanelPosition', Number.parseInt(clickedElement.value, 10));
			chat.applyPanelPosition();
			break;

		  case 'closed-chat-state-setting':
			assert(clickedElement.checked);
			chat.saveAndApplyClosedPanelState(Number.parseInt(clickedElement.value, 10));
			break;

		  case 'toggle-stats':
		  case 'position':
			toggleStatsWindow();
			break;

		  case 'open-news':
		  case 'open-news-2':
			newsModule.openNews();
			break;

		  case 'open-help':
			newsModule.openHelp();
			break;

		  case 'send-feedback':
			debug.finishAndSendFeedback();
			break;

		  case 'export-settings':
			settings.exportSettings();
			break;

		  case 'import-settings':
			const elementRef = document.getElementById('settings-import-file-picker');
			elementRef.value = '';
			elementRef.click();
			break;

		  case 'reset-settings':
			settings.reset();
			break;

		  case 'color-check':
			toggleColorCheck(event);
			break;

		  case 'viewer-subscribe':
			changeViewerSubscriptionToChannel(subscriptionNotify);
			break;

		  case 'viewer-unsubscribe':
			changeViewerSubscriptionToChannel(subscriptionNotSubscribed);
			break;

		  case 'viewer-notify':
			changeViewerSubscriptionToChannel(clickedElement.checked ? subscriptionNotify : subscriptionDoNotNotify);
			break;

		  case 'close-stats':
			stats.closeWindow();
			break;

		  case 'copy-channel-url':
			log.logInfo('[Controls] Copying channel URL to clipboard');
			copyTextToClipboard(Twitch.getChannelUrl(false));
			break;

		  case 'copy-stream-url':
			copyStreamUrlToClipboard();
		}
	});
	const handleKeyPressAndRelease = wrapErrors(event => {
		const SHIFT_KEY = 1 << 16;
		const CTRL_KEY = 1 << 17;
		const ALT_KEY = 1 << 18;
		const META_KEY = 1 << 19;
		const isPressed = event.type === 'keydown';
		const isPressed1 = isPressed && !event.repeat;
		switch (event.keyCode + event.shiftKey * SHIFT_KEY + event.ctrlKey * CTRL_KEY + event.altKey * ALT_KEY + event.metaKey * META_KEY) {
		  case 27:
			event.preventDefault();
			if (isPressed1) {
				getSelection().removeAllRanges();
				windowModule.close(false);
				autoHide.hide(false);
			}
			break;

		  case 70:
		  case 13:
		  case 13 + ALT_KEY:
			if (isPressed1) {
				fullscreenMode.toggle2();
			}
			break;

		  case 13 + SHIFT_KEY:
			if (isPressed1) {
				pictureInPictureModule.toggle();
			}
			break;

		  case 93:
			if (!isPressed) {
				element('eye').focus();
			}
			return;

		  case 88:
			if (isPressed1) {
				windowModule.toggle('main-menu');
			}
			break;

		  case 67:
			if (isPressed1) {
				chat.togglePanelState();
			}
			break;

		  case 86:
			if (isPressed1) {
				windowModule.toggle('settings');
			}
			break;

		  case 73:
			if (isPressed1) {
				windowModule.toggle('channel');
			}
			break;

		  case 83:
			if (isPressed1) {
				toggleStatsWindow();
			}
			break;

		  case 112:
			if (isPressed1) {
				newsModule.openHelp();
			}
			break;

		  case 65 + CTRL_KEY:
			break;

		  case 85 + CTRL_KEY:
			if (isPressed1) {
				chat.togglePanelPosition();
				updateSettingsWindow();
			}
			break;

		  case 32:
			if (isPressed1) {
				toggleStreamViewing();
				autoHide.show();
			}
			break;

		  case 49:
		  case 50:
		  case 51:
		  case 52:
		  case 53:
		  case 54:
		  case 55:
		  case 56:
		  case 57:
		  case 48:
			if (isPressed1 && _state === repeatState) {
				configureReplaySpeed(58 - (event.keyCode === 48 ? 58 : event.keyCode));
				autoHide.show();
			}
			break;

		  case 187:
		  case 107:
		  case 190:
			if (isPressed1 && _state === repeatState) {
				configureReplaySpeed(-Infinity);
				autoHide.show();
			}
			break;

		  case 189:
		  case 109:
		  case 188:
			if (isPressed1 && _state === repeatState) {
				configureReplaySpeed(Infinity);
				autoHide.show();
			}
			break;

		  case 75:
		  case 12:
			if (isPressed1 && _state === repeatState) {
				player.togglePause();
				autoHide.show();
			}
			break;

		  case 74:
		  case 37:
			if (isPressed && _state === repeatState) {
				log.logOk(`[Controls] Seeking -${arrowSeekTo}s`);
				player.seekReplayForward(false, -arrowSeekTo);
				autoHide.show();
			}
			break;

		  case 76:
		  case 39:
			if (isPressed && _state === repeatState) {
				log.logOk(`[Controls] Seeking +${arrowSeekTo}s`);
				player.seekReplayForward(false, arrowSeekTo);
				autoHide.show();
			}
			break;

		  case 74 + SHIFT_KEY:
		  case 37 + SHIFT_KEY:
			if (isPressed && _state === repeatState) {
				log.logOk(`[Controls] Seeking -${FRAME_SEEK_STEP} frames`);
				player.seekReplayForward(true, -FRAME_SEEK_STEP);
			}
			break;

		  case 76 + SHIFT_KEY:
		  case 39 + SHIFT_KEY:
			if (isPressed && _state === repeatState) {
				log.logOk(`[Controls] Seeking +1 frame`);
				player.seekReplayForward(true, 1);
			}
			break;

		  case 38:
			if (isPressed) {
				saveAndApplyVolume(false, Math.min(getVolume() + volumeUpKeyStep, getMaxVolume()));
			}
			break;

		  case 40:
			if (isPressed) {
				saveAndApplyVolume(false, Math.max(getVolume() - volumeDownKeyStep, minVolume));
			}
			break;

		  case 33:
			if (isPressed1) {
				saveAndApplyVolume(false);
			}
			break;

		  case 34:
			if (isPressed1) {
				saveAndApplyVolume(true);
			}
			break;

		  case 77:
			if (isPressed1) {
				saveAndApplyVolume(!settings.get('isMuted'));
			}
			break;

		  case 73 + CTRL_KEY:
			if (isPressed1) {
				const shouldScaleImage = settings.get('shouldScaleImage');
				settings.set('shouldScaleImage', !shouldScaleImage);
				updateSettingsWindow();
				applyImageScaling();
				notification.show(`svg-fullscreen-${shouldScaleImage}`, false);
			}
			break;

		  case 88 + ALT_KEY:
			if (isPressed1) {
				Twitch.createClip();
			}
			break;

		  default:
			return;
		}
		event.preventDefault();
	});
	const handleLanguageChange = wrapErrors(event => {
		const languageCode = event.target.value;
		settings.set('interfaceLanguage', languageCode);
		settings.flushChanges();
		window.location.reload();
	});
	function setupLanguageSelect() {
		const selectElement = element('interface-language');
		for (const optionElement of selectElement.options) {
			if (optionElement.value !== 'auto') {
				optionElement.textContent = i18n.getLanguageName(optionElement.value);
			}
		}
		selectElement.value = settings.get('interfaceLanguage');
		assert(selectElement.value);
		selectElement.addEventListener('change', handleLanguageChange);
	}
	function updateSettingsWindow() {
		document.querySelector(`input[name="concurrent-loads"][value="${settings.get('concurrentLoadCount')}"]`).checked = true;
		document.querySelector(`input[name="closed-chat-state-setting"][value="${settings.get('closedChatStateCode')}"]`).checked = true;
		element('chat-url').selectedIndex = settings.get('isFullChat') ? 0 : settings.get('shouldDimChat') ? 2 : 1;
		element('scale-image').checked = settings.get('shouldScaleImage');
		element('allow-volume-boost').checked = settings.get('volumeBoostEnabled');
		element('follow-raids').checked = settings.get('followRaids');
		element('interface-animation').checked = settings.get('isUiAnimationEnabled');
		element('change-volume-with-wheel').value = settings.get('shouldChangeVolumeWithWheel') ? settings.get('wheelVolumeStep') : '';
		const isAutoPosition = settings.get('isChatAutoPosition');
		element('auto-chat-position').checked = isAutoPosition;
		const sideElements = document.querySelectorAll('.chat-position input');
		if (isAutoPosition) {
			const horizontalPosition = settings.get('chatHorizontalPosition');
			const verticalPosition = settings.get('chatVerticalPosition');
			let horizontalPositionElement, verticalPositionElement;
			for (let sideElement of sideElements) {
				const sideValue = Number.parseInt(sideElement.value, 10);
				if (horizontalPosition === sideValue) {
					horizontalPositionElement = sideElement;
				}
				if (verticalPosition === sideValue) {
					verticalPositionElement = sideElement;
				}
				sideElement.name = sideValue === rightSide || sideValue === leftSide ? 'chat-horizontal-position-setting' : 'chat-vertical-position-setting';
			}
			horizontalPositionElement.checked = verticalPositionElement.checked = true;
		} else {
			const position = settings.get('chatPanelPosition');
			let positionElement;
			for (let sideElement of sideElements) {
				if (position === Number.parseInt(sideElement.value, 10)) {
					positionElement = sideElement;
				}
				sideElement.name = 'chat-position';
			}
			positionElement.checked = true;
		}
		if (_playbackStartInfo) {
			_playbackStartInfo.update();
			_bufferSizeInfo.update();
			_bufferStretchInfo.update();
			_repeatDurationObj.update();
			_autoHideIntervalObj.update();
		} else {
			_playbackStartInfo = new numberInput('playbackStartMs', .5, 1, 'playback-start');
			_bufferSizeInfo = new numberInput('bufferSize', .5, 1, 'buffer-size');
			_bufferStretchInfo = new numberInput('bufferStretchMs', .5, 1, 'buffer-stretching');
			_repeatDurationObj = new numberInput('replayDuration2', 30, 0, 'replay-duration');
			_playbackStartInfo.afterChange = _bufferSizeInfo.afterChange = _bufferStretchInfo.afterChange = stats.clearHistory;
			_autoHideIntervalObj = new numberInput('autoHideInterval', .5, 1, 'auto-hide-interval');
		}
	}
	function handleMainMenuOpen() {
		const itemElement = element('recording-url');
		const address = Twitch.getRecordUrlForCurrentPosition();
		if (address) {
			itemElement.href = address;
			menu.setItemAvailability(itemElement, true);
		} else {
			itemElement.removeAttribute('href');
			menu.setItemAvailability(itemElement, false);
		}
	}
	function handlePause(isPaused) {
		updateButton('toggle-pause', isPaused);
	}
	function handleBufferingPresetChange() {
		updateSettingsWindow();
		stats.clearHistory();
	}
	function getReplaySpeed() {
		const speedElement = element('speed');
		if (speedElement.options[0].text === '') {
			for (const elementRef of speedElement.options) {
				elementRef.text = elementRef.defaultSelected ? '1x' : i18n.formatNumber(elementRef.value, 2);
			}
		}
		const speedValue = Number.parseFloat(speedElement.value);
		assert(speedValue > 0);
		return speedValue;
	}
	function configureReplaySpeed(code) {
		const speedElement = element('speed');
		if (!Number.isSafeInteger(code)) {
			assert(speedElement.selectedIndex >= 0 && (code === -Infinity || code === Infinity));
			code = speedElement.selectedIndex + Math.sign(code);
		}
		if (code >= 0 && code < speedElement.options.length) {
			speedElement.selectedIndex = code;
			player.setReplaySpeed(getReplaySpeed());
		}
	}
	const handlePlaybackSpeedChange = wrapErrors(event => {
		if (_state === repeatState) {
			player.setReplaySpeed(getReplaySpeed());
		}
	});
	const handleStreamVariantChange = wrapErrors(({target: {selectedIndex}}) => {
		if (selectedIndex !== -1) {
			log.logOk(`[Controls] Variant selected ${selectedIndex}`);
			listModule.setStreamVariant(selectedIndex);
		}
	});
	const handleWheelVolumeChange = wrapErrors(event => {
		if (event.target.value) {
			settings.set('shouldChangeVolumeWithWheel', true);
			settings.set('wheelVolumeStep', Number(event.target.value));
		} else {
			settings.set('shouldChangeVolumeWithWheel', false);
		}
		startWheelVolumeChange();
	});
	const handleChatAddressChange = wrapErrors(event => {
		log.logOk(`[Controls] Chat address selected ${event.target.selectedIndex}`);
		switch (event.target.selectedIndex) {
		  case 0:
			settings.set('isFullChat', true);
			break;

		  case 1:
			settings.set('isFullChat', false);
			settings.set('shouldDimChat', false);
			break;

		  case 2:
			settings.set('isFullChat', false);
			settings.set('shouldDimChat', true);
			break;

		  default:
			assert(false);
		}
		chat.applyUrl();
	});
	const handleSettingsImportFileSelect = wrapErrors(event => {
		if (event.target.files.length === 1) {
			settings.importSettings(event.target.files[0]);
		}
	});
	function updateStreamVariantList([options, selectedOption]) {
		const listElement = element('stream-variant');
		listElement.length = 0;
		if (options) {
			for (const option of options) {
				let title = option.title;
				if (title === 'audio_only') {
					title = TW5.messages.getMessageText('J0144');
				} else if (title.endsWith('(source)')) {
					title = title.slice(0, -8) + TW5.messages.getMessageText('J0139');
				}
				listElement.add(new Option(title, void 0, option === selectedOption, option === selectedOption));
			}
		}
		listElement.disabled = listElement.length < 2;
	}
	function handleAdStart() {
		document.body.classList.add('ad');
	}
	function handleAdEnd() {
		document.body.classList.remove('ad');
	}
	function handleBufferOverflow() {
		notification.show('svg-cut', true);
	}
	function start() {
		assert(_state === void 0);
		element('stream-title').href = Twitch.getChannelUrl(true);
		const volumeElement = element('volume');
		volumeElement.min = minVolume;
		volumeElement.addEventListener('input', handleVolumeChange);
		updateVolume();
		updateSettingsWindow();
		setupLanguageSelect();
		settings.setupPresetLists();
		autoHide.start();
		autoHide.show();
		newsModule.start();
		chat.restore();
		events.addHandler('window-open-main-menu', handleMainMenuOpen);
		events.addHandler('stream-variant-selected', updateStreamVariantList);
		events.addHandler('list-ad-start', handleAdStart);
		events.addHandler('list-ad-end', handleAdEnd);
		events.addHandler('player-buffer-overflow', handleBufferOverflow);
		events.addHandler('player-pause', handlePause);
		events.addHandler('settings-buffering-preset-changed', handleBufferingPresetChange);
		events.addHandler('twitch-channel-metadata-received', showChannelMetadata);
		events.addHandler('twitch-viewer-metadata-received', showViewerMetadata);
		events.addHandler('twitch-stream-metadata-received', showStreamMetadata);
		document.documentElement.addEventListener('click', handleLeftClick);
		document.addEventListener('keydown', handleKeyPressAndRelease);
		document.addEventListener('keyup', handleKeyPressAndRelease);
		element('speed').addEventListener('change', handlePlaybackSpeedChange);
		element('stream-variant').addEventListener('change', handleStreamVariantChange);
		element('change-volume-with-wheel').addEventListener('change', handleWheelVolumeChange);
		element('chat-url').addEventListener('change', handleChatAddressChange);
		element('settings-import-file-picker').addEventListener('change', handleSettingsImportFileSelect);
		startWheelVolumeChange();
		setState(launchState);
		applyImageScaling();
		applyUiAnimation();
		themeModule.start();
	}
	function setState(newStateNumber) {
		assert(Number.isInteger(newStateNumber));
		if (_state === newStateNumber) {
			return;
		}
		log.logInfo(`[Controls] Stream state changed from ${_state} to ${newStateNumber}`);
		_state = newStateNumber;
		document.body.setAttribute('data-state', newStateNumber);
		updateButton('toggle-stream', newStateNumber === stoppedState || newStateNumber === repeatState);
		events.sendEvent('control-state-changed', newStateNumber);
		switch (newStateNumber) {
		  case launchState:
			showStreamMetadata({
				streamType: null,
				streamTitle: unknownStreamTitle,
				gameTitle: null,
				gameAddress: null,
				viewerCount: null,
				streamDuration: null
			});
			Twitch.finishStreamMetadataCollection(true);
			break;

		  case streamStartState:
			showStreamMetadata({
				streamType: null,
				streamTitle: unknownStreamTitle,
				gameTitle: null,
				gameAddress: null,
				viewerCount: null,
				streamDuration: null
			});
			Twitch.startCollectingStreamMetadata();
			break;

		  case streamEndState:
			showStreamMetadata({
				streamType: 'completed',
				viewerCount: null,
				streamDuration: null
			});
			Twitch.finishStreamMetadataCollection(true);
			element('stats-stream-delay').textContent = '';
			break;

		  case loadingState:
		  case playbackStartState:
		  case playbackState:
			break;

		  case stoppedState:
		  case repeatState:
			showStreamMetadata({
				viewerCount: null
			});
			Twitch.finishStreamMetadataCollection(false);
			element('stats-stream-delay').textContent = '';
			break;

		  default:
			assert(false);
		}
	}
	function getState() {
		assert(_state !== void 0);
		return _state;
	}
	function showChannelMetadata(metadata) {
		if (metadata.name !== void 0) {
			setDocumentTitle(`${metadata.name} - Alternate Player for Twitch.tv`);
			element('channel-name').textContent = metadata.name;
		}
		if (metadata.avatarUrl !== void 0) {
			assert(metadata.avatarUrl);
			element('channel-avatar').src = metadata.avatarUrl;
		}
		if (metadata.descriptionText !== void 0) {
			element('channel-description').textContent = metadata.descriptionText || '';
		}
		if (metadata.languageCode !== void 0) {
			const elementRef = element('channel-language');
			if (metadata.languageCode) {
				elementRef.textContent = i18n.getLanguageName(metadata.languageCode);
				showElement(elementRef.parentNode, true);
			} else {
				showElement(elementRef.parentNode, false);
			}
		}
		if (metadata.subscriberCount !== void 0) {
			const elementRef = element('channel-subscribers');
			if (Number.isFinite(metadata.subscriberCount)) {
				elementRef.textContent = i18n.formatNumber(metadata.subscriberCount);
				showElement(elementRef.parentNode, true);
			} else {
				showElement(elementRef.parentNode, false);
			}
		}
		if (metadata.channelCreatedAt !== void 0) {
			const elementRef = element('channel-created');
			if (Number.isFinite(metadata.channelCreatedAt)) {
				elementRef.textContent = i18n.formatDate(metadata.channelCreatedAt);
				showElement(elementRef.parentNode, true);
			} else {
				showElement(elementRef.parentNode, false);
			}
		}
		if (metadata.commandsMap !== void 0) {
			showLinksArray(metadata.commandsMap, 'channel-commands');
		}
	}
	function showLinksArray(linksModule, insert) {
		const insertElement = element(insert);
		if (linksModule.length === 0) {
			showElement(insertElement.parentNode, false);
		} else {
			const fragment = document.createDocumentFragment();
			for (let linkObject, yMarker = 0; linkObject = linksModule[yMarker]; ++yMarker) {
				if (yMarker !== 0) {
					fragment.appendChild(document.createTextNode(', '));
				}
				assert(isNonEmptyString(linkObject.address) && isNonEmptyString(linkObject.name));
				const linkElement = document.createElement('a');
				linkElement.href = linkObject.address;
				linkElement.rel = 'noopener noreferrer';
				linkElement.target = '_blank';
				if (linkObject.descriptionText) {
					linkElement.className = 'channel-link';
					linkElement.title = linkObject.descriptionText;
				}
				linkElement.textContent = linkObject.name;
				fragment.appendChild(linkElement);
			}
			insertElement.textContent = '';
			insertElement.appendChild(fragment);
			showElement(insertElement.parentNode, true);
		}
	}
	function showViewerMetadata(metadata) {
		if (metadata.name !== void 0) {
			if (metadata.name !== '') {
				element('viewer-name').textContent = metadata.name;
			} else {
				i18n.InsertAdjacentHtmlMessage('viewer-name', 'content', 'F0590');
			}
		}
		if (metadata.subscriptionCount !== void 0) {
			const elementRef = element('viewer-subscription');
			if (metadata.subscriptionCount === SUBSCRIPTION_UPDATING) {
				elementRef.classList.add('updating');
			} else {
				elementRef.classList.remove('updating');
				elementRef.setAttribute('data-subscription', metadata.subscriptionCount);
				element('viewer-notify').checked = metadata.subscriptionCount === subscriptionNotify;
			}
		}
	}
	const _streamTypes = {
		completed: [ 'J0145', 'J0100', false ],
		live: [ 'J0146', 'J0149', true ],
		replay: [ 'J0147', 'J0150', false ]
	};
	function showStreamMetadata(metadata) {
		if (metadata.streamType !== void 0) {
			const elementRef = element('stream-type');
			if (typeof metadata.streamType == 'string') {
				assert(_streamTypes.hasOwnProperty(metadata.streamType));
				elementRef.textContent = TW5.messages.getMessageText(_streamTypes[metadata.streamType][0]);
				elementRef.parentElement.title = TW5.messages.getMessageText(_streamTypes[metadata.streamType][1]);
				elementRef.classList.toggle('live-stream', _streamTypes[metadata.streamType][2]);
				showElement(elementRef.parentElement, true);
			} else {
				showElement(elementRef.parentElement, false);
			}
			mediaQuery.refreshFast();
		}
		if (metadata.streamTitle !== void 0) {
			assert(metadata.streamTitle !== null);
			const elementRef = element('stream-title');
			elementRef.title = metadata.streamTitle + TW5.messages.getMessageText('J0101');
			elementRef.textContent = metadata.streamTitle;
			mediaQuery.refreshFast();
		}
		if (metadata.gameTitle !== void 0) {
			const elementRef = element('stream-category');
			if (metadata.gameTitle) {
				elementRef.textContent = metadata.gameTitle;
				elementRef.title = elementRef.previousElementSibling.title = metadata.gameTitle + TW5.messages.getMessageText('J0102');
				if (metadata.gameAddress) {
					elementRef.href = metadata.gameAddress;
				} else {
					elementRef.removeAttribute('href');
				}
				showElement(elementRef, true);
				showElement(elementRef.previousElementSibling, true);
			} else {
				showElement(elementRef, false);
				showElement(elementRef.previousElementSibling, false);
			}
			mediaQuery.refreshFast();
		}
		if (metadata.viewerCount !== void 0) {
			const elementRef = element('viewer-count');
			if (Number.isFinite(metadata.viewerCount) && metadata.viewerCount >= 0) {
				elementRef.textContent = i18n.formatNumber(metadata.viewerCount);
				showElement(elementRef, true);
				showElement(elementRef.previousElementSibling, true);
			} else {
				showElement(elementRef, false);
				showElement(elementRef.previousElementSibling, false);
			}
			mediaQuery.refreshFast();
		}
		if (metadata.streamDuration !== void 0) {
			element('position').textContent = Number.isFinite(metadata.streamDuration) && metadata.streamDuration >= 0 ? i18n.secondsToString(metadata.streamDuration / 1e3, false) : '';
		}
	}
	return {
		start,
		getState,
		setState,
		getReplaySpeed,
		updateTrackCount,
		stopWatchingStream
	};
})();

const chat = (() => {
	let _chatElement = null;
 //! <iframe>
		function getPanelPosition() {
		switch (getComputedStyle(document.getElementById('player-and-chat')).flexDirection) {
		  case 'column-reverse':
			return topSide;

		  case 'row':
			return rightSide;

		  case 'column':
			return bottomSide;

		  case 'row-reverse':
			return leftSide;

		  default:
			assert(false);
		}
	}
	function insertPanel() {
		if (_chatElement) {
			return;
		}
		const address = Twitch.openChat();
		log.logInfo(`[Chat] Inserting iframe ${address}`);
		_chatElement = document.createElement('iframe');
		_chatElement.src = address;
		_chatElement.id = 'chat';
		_chatElement.width = settings.get('chatPanelWidth');
		_chatElement.height = settings.get('chatPanelHeight');
		element('chat-size').insertAdjacentElement('afterend', _chatElement);
	}
	function removePanel() {
		if (_chatElement) {
			log.logInfo(`[Chat] Removing iframe ${_chatElement.src}`);
			Twitch.closeChat();
			_chatElement.remove();
			_chatElement = null;
		}
	}
	function applyUrl() {
		if (_chatElement) {
			log.logOk('[Chat] Changing iframe URL');
			removePanel();
			insertPanel();
		}
	}
	function applyPanelState() {
		const stateNumber = settings.get('chatState');
		log.logOk(`[Chat] New panel state: ${stateNumber}`);
		cancelPanelDrag();
		switch (stateNumber) {
		  case chatUnloaded:
			document.body.classList.add('hide-chat');
			removePanel();
			break;

		  case chatHidden:
			insertPanel();
			document.body.classList.add('hide-chat');
			break;

		  case chatPanel:
			insertPanel();
			document.body.classList.remove('hide-chat');
			break;

		  default:
			assert(false);
		}
		mediaQuery.updateSlowly();
	}
	function applyPanelPosition() {
		cancelPanelDrag();
		const classes = document.body.classList;
		if (settings.get('isChatAutoPosition')) {
			classes.add('auto-chat-position');
			classes.toggle('chat-top', settings.get('chatVerticalPosition') === topSide);
			classes.toggle('chat-left', settings.get('chatHorizontalPosition') === leftSide);
		} else {
			const position = settings.get('chatPanelPosition');
			classes.remove('auto-chat-position');
			classes.toggle('chat-top', position === topSide);
			classes.toggle('chat-right', position === rightSide);
			classes.toggle('chat-bottom', position === bottomSide);
			classes.toggle('chat-left', position === leftSide);
		}
		mediaQuery.updateSlowly();
	}
	function saveAndApplyClosedPanelState(newStateNumber) {
		settings.set('closedChatStateCode', newStateNumber);
		const stateNumber = settings.get('chatState');
		if ((stateNumber === chatUnloaded || stateNumber === chatHidden) && stateNumber !== newStateNumber) {
			settings.set('chatState', newStateNumber);
			applyPanelState();
		}
	}
	function togglePanelState() {
		const isFullscreen = fullscreenMode.isEnabled2();
		switch (settings.get('chatState')) {
		  case chatUnloaded:
		  case chatHidden:
			settings.set('chatState', chatPanel, isFullscreen);
			break;

		  case chatPanel:
			settings.set('chatState', isFullscreen ? chatHidden : settings.get('closedChatStateCode'), isFullscreen);
			break;

		  default:
			assert(false);
		}
		applyPanelState();
	}
	function togglePanelPosition() {
		if (settings.get('chatState') !== chatPanel) {
			return;
		}
		let position;
		if (settings.get('isChatAutoPosition')) {
			settings.set('isChatAutoPosition', false);
			position = getPanelPosition();
		} else {
			position = settings.get('chatPanelPosition');
		}
		switch (position) {
		  case topSide:
			settings.set('chatPanelPosition', rightSide);
			break;

		  case rightSide:
			settings.set('chatPanelPosition', bottomSide);
			break;

		  case bottomSide:
			settings.set('chatPanelPosition', leftSide);
			break;

		  case leftSide:
			settings.set('chatPanelPosition', topSide);
			break;

		  default:
			assert(false);
		}
		applyPanelPosition();
	}
	function handlePanelDrag(params) {
		if (params.isCancelled2) {
			return;
		}
		const position = getPanelPosition();
		if (params.step !== 1 && params._initialPosition !== position) {
			log.logError(`[Chat] Dragged panel position changed from ${params._initialPosition} to ${position}`);
			cancelPanelDrag();
			return;
		}
		switch (params.step) {
		  case 1:
			params._initialPosition = position;
			if (position === rightSide || position === leftSide) {
				params._initialSize = Number.parseInt(getComputedStyle(_chatElement).width, 10);
			} else {
				params._initialSize = Number.parseInt(getComputedStyle(_chatElement).height, 10);
			}
			break;

		  case 2:
			if (position === rightSide || position === leftSide) {
				if (params.hasXChanged) {
					const maxSizeValue = Number.parseInt(getComputedStyle(element('player-and-chat')).width, 10) - Number.parseInt(getComputedStyle(element('player')).minWidth, 10);
					_chatElement.width = Math.max(Math.min(position === leftSide ? params._initialSize + params.deltaX : params._initialSize - params.deltaX, maxSizeValue), 0);
					mediaQuery.updateSlowly();
				}
			} else if (params.hasYChanged) {
				const maxSizeValue = Number.parseInt(getComputedStyle(element('player-and-chat')).height, 10) - Number.parseInt(getComputedStyle(element('player')).minHeight, 10);
				_chatElement.height = Math.max(Math.min(position === topSide ? params._initialSize + params.deltaY : params._initialSize - params.deltaY, maxSizeValue), 0);
				mediaQuery.updateSlowly();
			}
			break;

		  case 3:
			if (position === rightSide || position === leftSide) {
				settings.set('chatPanelWidth', Number.parseInt(getComputedStyle(_chatElement).width, 10));
			} else {
				settings.set('chatPanelHeight', Number.parseInt(getComputedStyle(_chatElement).height, 10));
			}
			break;

		  default:
			assert(false);
		}
	}
	function cancelPanelDrag() {
		draggerModule.cancelDrag('chat-size');
	}
	handleFullscreenChange.normalModeState = -1;
	function handleFullscreenChange(isEnabled) {
		if (isEnabled) {
			if (handleFullscreenChange.normalModeState === -1) {
				handleFullscreenChange.normalModeState = settings.get('chatState');
				if (handleFullscreenChange.normalModeState === chatPanel) {
					settings.set('chatState', chatHidden, true);
					applyPanelState();
				}
			}
		} else if (handleFullscreenChange.normalModeState !== -1) {
			if (handleFullscreenChange.normalModeState === chatPanel) {
				settings.set('chatState', chatPanel);
				applyPanelState();
			} else if (settings.get('chatState') === chatHidden && settings.get('closedChatStateCode') === chatUnloaded) {
				settings.set('chatState', chatUnloaded);
				applyPanelState();
			}
			handleFullscreenChange.normalModeState = -1;
		}
	}
	function restore() {
		applyPanelState();
		applyPanelPosition();
		events.addHandler('drag-handle-drag-chat-size', handlePanelDrag);
		events.addHandler('fullscreen-mode-changed', handleFullscreenChange);
	}
	return {
		restore,
		applyPanelPosition,
		applyUrl,
		saveAndApplyClosedPanelState,
		togglePanelState,
		togglePanelPosition
	};
})();

const audioDeviceModule = (() => {
	const defaultDevice = 'default';
	const COMMUNICATION_DEVICE = 'communications';
	let _oMediaElement = null;
	function refreshDevicesAndSelect() {
		const deviceListElement = element('audio-devices-list');
		log.logOk('[AudioDevices] Getting media device list');
		navigator.mediaDevices.enumerateDevices().then(mediaDevicesModule => {
			if (!Array.isArray(mediaDevicesModule)) {
				log.logError('[AudioDevices] Audio device list unavailable');
				showElement('audio-devices', false);
				return;
			}
			deviceListElement.length = 0;
			log.logInfo(`[AudioDevices] Current device ${_oMediaElement.sinkId}`);
			const currentDeviceName = _oMediaElement.sinkId === defaultDevice ? '' : _oMediaElement.sinkId;
			const savedDeviceName = settings.get('audioDeviceId');
			let deviceCount = 0, actualDeviceCount = 0;
			let hasDefaultDevice = false, hasCurrentDevice = currentDeviceName === '', hasSavedDevice = savedDeviceName === '';
			for (const mediaDevice of mediaDevicesModule) {
				log.logInfo(`[AudioDevices] Media device kind=${mediaDevice.kind} deviceId=${mediaDevice.deviceId} groupId=${mediaDevice.groupId} label=${mediaDevice.label}`);
				if (mediaDevice.kind === 'audiooutput') {
					deviceCount++;
					if (mediaDevice.deviceId && mediaDevice.label) {
						actualDeviceCount += mediaDevice.deviceId !== defaultDevice && mediaDevice.deviceId !== COMMUNICATION_DEVICE;
						hasDefaultDevice = hasDefaultDevice || mediaDevice.deviceId === defaultDevice;
						hasCurrentDevice = hasCurrentDevice || mediaDevice.deviceId === currentDeviceName;
						hasSavedDevice = hasSavedDevice || mediaDevice.deviceId === savedDeviceName;
						deviceListElement.add(new Option(mediaDevice.label, mediaDevice.deviceId === defaultDevice ? '' : mediaDevice.deviceId));
					}
				}
			}
			if (deviceCount !== 0 && deviceListElement.length === 0) {
				if (getBrowserEngineVersion() <= 68 && chrome.extension.inIncognitoContext) {
					showElement('audio-devices', false);
				} else {
					showElement('audio-devices-access', true);
					showElement(deviceListElement, false);
					showElement('audio-devices', true);
					events.addHandler('control-left-click', handleClickAndRequestAudioDevicesAccess);
				}
			} else {
				if (!hasDefaultDevice && deviceListElement.length !== 0) {
					deviceListElement.add(new Option('Default', ''), 0);
				}
				deviceListElement.value = currentDeviceName;
				deviceListElement.disabled = deviceListElement.length === 0;
				showElement('audio-devices-access', false);
				showElement(deviceListElement, true);
				if (actualDeviceCount > 1) {
					showElement('audio-devices', true);
					deviceListElement.addEventListener('change', handleDeviceSelect);
				}
				let selectionName;
				if (hasSavedDevice && savedDeviceName !== currentDeviceName) {
					selectionName = savedDeviceName;
				} else if (!hasCurrentDevice && deviceListElement.length !== 0) {
					selectionName = '';
				}
				if (selectionName !== void 0) {
					log.logOk(`[AudioDevices] Selecting device ${selectionName}`);
					return _oMediaElement.setSinkId(selectionName).then(() => {
						log.logInfo('[AudioDevices] Device selected');
						volumeBoostModule.selectDevice(selectionName);
						deviceListElement.value = selectionName;
					}, reasonValue => {
						log.logError(`[AudioDevices] Failed to select device: ${reasonValue}`);
					});
				}
			}
		}, reasonValue => {
			log.logError(`[AudioDevices] Failed to get media device list: ${reasonValue}`);
			deviceListElement.length = 0;
			deviceListElement.disabled = true;
		}).catch(debug.exceptionCaught);
	}
	function handleClickAndRequestAudioDevicesAccess({callSign}) {
		if (callSign !== 'audio-devices-access') {
			return;
		}
		log.logOk('[AudioDevices] Requesting contentSettings permission');
		chrome.permissions.request({
			permissions: [ 'contentSettings' ]
		}, wrapErrors(isPermissionGranted => {
			if (isPermissionGranted) {
				log.logOk('[AudioDevices] Getting access to audio devices');
				chrome.contentSettings.microphone.set({
					primaryPattern: `*://${chrome.runtime.id}/*`,
					setting: 'allow',
					scope: chrome.extension.inIncognitoContext ? 'incognito_session_only' : 'regular'
				}, wrapErrors(() => {
					if (chrome.runtime.lastError) {
						log.logError(`[AudioDevices] Access not granted: ${chrome.runtime.lastError.message}`);
						notification.showButt();
					}
					refreshDevicesAndSelect();
				}));
			} else {
				log.logError(`[AudioDevices] Permission not granted: ${chrome.runtime.lastError && chrome.runtime.lastError.message}`);
				notification.showButt();
			}
		}));
	}
	const handleDeviceSelect = wrapErrors(event => {
		if (event.target.selectedIndex !== -1) {
			const selectionName = event.target.value;
			log.logOk(`[AudioDevices] Selecting device ${selectionName} instead of ${_oMediaElement.sinkId}`);
			_oMediaElement.setSinkId(selectionName).then(() => {
				log.logInfo('[AudioDevices] Device selected');
				volumeBoostModule.selectDevice(selectionName);
				settings.set('audioDeviceId', selectionName);
			}, reasonValue => {
				log.logError(`[AudioDevices] Failed to select device: ${reasonValue}`);
				notification.showButt();
				refreshDevicesAndSelect();
			}).catch(debug.exceptionCaught);
		}
	});
	function startInternal(oMediaElement) {
		if (_oMediaElement) {
			return;
		}
		_oMediaElement = oMediaElement;
		if (!('setSinkId' in _oMediaElement)) {
			log.logError('[AudioDevices] Browser does not support MediaElement.setSinkId');
			return;
		}
		if (!('addEventListener' in navigator.mediaDevices)) {
			log.logError('[AudioDevices] Browser does not support MediaDevices.ondevicechange');
		} else {
			navigator.mediaDevices.addEventListener('devicechange', wrapErrors(refreshDevicesAndSelect));
		}
		refreshDevicesAndSelect();
	}
	return {
		startInternal
	};
})();

const volumeBoostModule = (() => {
	let _oMediaElement = null;
	let _oAudioContext = null;
	let _boostObject = null;
	function resume() {
		if (_oAudioContext && _oAudioContext.state === 'suspended') {
			_oAudioContext.resume().catch(reasonValue => log.logError(`[VolumeBoost] Failed to resume audio: ${reasonValue}`));
		}
	}
	function create() {
		if (_oAudioContext) {
			return true;
		}
		try {
			const context = new AudioContext();
			const source = context.createMediaElementSource(_oMediaElement);
			const amplifier = context.createGain();
			source.connect(amplifier);
			amplifier.connect(context.destination);
			_oAudioContext = context;
			_boostObject = amplifier;
			selectDevice(_oMediaElement.sinkId);
			log.logInfo('[VolumeBoost] Audio boost enabled');
			return true;
		} catch (exception) {
			log.logError(`[VolumeBoost] Failed to enable boost: ${exception}`);
			return false;
		}
	}
	function apply(mediaElement) {
		_oMediaElement = mediaElement;
		const volume = getVolume();
		const isMuted = settings.get('isMuted');
		const shouldAmplify = settings.get('volumeBoostEnabled') && volume > maxVolume;
		if (shouldAmplify) {
			create();
		}
		if (_boostObject) {
			// After connecting to Web Audio, gain is controlled by the amplifier.
			mediaElement.volume = 1;
			mediaElement.muted = false;
			_boostObject.gain.value = isMuted ? 0 : volume / maxVolume;
			resume();
			return;
		}
		mediaElement.volume = volume / maxVolume;
		mediaElement.muted = isMuted;
	}
	function selectDevice(idString) {
		if (!_oAudioContext || typeof idString !== 'string' || typeof _oAudioContext.setSinkId !== 'function') {
			return;
		}
		_oAudioContext.setSinkId(idString).catch(reasonValue => log.logError(`[VolumeBoost] Failed to select device: ${reasonValue}`));
	}
	function startInternal() {
		for (let eventName of [ 'pointerdown', 'keydown' ]) {
			document.addEventListener(eventName, resume, {
				capture: true,
				passive: true
			});
		}
	}
	return {
		apply,
		resume,
		selectDevice,
		startInternal
	};
})();

const player = TW5.player.playback.create();

const listModule = TW5.player.variants.create();

const converterModule = (() => {
	let _worker = null;
	let _lastLoadedNumber = -1;
	function convertNextSegment() {
		let removeNumber, deleteCount = 0;
		for (let segment, segmentIndex = 0; segment = globalQueue[segmentIndex]; ++segmentIndex) {
			if (segment.processingCount > processingLoaded) {
				continue;
			}
			if (segment.processingCount < processingLoaded) {
				break;
			}
			if (_lastLoadedNumber !== -1 && _lastLoadedNumber + 1 !== segment.number) {
				log.logError(`[Conversion] Segments not loaded between ${_lastLoadedNumber} and ${segment.number}`);
				segment.isGap = true;
			}
			_lastLoadedNumber = segment.number;
			if (typeof segment.dataValue == 'number' && _worker === null) {
				log.logInfo(`[Conversion] Skipping segment ${segment.number} State=${segment.dataValue}`);
				segment.processingCount = processingTransformed;
				if (segment.dataValue === streamStartState && !globalIsFmp4) {
					createWorker();
				}
			} else if (globalIsFmp4 && typeof segment.dataValue != 'number') {
				if (segment.isGap && (!globalFmp4InitBuffer || (globalFmp4Initialization && globalFmp4LoadedInitUrl !== globalFmp4Initialization.address))) {
					log.logInfo(`[Conversion] Waiting for fMP4 initialization segment for segment ${segment.number}`);
					loadFmp4Init();
					break;
				}
				log.logInfo(`[Conversion] fMP4 segment ${segment.number} without conversion`);
				const dataValue = {
					mediaSegmentData: segment.dataValue,
					hasVideo: globalFmp4HasVideo,
					hasAudio: globalFmp4HasAudio
				};
				if (segment.isGap) {
					dataValue.isInitSegment = globalFmp4InitBuffer;
					dataValue.codecString = globalFmp4Codecs;
				}
				segment.dataValue = dataValue;
				segment.processingCount = processingTransformed;
			} else {
				if (typeof segment.dataValue == 'number') {
					log.logInfo(`[Conversion] Sending segment ${segment.number} State=${segment.dataValue}`);
					_worker.postMessage(toWorkerSegment(segment));
				} else {
					debug.saveTransportStream(segment);
					stats.originalSegmentReceived();
					log.logInfo(`[Conversion] Sending segment ${segment.number}`);
					_worker.postMessage(toWorkerSegment(segment), [ segment.dataValue ]);
				}
				if (++deleteCount == 1) {
					removeNumber = segmentIndex;
				}
			}
		}
		if (deleteCount !== 0) {
			globalQueue.remove(removeNumber, deleteCount);
		}
		player.addNextSegment();
	}
	const { toWorkerSegment, fromWorkerSegment, fromWorkerData, getWorkerLogSeverityName } = TW5.player.workerAdapter;
	const handleConversionEnd = wrapErrors(event => {
		const dataModule = event.data;
		assert(Array.isArray(dataModule));
		switch (dataModule[0]) {
		  case 1:
			assert(dataModule.length === 2 && isObject(dataModule[1]));
			const workerSegment = fromWorkerSegment(dataModule[1]);
			const dataValue = fromWorkerData(workerSegment.dataValue);
			const segment = new segmentItem(processingTransformed, dataValue, workerSegment.duration, workerSegment.isGap, workerSegment.number);
			log.logInfo(`[Conversion] Segment received ${segment.number} ConvertedIn=${log.F0(segment.dataValue.conversionTime)}ms`);
			if (typeof segment.dataValue != 'number') {
				stats.convertedSegmentReceived(segment);
				if (!segment.dataValue.hasOwnProperty('mediaSegmentData')) {
					return;
				}
				debug.saveConvertedSegment(segment);
			}
			globalQueue.add(segment);
			player.addNextSegment();
			return;

		  case 2:
			const importance = dataModule[1], recordsString = dataModule[2];
			assert(dataModule.length === 3 && Array.isArray(importance) && Array.isArray(recordsString) && importance.length === recordsString.length);
			for (let yMarker = 0; yMarker < importance.length; ++yMarker) {
				const severityName = getWorkerLogSeverityName(importance[yMarker]);
				assert(typeof recordsString[yMarker] == 'string');
				log[severityName](recordsString[yMarker]);
			}
			return;

		  case 3:
			assert(dataModule.length === 3 && typeof dataModule[1] == 'string' && typeof dataModule[2] == 'object');
			debug.finishAndSendReport(dataModule[1], dataModule[2]);
			return;

		  case 4:
			assert(dataModule.length === 2 && typeof dataModule[1] == 'string');
			debug.finishAndShowMessage(dataModule[1]);
			return;

		  case 5:
			assert(dataModule.length === 2 && dataModule[1].byteLength);
			trashModule.discard(dataModule[1]);
			return;

		  default:
			assert(false);
		}
	});
	function handleConversionError(event) {
		debug.finishAndSendReport(`Event ${event.type} occurred in worker at line ${event.lineno}. ${event.message}`);
	}
	function createWorker() {
		log.logInfo('[Conversion] Creating worker');
		_worker = new Worker('/worker.js');
		_worker.addEventListener('message', handleConversionEnd);
		_worker.addEventListener('error', handleConversionError);
		_worker.addEventListener('messageerror', handleConversionError);
	}
	function stop() {
		_lastLoadedNumber = -1;
		globalIsFmp4 = false;
		globalFmp4Codecs = '';
		globalFmp4Initialization = null;
		globalFmp4InitBuffer = null;
		globalFmp4LoadedInitUrl = '';
		globalFmp4InitLoadCancellation = null;
		globalFmp4HasVideo = false;
		globalFmp4HasAudio = false;
		if (_worker) {
			log.logInfo('[Conversion] Terminating worker');
			_worker.terminate();
			_worker = null;
		}
	}
	return {
		stop,
		convertNextSegment
	};
})();

const loader = (() => {
	const MAX_ATTEMPTS = 2;
	function loadText(promiseCancellation, address, maxDuration, title, isLogging, headers = null, method = 'GET') {
		return load(promiseCancellation, method, address, maxDuration, headers, null, title, isLogging, 'text');
	}
	function loadJson(promiseCancellation, address, maxDuration, title, isLogging, headers = null, method = 'GET') {
		return load(promiseCancellation, method, address, maxDuration, headers, null, title, isLogging, 'json');
	}
	function load(promiseCancellation, method, address, maxDuration, headers, bodyValue, title, isLogging, dataType) {
		if (globalIsWorkFinished) {
			throw void 0;
		}
		assert(method === 'GET' || method === 'PUT' || method === 'DELETE' || method === 'POST');
		assert(typeof address == 'string');
		assert(Number.isFinite(maxDuration) && (maxDuration === 0 || maxDuration > 1e3));
		assert(bodyValue === null || method !== 'GET' && (bodyValue instanceof URLSearchParams || typeof bodyValue == 'string' && headers && isNonEmptyString(headers['Content-Type'])));
		assert(typeof headers == 'object' && typeof title == 'string' && typeof isLogging == 'boolean');
		assert(dataType === 'none' || dataType === 'text' || dataType === 'json' || Number.isFinite(dataType));
		if (promiseCancellation && promiseCancellation.isCancelled) {
			return Promise.reject(cancelPromise.reason);
		}
		log.logInfo(`[Loader] ${method} ${title} within ${log.F0(maxDuration)}ms`);
		Twitch.checkUrlAvailability(address);
		const request = new XMLHttpRequest();
		request._method = method;
		request._url = address;
		request._maxDuration = maxDuration;
		request._headers = headers;
		request._body = bodyValue;
		request._name = title;
		request._shouldLog = isLogging;
		request._dataType = dataType;
		request._attemptsLeft = typeof dataType == 'number' ? 1 : MAX_ATTEMPTS;
		request._requestSentAt = performance.now();
		request._responseWaitTimeout = NaN;
		request.addEventListener('timeout', handleError);
		request.addEventListener('error', handleError);
		request.addEventListener('abort', handleError);
		request.addEventListener('load', handleLoadEnd);
		if (isLogging && typeof dataType == 'number') {
			request.addEventListener('readystatechange', handleResponseReceived);
		}
		return new Promise((execute, reject) => {
			request._resolveCallback = execute;
			request._rejectCallback = reject;
			if (promiseCancellation) {
				request._promiseCancellation = promiseCancellation;
				promiseCancellation.replaceHandler(getPromiseCancelHandler(request));
			}
			sendRequest2(request, false);
		});
	}
	function sendRequest2(request, isRetry) {
		if (request._attemptsLeft === 0) {
			return false;
		}
		if (isRetry) {
			log.logError(`[Loader] Retrying load of ${request._name}`);
		}
		request._attemptsLeft--;
		request.open(request._method, request._url);
		request.responseType = typeof request._dataType == 'number' ? 'arraybuffer' : 'text';
		request.timeout = request._maxDuration;
		if (request._headers) {
			for (let heading of Object.keys(request._headers)) {
				request.setRequestHeader(heading, request._headers[heading]);
			}
		}
		if (request._body instanceof URLSearchParams) {
			request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
			request.send(request._body.toString());
		} else {
			request.send(request._body);
		}
		return true;
	}
	function getPromiseCancelHandler(request) {
		return () => {
			log.logInfo(`[Loader] Cancelling load of ${request._name} readyState=${request.readyState}`);
			request.removeEventListener('abort', handleError);
			request.abort();
			request._rejectCallback(cancelPromise.reason);
		};
	}
	const handleResponseReceived = wrapErrors(({target: request}) => {
		if (request.readyState >= XMLHttpRequest.HEADERS_RECEIVED) {
			request.removeEventListener('readystatechange', handleResponseReceived);
			assert(Number.isNaN(request._responseWaitTimeout));
			request._responseWaitTimeout = Math.round(performance.now() - request._requestSentAt);
		}
	});
	const handleError = wrapErrors(({target: request, type: eventType}) => {
		log.logError(`[Loader] Failed to load ${request._name}. Event ${eventType} occurred` + ` readyState=${request.readyState}` + (request._shouldLog && typeof request._dataType == 'number' ? ` ResponseWait=${request._responseWaitTimeout}ms` : ``));
		if (eventType === 'abort' || !sendRequest2(request, true)) {
			if (request.responseType === 'arraybuffer') {
				stats.segmentLoaded(NaN, NaN, NaN, request._responseWaitTimeout);
			}
			request._promiseCancellation && request._promiseCancellation.replaceHandler(null);
			request._rejectCallback(`Event ${eventType} occurred`);
		}
	});
	const handleLoadEnd = wrapErrors(({target: request}) => {
		assert(request.readyState === XMLHttpRequest.DONE);
		const code = request.status;
		if (code >= 200 && code <= 299 && (request._dataType === 'none' || request.response !== null)) {
			const loadDurationMs = Math.round(performance.now() - request._requestSentAt);
			request._promiseCancellation && request._promiseCancellation.replaceHandler(null);
			log.logInfo(`[Loader] Loaded ${request._name} in ${loadDurationMs}ms` + (request._shouldLog && typeof request._dataType == 'number' ? ` ResponseWait=${request._responseWaitTimeout}ms` : ``) + (typeof request._dataType == 'number' ? ` Ratio=${log.F1(loadDurationMs / request._dataType / 1e3)}` : ``) + (code === 200 ? `` : ` Code=${code} ${request.statusText}`) + (request._dataType === 'none' ? '' : request._shouldLog && isNonEmptyString(request.response) ? `\n${request.response}` : request.responseType === 'arraybuffer' ? ` Size=${request.response.byteLength}bytes` : ` Size=${request.response.length}chars`));
			if (request._maxDuration !== 0) {
				stats.someDataDownloaded(getResponseSize(request));
			}
			switch (request._dataType) {
			  case 'none':
				request._resolveCallback();
				break;

			  case 'text':
				request._resolveCallback(request.response);
				break;

			  case 'json':
				try {
					request._resolveCallback(JSON.parse(request.response));
				} catch (exception) {
					log.logError(`[Loader] Failed to parse ${request._name}. ${exception}`);
					request._rejectCallback('Failed to parse JSON');
				}
				break;

			  default:
				stats.segmentLoaded(request.response.byteLength, request._dataType, loadDurationMs, request._responseWaitTimeout);
				request._resolveCallback(request.response);
			}
		} else {
			log.logError(`[Loader] Failed to load ${request._name}. ${responseCode + code} ${request.statusText}` + (request._shouldLog && typeof request._dataType == 'number' ? ` ResponseWait=${request._responseWaitTimeout}ms` : ``) + (isNonEmptyString(request.response) ? `\n${request.response}` : request.response === null ? ' response=null' : request.responseType === 'arraybuffer' ? ` Size=${request.response.byteLength}bytes` : ` Size=${request.response.length}chars`));
			if (code >= 400 && code <= 499 || request.response === null || !sendRequest2(request, true)) {
				if (request.responseType === 'arraybuffer') {
					stats.segmentLoaded(NaN, NaN, NaN, request._responseWaitTimeout);
				}
				request._promiseCancellation && request._promiseCancellation.replaceHandler(null);
				request._rejectCallback(responseCode + code);
			}
		}
	});
	function getResponseSize(request) {
		let headersSizeKb = 17 + request.statusText.length + request.getAllResponseHeaders().length;
		if (isHTTP2(request)) {
			headersSizeKb = Math.round(headersSizeKb * .5);
		}
		let bodySizeBytes;
		let heading = request.getResponseHeader('Content-Length');
		if (heading) {
			bodySizeBytes = Number.parseInt(heading, 10);
		} else if (request.responseType === 'arraybuffer') {
			bodySizeBytes = request.response.byteLength;
		} else {
			bodySizeBytes = request.response.length;
			heading = request.getResponseHeader('Content-Encoding');
			if (heading && heading !== 'identity') {
				bodySizeBytes = Math.round(bodySizeBytes * .35);
			}
		}
		return headersSizeKb + bodySizeBytes;
	}
	function isHTTP2(request) {
		return request.statusText.length === 0;
	}
	function loadNextSegment() {
		let counter = globalQueue.length - 1;
		if (counter >= 0 && globalQueue[counter].dataValue === variantChangeState && globalQueue[counter].processingCount === processingLoaded) {
			globalQueue.showState();
			while (--counter >= 0 && globalQueue[counter].processingCount <= processingLoaded) {
				if (typeof globalQueue[counter].dataValue != 'number') {
					globalQueue.remove(counter);
				}
			}
			globalQueue.showState();
		} else {
			let concurrentLoadCount = settings.get('concurrentLoadCount');
			let allLoadsDuration = 0;
			for (let segment of globalQueue) {
				if (segment.processingCount <= processingLoaded) {
					allLoadsDuration += segment.duration;
					if (segment.processingCount <= processingLoading) {
						--concurrentLoadCount;
						if (segment.processingCount === processingAwaitingLoad && concurrentLoadCount >= 0) {
							loadSegment(segment);
						}
					}
				}
			}
			const queueOverflow = settings.get('maxBufferSizeSetting') + settings.get('bufferStretchMs');
			if (allLoadsDuration > queueOverflow) {
				log.logError(`[Loader] Total duration of queued loads ${log.F1(allLoadsDuration)}s > ${log.F1(queueOverflow)}s`);
				handleSegmentLoadFailure(null);
				loadNextSegment();
				return;
			}
		}
		converterModule.convertNextSegment();
	}
	function loadSegment(segment) {
		const address = segment.dataValue;
		segment.dataValue = new cancelPromise();
		segment.processingCount = processingLoading;
		load(segment.dataValue, 'GET', address, segmentLoadTimeout(segment), null, null, `segment ${segment.number}`, stats.isWindowOpen(), segment.duration).then(bufferData => {
			assert(globalQueue.includes(segment));
			segment.dataValue = bufferData;
			segment.processingCount = processingLoaded;
			loadNextSegment();
		}).catch(wrapErrors(reasonValue => {
			if (typeof reasonValue == 'string' && segment.processingCount === processingLoading) {
				assert(globalQueue.includes(segment));
				handleSegmentLoadFailure(reasonValue.reasonText === responseCode + 404 || reasonValue.reasonText === responseCode + 410 ? null : segment);
				assert(!globalQueue.includes(segment));
				loadNextSegment();
			} else if (reasonValue === cancelPromise.reason) {
				log.logInfo(`[Loader] Segment ${segment.number} load cancelled`);
				assert(!globalQueue.includes(segment));
			} else {
				throw reasonValue;
			}
		}));
	}
	function segmentLoadTimeout(segment) {
		const variable = segment.duration * settings.get('concurrentLoadCount') * 1.15;
		const constant = 8;
		return (variable + constant) * 1e3;
	}
	function handleSegmentLoadFailure(unloadedSegmentObj) {
		globalQueue.showState();
		const queuedCount = globalQueue.length;
		if (unloadedSegmentObj) {
			globalQueue.remove(unloadedSegmentObj);
		} else {
			let bufferSize = settings.get('bufferSize');
			for (let segment, yMarker = queuedCount; segment = globalQueue[--yMarker]; ) {
				if (segment.processingCount === processingAwaitingLoad) {
					if (bufferSize > 0) {
						bufferSize -= segment.duration;
					} else {
						globalQueue.remove(yMarker);
					}
				} else if (segment.processingCount === processingLoading) {
					globalQueue.remove(yMarker);
				}
			}
		}
		globalQueue.showState();
		stats.segmentsNotLoaded(queuedCount - globalQueue.length);
	}
	const handleNetworkChange = wrapErrors(event => {
		log.logError(`[Loader] Event ${event.type} navigator.onLine=${navigator.onLine} connection.type=${navigator.connection && navigator.connection.type}`);
	});
	if (navigator.connection) {
		navigator.connection.addEventListener('onchange' in navigator.connection ? 'change' : 'typechange', handleNetworkChange);
	} else {
		window.addEventListener('online', handleNetworkChange);
		window.addEventListener('offline', handleNetworkChange);
	}
	if (!navigator.onLine) {
		log.logError('[Loader] navigator.onLine=false');
	}
	return {
		load,
		loadText,
		loadJson,
		loadNextSegment
	};
})();

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