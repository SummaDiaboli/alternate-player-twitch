// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
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

	TW5.player = TW5.player || {};
	TW5.player.stats = { create };
})();
