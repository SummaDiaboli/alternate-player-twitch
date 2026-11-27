// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		const VIDEO_REMOVAL_INTERVAL = 10;
		const bufferExhausted = 1 / 25 * 7;
		const REPLAY_AVAILABLE_IF_WATCHED = 1;
		const assertSegmentAdded = -1;
		const assertPlaybackStarted = -2;
		const assertPlayback = -3;
		const ASSERT_PLAYBACK_STOP = -4;
		const playbackImpossible = 0;
		const playbackPossible = 1;
		const playbackPossibleAfterSeek = 2;
		let _oMediaElement;
		let _oMediaSource;
		let _oMediaSourceBuffer = null;
		let _hasVideoTrack = false;
		let _playbackStarted = 0;
		let _isAsyncOperation = false;
		let _bufferSizeString = 'playbackStartMs';
		let _shouldWaitForBufferFill = true;
		let _streamOffsetMs = NaN;
		let _needsSeek = false;
		const _liveStream = {
			handleSourceOpen() {
				assert(_oMediaElement.paused);
				_playbackStarted = Math.max(_playbackStarted, 1);
				addNextSegment();
			},
			handleProgress() {
				if (!_isAsyncOperation) {
					startPlayback(assertPlaybackPosition(assertSegmentAdded));
				}
			},
			handleWaiting() {},
			handlePlaying() {
				if (control.getState() === playbackStartState && !_oMediaElement.paused) {
					control.setState(playbackState);
				}
			},
			handleSeeking: placeholder,
			handleSeeked: startPlayback,
			handleEnded() {
				reloadPlayer(loadingState);
			},
			handleTimeUpdate() {
				if (!_oMediaElement.seeking && !_oMediaElement.paused && !_oMediaElement.ended) {
					assertPlaybackPosition(assertPlayback);
				}
			}
		};
		const _repeat = {
			isPaused: true,
			handleSourceOpen() {
				assert(_oMediaElement.paused);
				_playbackStarted = Math.max(_playbackStarted, 1);
			},
			handleProgress: placeholder,
			handleWaiting: placeholder,
			handlePlaying: placeholder,
			handleSeeked: placeholder,
			handleSeeking() {
				scale.setWatched(_oMediaElement.currentTime);
			},
			handleEnded() {
				if (!this.isPaused) {
					_oMediaElement.play();
				}
			},
			handleTimeUpdate() {
				if (!this.isPaused && !_oMediaElement.seeking) {
					this.assertPlaybackPosition(assertPlayback);
				}
				scale.setWatched(_oMediaElement.currentTime);
			},
			assertPlaybackPosition(time) {
				assert(Number.isFinite(time));
				assert(time === assertPlaybackStarted || time === assertPlayback || time >= 0);
				const buffer = _oMediaElement.buffered;
				const lastArea = buffer.length - 1;
				const currentTime = _oMediaElement.currentTime + 1e-4;
				let seekToTime = time >= 0 ? time : currentTime;
				let seekReason = '';
				for (let shouldStartFromBeginning = false; ;) {
					let requiredForPlaybackCount = time === assertPlayback ? bufferExhausted : minBufferSize;
					for (let areaIndex = 0; areaIndex <= lastArea; ++areaIndex) {
						if (seekToTime < buffer.start(areaIndex)) {
							requiredForPlaybackCount = minBufferSize;
							seekReason += 'Jumping over gap. ';
							seekToTime = buffer.start(areaIndex);
						}
						if (buffer.end(areaIndex) - seekToTime >= requiredForPlaybackCount) {
							break;
						}
					}
					if (this.isPaused || seekToTime < scale.getEnd()) {
						break;
					}
					if (shouldStartFromBeginning) {
						showState('logError', `Infinite seek Time=${time}`);
						return;
					}
					seekToTime = scale.getStart();
					seekReason += 'Starting over. ';
					shouldStartFromBeginning = true;
				}
				if (seekToTime !== currentTime) {
					showState('logOk', `${seekReason}Seeking to ${seekToTime}`);
					_oMediaElement.currentTime = seekToTime;
				}
			}
		};
		let _behavior = _liveStream;
		function showState(importanceName, record) {
			const buffer = _oMediaSource.sourceBuffers.length !== 0 ? _oMediaSource.sourceBuffers[0] : null;
			const bufferRangesString = convertRangesToString(buffer ? buffer.buffered : null);
			const rangesString = convertRangesToString(_oMediaElement.buffered);
			const isRangesEqual = bufferRangesString === rangesString;
			if (importanceName === 'logInfo' && (buffer && buffer.buffered.length > 1 || _oMediaElement.buffered.length > 1)) {
				importanceName = 'logOk';
			}
			if (_oMediaElement.error || !isRangesEqual) {
				importanceName = 'logError';
			}
			log[importanceName](`${record.charAt(0) === '[' ? '' : '[Player] '}${record} •••` + (buffer && buffer.updating ? ' [U]' : '') + (_oMediaElement.paused ? ' [P]' : '') + (_oMediaElement.seeking ? ' [S]' : '') + (_oMediaElement.ended ? ' [E]' : '') + (_oMediaElement.error ? ` error=${_oMediaElement.error.code}` : '') + (_oMediaElement.src.startsWith('blob:') || _oMediaElement.src.startsWith('mediasource:') ? '' : ` src=${_oMediaElement.src}`) + (_oMediaSource.readyState === 'open' ? '' : ` MSE.readyState=${_oMediaSource.readyState}`) + (_oMediaSource.sourceBuffers.length === 1 ? '' : ` MSE.buffers=${_oMediaSource.sourceBuffers.length}`) + (_oMediaElement.networkState === HTMLMediaElement.NETWORK_LOADING ? '' : ` networkState=${_oMediaElement.networkState}`) + ` readyState=${_oMediaElement.readyState}` + ` currentTime=${_oMediaElement.currentTime}` + (isRangesEqual ? ` buffered=${rangesString}` : ` MSE.buffered=${bufferRangesString} buffered=${rangesString}`) + (_oMediaElement.duration === Infinity ? '' : ` duration=${_oMediaElement.duration}`) + ` seekable=${convertRangesToString(_oMediaElement.seekable)}` + ` played=${convertRangesToString(_oMediaElement.played)}`);
		}
		function convertRangesToString(regions) {
			let resultText = '';
			if (regions && regions.length !== 0) {
				let areaIndex = Math.max(regions.length - 5, 0);
				if (areaIndex !== 0) {
					resultText = `[${areaIndex}]`;
				}
				for (;areaIndex < regions.length; ++areaIndex) {
					if (areaIndex !== 0) {
						resultText += `(${(regions.start(areaIndex) - regions.end(areaIndex - 1)).toFixed(3)})`;
					}
					resultText += `${regions.start(areaIndex)}-${regions.end(areaIndex)}`;
				}
			}
			return resultText;
		}
		function getBufferFill(buffer = _oMediaElement.buffered) {
			let watchedCount = 0;
			let unwatchedCount = 0;
			if (buffer.length !== 0) {
				const startTime = buffer.start(0);
				const endTime = buffer.end(buffer.length - 1);
				const currentTime = limit(_oMediaElement.currentTime, startTime, endTime);
				watchedCount = currentTime - startTime;
				unwatchedCount = endTime - currentTime;
			}
			return {
				watchedCount,
				unwatchedCount
			};
		}
		function getDroppedFrameCount() {
			return _oMediaElement.getVideoPlaybackQuality ? _oMediaElement.getVideoPlaybackQuality() : {
				totalVideoFrames: _oMediaElement.webkitDecodedFrameCount,
				droppedVideoFrames: _oMediaElement.webkitDroppedFrameCount
			};
		}
		function getStreamPlaybackPosition(isForClip) {
			if (Number.isNaN(_streamOffsetMs)) {
				return -1;
			}
			watchErrors();
			let positionNumber = _oMediaElement.currentTime;
			if (isForClip && control.getState() === repeatState) {
				positionNumber = scale.getEnd();
			}
			if (!isForClip && positionNumber === 0 && _oMediaSourceBuffer !== null) {
				if (_oMediaSourceBuffer.buffered.length !== 0) {
					positionNumber = _oMediaSourceBuffer.buffered.start(0);
				}
			}
			return positionNumber === 0 ? -1 : Math.max(positionNumber + _streamOffsetMs, 0);
		}
		function calculateStreamOffset(segment) {
			if (Number.isFinite(segment.dataValue.encodePositionMs) && Number.isFinite(segment.dataValue.streamPosition)) {
				const streamOffset = segment.dataValue.streamPosition - segment.dataValue.encodePositionMs;
				log[Math.abs(streamOffset - _streamOffsetMs) > 2 ? 'logError' : 'logInfo'](`[Player] Stream offset: ${log.F1(streamOffset)}s`);
				_streamOffsetMs = streamOffset;
			}
		}
		function showStreamDelay(segment) {
			if (stats.isWindowOpen() && Number.isFinite(segment.dataValue.encodePositionMs) && Number.isFinite(segment.dataValue.encodingTime) && _oMediaElement.currentTime !== 0) {
				const receiveTime = (performance.now() + globalExactTimeMs - segment.dataValue.encodingTime) / 1e3;
				const playbackTime = segment.dataValue.encodePositionMs - _oMediaElement.currentTime;
				const delayString = `${receiveTime.toFixed(1)} + ${playbackTime.toFixed(1)} = ${(receiveTime + playbackTime).toFixed(1)}`;
				log[receiveTime > 0 && playbackTime > -.1 ? 'logInfo' : 'logError'](`[Player] Stream delay: ${delayString}s`);
				element('stats-stream-delay').textContent = delayString;
			}
		}
		function applyVolume() {
			if (_oMediaElement) {
				volumeBoostModule.apply(_oMediaElement);
			}
		}
		function reloadAndWaitForBuffer(newStateNumber) {
			_shouldWaitForBufferFill = true;
			reloadPlayer(newStateNumber);
		}
		function reloadPlayer(newStateNumber) {
			showState('logOk', 'Reloading player');
			control.setState(newStateNumber);
			_behavior = _liveStream;
			_oMediaSourceBuffer = null;
			_needsSeek = false;
			createMediaSource();
			connectMediaSourceToMediaElement();
		}
		function watchErrors() {
			if (_oMediaElement.error) {
				debug.finishAndShowMessage('J0206');
			}
		}
		const watchMediaSourceEvents = wrapErrors(event => {
			watchErrors();
			const record = `[MediaSource] ${event.type}`;
			switch (event.type) {
			  case 'sourceopen':
				showState('logInfo', record);
				_behavior.handleSourceOpen();
				break;
	
			  case 'sourceended':
			  case 'sourceclose':
				showState('logInfo', record);
				break;
	
			  default:
				log.logInfo(record);
			}
		});
		const watchMediaElementEvents = wrapErrors(event => {
			watchErrors();
			const record = `[MediaElement] ${event.type}`;
			switch (event.type) {
			  case 'loadstart':
				showState('logInfo', `${record} src=${_oMediaElement.src} currentSrc=${_oMediaElement.currentSrc}`);
				break;
	
			  case 'progress':
				showState('logInfo', record);
				_behavior.handleProgress();
				break;
	
			  case 'abort':
				showState('logInfo', record);
				break;
	
			  case 'waiting':
				showState('logOk', record);
				_behavior.handleWaiting();
				break;
	
			  case 'playing':
				showState('logInfo', record);
				_behavior.handlePlaying();
				break;
	
			  case 'seeking':
				showState('logInfo', record);
				_behavior.handleSeeking();
				break;
	
			  case 'seeked':
				showState('logInfo', record);
				_behavior.handleSeeked();
				break;
	
			  case 'ended':
				showState('logInfo', record);
				_behavior.handleEnded();
				break;
	
			  case 'timeupdate':
				log.logInfo(`${record} readyState=${_oMediaElement.readyState} currentTime=${_oMediaElement.currentTime} Unwatched=${log.F2(getBufferFill().unwatchedCount)}`);
				_behavior.handleTimeUpdate();
				break;
	
			  default:
				log.logInfo(record);
			}
		});
		function assertPlaybackPosition(checkSourceId, willBeAddedCount = 0) {
			const buffer = _oMediaElement.buffered;
			const lastArea = buffer.length - 1;
			if (lastArea === -1) {
				return false;
			}
			const currentTime = _oMediaElement.currentTime + 1e-4;
			let seekToTime = Math.max(currentTime, buffer.start(0));
			let seekReason = '';
			const unwatchedCount = buffer.end(lastArea) - seekToTime;
			if (checkSourceId === assertSegmentAdded) {
				const bufferSize = settings.get('maxBufferSizeSetting');
				const overflowAmount = bufferSize + settings.get('bufferStretchMs');
				if (unwatchedCount <= overflowAmount) {
					return;
				}
				if (_playbackStarted === 2) {
					events.sendEvent('player-buffer-overflow', unwatchedCount - bufferSize);
				}
				seekReason += `Player buffer overflow ${unwatchedCount.toFixed(2)}s > ${overflowAmount}s. `;
				seekToTime = buffer.end(lastArea) - bufferSize - .1;
			}
			if (checkSourceId === assertPlaybackStarted && _playbackStarted !== 2) {
				_playbackStarted = 2;
				const overflowAmount = settings.get('maxBufferSizeSetting') + stats.getTargetDuration() / 2;
				if (unwatchedCount > overflowAmount) {
					seekReason += `Stream delay exceeded ${unwatchedCount.toFixed(2)}s > ${overflowAmount}s. `;
					seekToTime = buffer.end(lastArea) - overflowAmount;
				}
			}
			assert(bufferExhausted < minBufferSize);
			let requiredForPlaybackCount = checkSourceId === assertPlayback ? bufferExhausted : checkSourceId === ASSERT_PLAYBACK_STOP ? Infinity : minBufferSize;
			let canPlay = _oMediaSource.readyState === 'ended';
			let remainingInRegionMs;
			for (let areaIndex = 0; areaIndex <= lastArea; ++areaIndex) {
				if (seekToTime < buffer.start(areaIndex)) {
					requiredForPlaybackCount = minBufferSize;
					seekReason += 'Jumping over gap. ';
					seekToTime = buffer.start(areaIndex);
				}
				remainingInRegionMs = buffer.end(areaIndex) - seekToTime;
				if (remainingInRegionMs >= requiredForPlaybackCount) {
					canPlay = true;
					break;
				}
			}
			if (!canPlay && !_oMediaElement.paused) {
				bufferExhausted2(remainingInRegionMs, unwatchedCount, willBeAddedCount);
			}
			if ((canPlay || checkSourceId === assertSegmentAdded) && (seekToTime !== currentTime || _needsSeek)) {
				if (seekToTime === currentTime) {
					seekToTime = _oMediaElement.currentTime;
				}
				showState(seekReason ? 'logError' : 'logOk', `${seekReason}Seeking to ${seekToTime}`);
				_needsSeek = false;
				_oMediaElement.currentTime = seekToTime;
				return playbackPossibleAfterSeek;
			}
			return canPlay ? playbackPossible : playbackImpossible;
		}
		function startPlayback(checkCount) {
			if (_oMediaElement.seeking || checkCount === playbackPossibleAfterSeek || !_oMediaElement.paused || _oMediaElement.ended) {
				return;
			}
			if (_shouldWaitForBufferFill && _oMediaSource.readyState !== 'ended') {
				const {unwatchedCount} = getBufferFill();
				const bufferSize = settings.get(_bufferSizeString);
				if (unwatchedCount < bufferSize) {
					log.logInfo(`[Player] Unwatched in buffer ${log.F3(unwatchedCount)}s < ${bufferSize}s`);
					return;
				}
				log.logOk(`[Player] Unwatched in buffer ${log.F3(unwatchedCount)}s >= ${bufferSize}s`);
			} else {
				log.logOk('[Player] No need to wait for buffer fill');
			}
			switch (assertPlaybackPosition(assertPlaybackStarted)) {
			  case playbackImpossible:
				showState('logError', `No region >= ${minBufferSize}s found for playback start`);
				_shouldWaitForBufferFill = true;
				break;
	
			  case playbackPossible:
				showState('logOk', 'Playback started');
				_shouldWaitForBufferFill = true;
				_oMediaElement.play();
				control.setState(playbackStartState);
			}
		}
		function stopPlayback(newStateNumber) {
			if (newStateNumber !== void 0) {
				control.setState(newStateNumber);
			}
			_oMediaElement.pause();
		}
		function bufferExhausted2(lastRangeRemaining, unwatchedCount, willBeAddedCount) {
			assert(_oMediaSource.readyState !== 'ended');
			assert(lastRangeRemaining < minBufferSize);
			const isEarly = unwatchedCount > 1;
			stats.playerBufferExhausted(isEarly);
			_bufferSizeString = 'maxBufferSizeSetting';
			const bufferSize = settings.get(_bufferSizeString);
			if (lastRangeRemaining + willBeAddedCount >= minBufferSize && unwatchedCount + willBeAddedCount >= bufferSize) {
				showState(isEarly ? 'logError' : 'logOk', `Buffer exhausted, no stop needed WillBeAdded=${log.F3(willBeAddedCount)}s ToEndOfLastRegion=${log.F3(lastRangeRemaining)}s Unwatched=${log.F3(unwatchedCount)}s BufferSize=${bufferSize}s`);
			} else {
				showState(isEarly ? 'logError' : 'logOk', `Pausing playback to fill buffer ToEndOfLastRegion=${log.F3(lastRangeRemaining)}s Unwatched=${log.F3(unwatchedCount)}s BufferSize=${bufferSize}s`);
				_needsSeek = true;
				stopPlayback(loadingState);
			}
		}
		function terminateStream(segment) {
			showState('logOk', `Segment ${segment.number} triggered stream end`);
			if (_oMediaElement.buffered.length === 0 || _oMediaElement.paused && getBufferFill().unwatchedCount < bufferExhausted + .1) {
				reloadAndWaitForBuffer(loadingState);
			} else {
				_shouldWaitForBufferFill = typeof segment.dataValue == 'number' || !_oMediaElement.seeking && _oMediaElement.paused;
				_oMediaSource.endOfStream();
				startPlayback();
			}
		}
		function removeWatchedVideo(segment) {
			const MAX_AUDIO_REPLAY_DURATION = 640;
			watchErrors();
			let replayDurationMs = settings.get('replayDuration2');
			if (replayDurationMs === autoTune) {
				if (_hasVideoTrack) {
					return Promise.resolve(segment);
				}
				replayDurationMs = MAX_AUDIO_REPLAY_DURATION;
			}
			const {watchedCount} = getBufferFill(_oMediaSourceBuffer.buffered);
			if (watchedCount < replayDurationMs + VIDEO_REMOVAL_INTERVAL) {
				return Promise.resolve(segment);
			}
			const removeBefore = _oMediaElement.currentTime - replayDurationMs;
			return new Promise((execute, reject) => {
				showState('logInfo', `Removing watched video Watched=${log.F3(watchedCount)}s RemoveBefore=${log.F3(removeBefore)}s`);
				_oMediaSourceBuffer.addEventListener('updateend', removed);
				let elapsedTimeMs = -performance.now();
				_oMediaSourceBuffer.remove(0, removeBefore);
				function removed() {
					try {
						if (_oMediaSourceBuffer === null) {
							reject(cancelPromise.reason);
						} else {
							elapsedTimeMs += performance.now();
							_oMediaSourceBuffer.removeEventListener('updateend', removed);
							const {watchedCount} = getBufferFill(_oMediaSourceBuffer.buffered);
							showState(elapsedTimeMs > 100 || watchedCount < minBufferSize ? 'logError' : 'logInfo', `Watched video removed in ${log.F0(elapsedTimeMs)}ms Watched=${log.F0(watchedCount)}s`);
							execute(segment);
						}
					} catch (exception) {
						reject(exception);
					}
				}
			});
		}
		function addInitializationSegment(segment) {
			return addSegment(segment, segment.dataValue.isInitSegment, 'initialization segment');
		}
		function addMediaSegment(segment) {
			return addSegment(segment, segment.dataValue.mediaSegmentData, 'media-segment');
		}
		function addSegment(segment, maybeAdd, addString) {
			watchErrors();
			return new Promise((execute, reject) => {
				showState('logInfo', `Adding ${addString} ${segment.number}`);
				_oMediaSourceBuffer.addEventListener('updateend', added);
				let elapsedTimeMs = -performance.now();
				_oMediaSourceBuffer.appendBuffer(maybeAdd);
				function added() {
					try {
						if (_oMediaSourceBuffer === null) {
							reject(cancelPromise.reason);
						} else {
							elapsedTimeMs += performance.now();
							_oMediaSourceBuffer.removeEventListener('updateend', added);
							showState(elapsedTimeMs > 100 ? 'logError' : 'logInfo', `Added ${addString} ${segment.number} in ${log.F0(elapsedTimeMs)}ms`);
							execute(segment);
						}
					} catch (exception) {
						reject(exception);
					}
				}
			});
		}
		function assertBufferExhaustion(segment) {
			if (!_oMediaElement.seeking && !_oMediaElement.paused && !_oMediaElement.ended) {
				assertPlaybackPosition(assertPlayback, segment.duration);
			}
			if (_oMediaElement.played.length !== 0) {
				stats.updateBufferFullness(getBufferFill().unwatchedCount);
			}
			return segment;
		}
		function wasSegmentAdded(segment) {
			_isAsyncOperation = false;
			globalQueue.remove(segment);
			calculateStreamOffset(segment);
			if (!(globalQueue[0] && globalQueue[0].dataValue === repeatState)) {
				const checkCount = assertPlaybackPosition(assertSegmentAdded);
				if (!(globalQueue[0] && globalQueue[0].processingCount === processingTransformed)) {
					startPlayback(checkCount);
					showStreamDelay(segment);
				}
			}
			addNextSegment();
		}
		const wasSegmentNotAdded = wrapErrors(reasonValue => {
			_isAsyncOperation = false;
			if (reasonValue === 'SEGMENT_ADDITION_DEFERRED') {
				return;
			}
			if (reasonValue === cancelPromise.reason) {
				log.logInfo('[Player] Segment addition cancelled');
			} else {
				throw reasonValue;
			}
		});
		function preventQueueOverflow() {
			const {duration} = globalQueue.countConvertedSegments();
			if (duration >= bufferOverflow) {
				log.logError(`[Player] MediaSource closed for too long ${duration}s >= ${bufferOverflow}s`);
				assert(control.getState() === launchState || control.getState() === streamStartState);
				control.stopWatchingStream();
			}
		}
		function findAndHandleStreamVariantChange() {
			for (let yMarker = globalQueue.length; --yMarker >= 0; ) {
				if (globalQueue[yMarker].dataValue === variantChangeState && globalQueue[yMarker].processingCount === processingTransformed) {
					globalQueue.showState();
					do {
						if (globalQueue[yMarker].dataValue === variantChangeState || typeof globalQueue[yMarker].dataValue != 'number') {
							globalQueue.remove(yMarker);
						}
					} while (--yMarker >= 0);
					globalQueue.showState();
					reloadAndWaitForBuffer(loadingState);
					break;
				}
			}
		}
		function addNextSegment() {
			watchErrors();
			findAndHandleStreamVariantChange();
			const segment = globalQueue[0];
			if (!segment || segment.processingCount !== processingTransformed) {
				return;
			}
			assert(_behavior === _liveStream);
			if (segment.dataValue === streamStartState) {
				assert(_oMediaSource.sourceBuffers.length === 0);
				_streamOffsetMs = NaN;
				control.setState(segment.dataValue);
				globalQueue.remove(0);
				addNextSegment();
				return;
			}
			if (_isAsyncOperation) {
				return;
			}
			if (segment.dataValue === repeatState) {
				assert(control.getState() !== stoppedState && control.getState() !== repeatState);
				startReplay();
				globalQueue.remove(0);
				addNextSegment();
				return;
			}
			const readinessText = _oMediaSource.readyState;
			if (readinessText !== 'open') {
				log.logInfo(`[Player] Segment ${segment.number} addition deferred MediaSource.readyState=${readinessText} MediaElement.src=${_oMediaElement.src}`);
				if (readinessText === 'closed' && _playbackStarted === 0) {
					preventQueueOverflow();
				}
				return;
			}
			if (segment.isGap && _oMediaSource.sourceBuffers.length !== 0) {
				terminateStream(segment);
				return;
			}
			if (segment.dataValue === streamEndState) {
				assert(segment.isGap && _oMediaSource.sourceBuffers.length === 0);
				control.setState(segment.dataValue);
				globalQueue.remove(0);
				addNextSegment();
				return;
			}
			if (_oMediaSource.sourceBuffers.length === 0) {
				addBuffers(segment);
				control.updateTrackCount(segment.dataValue.hasVideo, segment.dataValue.hasAudio);
			}
			_isAsyncOperation = true;
			let promise = removeWatchedVideo(segment).then(assertBufferExhaustion);
			if (segment.dataValue.isInitSegment) {
				promise = promise.then(addInitializationSegment);
			}
			promise.then(addMediaSegment).then(wasSegmentAdded).catch(wasSegmentNotAdded);
		}
		function seekReplayBack(seekToTime) {
			assert(control.getState() === repeatState);
			_repeat.assertPlaybackPosition(seekToTime);
		}
		function seekReplayForward(hasFrames, seekAmountMs) {
			assert(control.getState() === repeatState);
			assert(Number.isFinite(seekAmountMs));
			if (hasFrames) {
				seekAmountMs *= stats.getFrameDurationSeconds().min;
			}
			if (seekAmountMs !== 0) {
				seekReplayBack(limit(_oMediaElement.currentTime + seekAmountMs, scale.getStart(), scale.getEnd()));
			}
		}
		function togglePause() {
			assert(control.getState() === repeatState);
			if (_repeat.isPaused = !_repeat.isPaused) {
				log.logOk('[Player] Pausing replay');
				_oMediaElement.pause();
			} else {
				log.logOk('[Player] Resuming replay');
				_repeat.assertPlaybackPosition(assertPlaybackStarted);
				_oMediaElement.play();
			}
			events.sendEvent('player-pause', _repeat.isPaused);
		}
		function setReplaySpeed(speedValue) {
			assert(speedValue > 0);
			assert(control.getState() === repeatState);
			log.logOk(`[Player] Speed set to ${speedValue}`);
			_oMediaElement.playbackRate = speedValue;
		}
		function startReplay() {
			_repeat.isPaused = true;
			_behavior = _repeat;
			stopPlayback();
			if (_oMediaSource.sourceBuffers.length !== 0 && _oMediaSource.readyState === 'open') {
				_oMediaSource.endOfStream();
			}
			if (_oMediaElement.played.length === 0 || getBufferFill().watchedCount < REPLAY_AVAILABLE_IF_WATCHED) {
				showState('logOk', 'Nothing to replay');
				control.setState(stoppedState);
				return;
			}
			showState('logOk', 'Starting replay');
			events.sendEvent('player-pause', _repeat.isPaused);
			scale.setStartAndEnd(_oMediaElement.buffered.start(0), _oMediaElement.buffered.end(_oMediaElement.buffered.length - 1));
			scale.setWatched(_oMediaElement.currentTime);
			control.setState(repeatState);
			setReplaySpeed(control.getReplaySpeed());
		}
		function addBuffers(segment) {
			log.logOk(`[Player] Adding buffer ${segment.dataValue.codecString}`);
			assert(segment.isGap && segment.dataValue.codecString);
			try {
				_oMediaSourceBuffer = _oMediaSource.addSourceBuffer(segment.dataValue.codecString);
			} catch (exception) {
				if (isObject(exception) && exception.name === 'NotSupportedError') {
					debug.finishAndShowMessage('J0201');
				} else {
					debug.exceptionCaught(exception);
				}
			}
			_hasVideoTrack = segment.dataValue.hasVideo;
			_oMediaSourceBuffer.addEventListener('updatestart', watchMediaSourceEvents);
			_oMediaSourceBuffer.addEventListener('update', watchMediaSourceEvents);
			_oMediaSourceBuffer.addEventListener('updateend', watchMediaSourceEvents);
			_oMediaSourceBuffer.addEventListener('abort', watchMediaSourceEvents);
			_oMediaSourceBuffer.addEventListener('error', watchMediaSourceEvents);
		}
		function connectMediaSourceToMediaElement() {
			if (_oMediaElement.src) {
				URL.revokeObjectURL(_oMediaElement.src);
			}
			_oMediaElement.src = URL.createObjectURL(_oMediaSource);
			audioDeviceModule.startInternal(_oMediaElement);
		}
		function createMediaSource() {
			try {
				_oMediaSource = new MediaSource();
			} catch (exception) {
				console.error(`MediaSource ${exception}`);
				debug.finishAndShowMessage('J0221');
			}
			_oMediaSource.addEventListener('sourceopen', watchMediaSourceEvents);
			_oMediaSource.addEventListener('sourceended', watchMediaSourceEvents);
			_oMediaSource.addEventListener('sourceclose', watchMediaSourceEvents);
			_oMediaSource.sourceBuffers.addEventListener('addsourcebuffer', watchMediaSourceEvents);
			_oMediaSource.sourceBuffers.addEventListener('removesourcebuffer', watchMediaSourceEvents);
		}
		function start() {
			assert(!_oMediaElement);
			createMediaSource();
			_oMediaElement = document.getElementById('eye');
			volumeBoostModule.startInternal();
			applyVolume();
			pictureInPictureModule.startInternal(_oMediaElement);
			for (let eventName of [ 'progress', 'error', 'playing', 'seeking', 'seeked', 'ended', 'timeupdate', 'waiting', 'loadstart', 'suspend', 'abort', 'emptied', 'stalled', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'durationchange', 'play', 'pause', 'ratechange', 'resize' ]) {
				_oMediaElement.addEventListener(eventName, watchMediaElementEvents);
			}
			connectMediaSourceToMediaElement();
			return true;
		}
		function stop() {
			if (_oMediaElement) {
				URL.revokeObjectURL(_oMediaElement.src);
				_oMediaElement.removeAttribute('src');
				_oMediaElement.load();
			}
		}
		return {
			start,
			stop,
			getBufferFill,
			getDroppedFrameCount,
			getStreamPlaybackPosition,
			showState,
			reload: reloadAndWaitForBuffer,
			applyVolume,
			addNextSegment,
			seekReplayBack,
			seekReplayForward,
			togglePause,
			setReplaySpeed
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.playback = { create };
})();
