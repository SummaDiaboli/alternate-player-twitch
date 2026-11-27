// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
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
			_worker = new Worker('/worker/worker.js');
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

	TW5.player = TW5.player || {};
	TW5.player.converter = { create };
})();
