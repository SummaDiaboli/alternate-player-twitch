// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
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

	TW5.player = TW5.player || {};
	TW5.player.debug = { create };
})();
