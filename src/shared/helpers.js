// @ts-nocheck: checked after the module split.
'use strict';

const isContentScript = !document.currentScript;

const urlNoRedirect = 'twitch5=0';

const leftButton = 0;

const middleButton = 1;

const RIGHT_BUTTON = 2;

const leftButtonPressed = 1;

const RIGHT_BUTTON_PRESSED = 2;

const MIDDLE_BUTTON_PRESSED = 4;

const passiveHandler = {
	passive: true
};

const minSettingValue = Number.MIN_SAFE_INTEGER + 1e3;

const maxSettingValue = Number.MAX_SAFE_INTEGER - 1e3;

const autoTune = Number.MIN_SAFE_INTEGER;

const minVolume = 1;

const maxVolume = 100;

const maxAmplifiedVolume = 200;

const volumeUpKeyStep = 4;

const volumeDownKeyStep = 2;

const chatUnloaded = 0;

const chatHidden = 1;

const chatPanel = 2;

const topSide = 1;

const rightSide = 2;

const bottomSide = 3;

const leftSide = 4;

const minRepeatDuration = 30;

const maxRepeatDuration = 300;

const minBufferSize = 1.5;

const maxBufferSize = 30;

const minBufferStretch = 9;

const maxBufferStretch = 30;

const bufferOverflow = maxBufferSize + maxBufferStretch;

if (!NodeList.prototype[Symbol.iterator]) {
	NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

if (!HTMLCollection.prototype[Symbol.iterator]) {
	HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

if (!isContentScript && !window.PointerEvent) {
	const scriptElement = document.createElement('script');
	scriptElement.src = 'vendor/pointerevent.js';
	document.currentScript.parentNode.appendChild(scriptElement);
}

const placeholder = () => {};

function assert(conditionValue) {
	if (!conditionValue) {
		throw new Error('Assertion failed');
	}
}

function wrapErrors(callbackFunction) {
	return function() {
		if (globalIsWorkFinished) {
			return;
		}
		try {
			return callbackFunction.apply(this, arguments);
		} catch (exception) {
			debug.exceptionCaught(exception);
		}
	};
}

function convertExceptionToString(exception) {
	return exception instanceof Error ? exception.stack : `[typeof ${typeof exception}] ${new Error(exception).stack}`;
}

function type(value) {
	return value === null ? 'null' : typeof value;
}

function thisNumber(value) {
	return typeof value == 'number' && value == value;
}

function isObject(value) {
	return typeof value == 'object' && value !== null;
}

function isNonEmptyString(value) {
	return typeof value == 'string' && value !== '';
}

function clampStringLength(stringValue, maxLength) {
	return stringValue.length <= maxLength ? stringValue : `${stringValue.slice(0, maxLength)}---8<---${stringValue.length - maxLength}`;
}

function getBrowserEngineVersion() {
	if (!getBrowserEngineVersion._resultCode) {
		if (navigator.userAgentData) {
			for (const {brand, version} of navigator.userAgentData.brands) {
				if (brand === 'Chromium' || brand === 'Google Chrome') {
					getBrowserEngineVersion._resultCode = Number.parseInt(version, 10);
					break;
				}
			}
		}
		if (!getBrowserEngineVersion._resultCode) {
			getBrowserEngineVersion._resultCode = Number(/Chrome\/(\d+)/.exec(navigator.userAgent)[1]);
		}
	}
	return getBrowserEngineVersion._resultCode;
}

function isMobileDevice() {
	if (!isMobileDevice.hasOwnProperty('_result')) {
		isMobileDevice._result = navigator.userAgentData ? navigator.userAgentData.mobile : navigator.userAgent.includes('Android');
	}
	return isMobileDevice._result;
}

function element(elementValue) {
	const elementItem = typeof elementValue == 'string' ? document.getElementById(elementValue) : elementValue;
	assert(elementItem.nodeType === 1);
	return elementItem;
}

function createGqlRequestBody(requestText, variables) {
	assert(isNonEmptyString(requestText) && isObject(variables));
	return `{"query":${JSON.stringify(requestText)},"variables":${JSON.stringify(variables)}}`;
}

function mergeGqlRequests(requestBodies) {
	assert(requestBodies[0][0] === '{');
	return `[${requestBodies.join(',')}]`;
}

function getPlayerUrl(channelCode) {
	const parameters = '?channel=' + encodeURIComponent(channelCode);
	return chrome.runtime.getURL('player.html') + parameters;
}



TW5.helpers = {
	isContentScript, urlNoRedirect, leftButton, middleButton, RIGHT_BUTTON,
	leftButtonPressed, RIGHT_BUTTON_PRESSED, MIDDLE_BUTTON_PRESSED, passiveHandler,
	minSettingValue, maxSettingValue, autoTune, minVolume, maxVolume,
	maxAmplifiedVolume, volumeUpKeyStep, volumeDownKeyStep, chatUnloaded,
	chatHidden, chatPanel, topSide, rightSide, bottomSide, leftSide,
	minRepeatDuration, maxRepeatDuration, minBufferSize, maxBufferSize,
	minBufferStretch, maxBufferStretch, bufferOverflow, placeholder, assert,
	wrapErrors, convertExceptionToString, type, thisNumber, isObject,
	isNonEmptyString, clampStringLength, getBrowserEngineVersion, isMobileDevice,
	element, createGqlRequestBody, mergeGqlRequests, getPlayerUrl
};
