// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
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

	TW5.player = TW5.player || {};
	TW5.player.loader = { create };
})();
