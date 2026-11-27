// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		const adPlaylistUpdateInterval = 2e3;
		const minListsUpdateInterval = 500;
		class listsUpdate {
			constructor(isAdFree) {
				this._isAdFree = isAdFree;
				this._promiseCancellation = null;
				this.clearAll();
			}
			clearAll() {
				this.optionList = null;
				this.segmentList = null;
				this.selectedOption = null;
			}
			startInternal() {
				assert(!this._promiseCancellation);
				this._promiseCancellation = new cancelPromise();
				this._update(this._promiseCancellation, -Infinity);
			}
			stopInternal() {
				if (this._promiseCancellation) {
					log.logInfo(`[List] Stopping list updates ${+this._isAdFree}`);
					this._promiseCancellation.cancel();
					this._promiseCancellation = null;
				}
			}
			saveStreamVariant(option) {
				settings.set('variantName', option.identifier);
				settings.set('variantBitrate', option.bitrateKbps);
			}
			selectStreamVariant(options) {
				const savedId = settings.get('variantName');
				const savedBitrate = settings.get('variantBitrate');
				let selectedOption = options.find(({identifier}) => identifier === savedId);
				if (!selectedOption) {
					if (savedId === 'chunked' || savedId === 'audio_only') {
						selectedOption = options[0];
					} else {
						selectedOption = options.find(({identifier, bitrateKbps}) => identifier !== 'audio_only' && bitrateKbps <= savedBitrate);
						if (!selectedOption) {
							selectedOption = options.reduceRight((result, option) => result.identifier === 'audio_only' ? option : result);
						}
					}
				}
				log.logInfo(`[List] For list ${+this._isAdFree}, selected stream variant ${selectedOption.identifier}/${selectedOption.bitrateKbps}. Saved ${savedId}/${savedBitrate}`);
				return selectedOption;
			}
			_update(promiseCancellation, delay) {
				assert(thisNumber(delay));
				if (delay >= minListsUpdateInterval || delay === -Infinity) {
					log.logInfo(`[List] List updates ${+this._isAdFree} will start in ${log.F0(delay)}ms`);
				} else {
					log.logError(`[List] List updates ${+this._isAdFree} will start in ${minListsUpdateInterval}ms instead of ${log.F0(delay)}ms`);
					delay = minListsUpdateInterval;
				}
				let promise = wait(promiseCancellation, delay);
				let {optionList, selectedOption} = this;
				if (optionList === null) {
					let absoluteVariantListUrl;
					promise = promise.then(() => Twitch.getAbsoluteOptionListUrl(promiseCancellation, false, this._isAdFree)).then(resultText => {
						absoluteVariantListUrl = resultText;
						return loader.loadText(promiseCancellation, absoluteVariantListUrl, VARIANT_LIST_LOAD_TIMEOUT, `variant list ${+this._isAdFree}`, false);
					}).then(resultText => {
						debug.saveVariantList(resultText);
						optionList = parseList(true, absoluteVariantListUrl, resultText);
						if (optionList.options.length === 0) {
							throw `Variant list is empty`;
						}
					});
				}
				let updateStart;
				promise.then(() => {
					if (selectedOption === null) {
						selectedOption = this.selectStreamVariant(optionList.options);
					}
					updateStart = performance.now();
					return loader.loadText(promiseCancellation, selectedOption.absoluteSegmentListUrl, SEGMENT_LIST_LOAD_TIMEOUT, `segment list ${+this._isAdFree}`, false);
				}).then(resultText => {
					debug.saveSegmentList(resultText);
					const segmentList = parseList(false, selectedOption.absoluteSegmentListUrl, resultText);
						if (segmentList.isFMP4) {
							const newFmp4Codecs = `video/mp4;codecs="${selectedOption.codecString}"`;
							if (!globalIsFmp4 || globalFmp4Codecs !== newFmp4Codecs) {
								globalIsFmp4 = true;
								globalFmp4Codecs = newFmp4Codecs;
								globalFmp4HasVideo = /avc1|avc3|hvc1|hev1|av01|vp09/i.test(selectedOption.codecString);
								globalFmp4HasAudio = /mp4a|ac-3|ec-3|opus|flac/i.test(selectedOption.codecString);
								log.logOk(`[List] Detected fMP4 stream Codecs=${globalFmp4Codecs}`);
							}
							globalFmp4Initialization = segmentList.initialization;
							if (!globalFmp4InitBuffer) {
								loadFmp4Init();
							}
						}
					let updateIntervalMs;
					if (this._isStaleSegmentList(optionList, segmentList, selectedOption)) {
						stats.segmentsQueued(0, 0);
						if (segmentList.isEndOfList) {
							throw 'КОНЕЦ_СПИСКА';
						}
						updateIntervalMs = adPlaylistUpdateInterval;
					} else {
						const isShortenedInterval = delay === -Infinity || this.optionList === null;
						this.optionList = optionList;
						this.segmentList = segmentList;
						this.selectedOption = selectedOption;
						updateIntervalMs = this._segmentListUpdated(isShortenedInterval);
					}
					this._update(promiseCancellation, updateStart + updateIntervalMs - performance.now());
					loader.loadNextSegment();
				}).catch(wrapErrors(reasonValue => {
					if (typeof reasonValue == 'string') {
						this._listNotUpdated(promiseCancellation, reasonValue);
						loader.loadNextSegment();
					} else if (reasonValue === cancelPromise.reason) {
						log.logInfo(`[List] List updates cancelled ${+this._isAdFree}`);
					} else {
						throw reasonValue;
					}
				}));
			}
			_isStaleSegmentList(optionList, segmentList, selectedOption) {
				const sessionSwitchThreshold = 5;
				assert(this.optionList === null == (this.segmentList === null));
				if (segmentList.segments.length === 0) {
					log.logError(`[List] Segment list ${+this._isAdFree} is empty`);
					return true;
				}
				if (this.segmentList === null) {
					return false;
				}
				assert(!(this.optionList.streamId !== optionList.streamId && this.optionList.sessionId === optionList.sessionId));
				if (this.segmentList.nTargetDuration !== segmentList.nTargetDuration) {
					log.logError(`[List] In list ${+this._isAdFree}, target duration changed ${this.segmentList.nTargetDuration} ==> ${segmentList.nTargetDuration}`);
				}
				if (this.selectedOption !== null) {
					const difference = segmentList.sequenceNumber - this.segmentList.sequenceNumber;
					const startTime = Math.max(-difference, 0);
					const endTime = Math.min(this.segmentList.segments.length - difference, segmentList.segments.length);
					for (let newNumber = startTime, oldValue = startTime + difference; newNumber < endTime; newNumber++, oldValue++) {
						if (segmentList.segments[newNumber].address !== this.segmentList.segments[oldValue].address) {
							log.logError(`[List] In list ${+this._isAdFree}, segment ${segmentList.sequenceNumber + newNumber} address changed ${clampStringLength(this.segmentList.segments[oldValue].address, 100)} ==> ${clampStringLength(segmentList.segments[newNumber].address, 100)}`);
							segmentList.isChaos = true;
							break;
						}
					}
				}
				const difference = this.segmentList.sequenceNumber + this.segmentList.segments.length - segmentList.sequenceNumber - segmentList.segments.length;
				if (difference > 0) {
					if (this.selectedOption === null && difference <= sessionSwitchThreshold) {
						log.logError(`[List] When switching variant in list ${+this._isAdFree}, sequence number decreased ${this.segmentList.sequenceNumber} + ${this.segmentList.segments.length} ==> ${segmentList.sequenceNumber} + ${segmentList.segments.length}`);
						return false;
					}
					if (segmentList.sequenceNumber === 0 || difference > sessionSwitchThreshold) {
						log.logError(`[List] Changing session ID: in list ${+this._isAdFree}, sequence number decreased ${this.segmentList.sequenceNumber} + ${this.segmentList.segments.length} ==> ${segmentList.sequenceNumber} + ${segmentList.segments.length}`);
						optionList.sessionId = _sessionId++;
						return false;
					}
					log.logError(`[List] Received stale list ${+this._isAdFree}: sequence number ${this.segmentList.sequenceNumber} + ${this.segmentList.segments.length} ==> ${segmentList.sequenceNumber} + ${segmentList.segments.length}`);
					return true;
				}
				if (this.segmentList.sequenceNumber > segmentList.sequenceNumber) {
					log.logError(`[List] In list ${+this._isAdFree}, sequence number decreased ${this.segmentList.sequenceNumber} ==> ${segmentList.sequenceNumber}`);
				}
				return false;
			}
		}
		class updateListsWithAds extends listsUpdate {
			constructor() {
				super(false);
			}
			_segmentListUpdated(isShortenedInterval) {
				const isListEndingWithAd = thisListEndsWithAd(this.segmentList);
				Twitch.sendAdTrackingData(isListEndingWithAd ? this.segmentList : null);
				if (!_isAdPlaying || !isListEndingWithAd) {
					isShortenedInterval = enqueueSegments(this.optionList, this.segmentList, this.selectedOption) || isShortenedInterval;
				}
				if (this.segmentList.isEndOfList) {
					throw 'КОНЕЦ_СПИСКА';
				}
				setAdState(isListEndingWithAd);
				return isListEndingWithAd ? adPlaylistUpdateInterval : getSegmentListUpdateInterval(this.segmentList, isShortenedInterval);
			}
			_listNotUpdated(promiseCancellation, reasonText) {
				if (reasonText === 'ОТКАЗАНО_В_ДОСТУПЕ') {
					control.stopWatchingStream();
					notification.showButt();
				} else {
					log[reasonText === 'КОНЕЦ_СПИСКА' ? 'logOk' : 'logError'](`[List] Stream ended. ${reasonText}`);
					endStream();
					this._update(promiseCancellation, getVariantListUpdateInterval());
				}
			}
		}
		class updateListsWithoutAds extends listsUpdate {
			constructor() {
				super(true);
			}
			stopInternal() {
				super.stopInternal();
				this.clearAll();
			}
			_segmentListUpdated(isShortenedInterval) {
				if (thisListEndsWithAd(this.segmentList)) {
					throw 'Ad found';
				}
				isShortenedInterval = enqueueSegments(this.optionList, this.segmentList, this.selectedOption) || isShortenedInterval;
				if (this.segmentList.isEndOfList) {
					throw 'КОНЕЦ_СПИСКА';
				}
				return getSegmentListUpdateInterval(this.segmentList, isShortenedInterval);
			}
			_listNotUpdated(promiseCancellation, reasonText) {
				log.logError(`[List] List 1 not updated. ${reasonText}`);
				this.stopInternal();
			}
		}
		const _listsWithAds = new updateListsWithAds();
		const _adFreeListsObj = new updateListsWithoutAds();
		let _state = stoppedState;
		let _isAdPlaying = false;
		let _optionListUpdateInterval = -1;
		let _sessionId = 1;
		function parseList(isOptionList, absoluteListUrl, parsedList) {
			const MAX_SUPPORTED_HLS_VERSION = 7;
			if (parsedList.includes('shelblock.proxy')) {
				debug.finishAndShowMessage('J0220');
			}
			if (!parsedList.startsWith('#EXTM3U')) {
				throw `Loaded something that is not a list, length ${parsedList.length}\n${parsedList}`;
			}
			let versionNumber = 1;
			let mapRenditionGroups, options, newOption, streamId, watchTrackingUrl;
			let nTargetDuration, sequenceNumber, isEndOfList, adSegmentCount, adType, clipCount, clipNumber, clipDuration, adToken, clipId1, clipId2, clipId3, clipId4, clipId5, clipId6, quarterNumber, segments, newSegment, initialization;
			let isGap, time;
			if (isOptionList) {
				mapRenditionGroups = new Map();
				options = [];
				newOption = null;
				streamId = '';
				watchTrackingUrl = '';
			} else {
				nTargetDuration = -1;
				sequenceNumber = 0;
				isEndOfList = false;
				adSegmentCount = 0;
				adType = '';
				segments = [];
				newSegment = null;
				initialization = null;
				isGap = false;
				time = NaN;
			}
			const tagOrUrl = /^#EXT([^:\r\n]+)(?::(.*))?$|^[^#\r\n].*$/gm;
			tagOrUrl.lastIndex = 7;
			for (let tagOrUrlList; tagOrUrlList = tagOrUrl.exec(parsedList); ) {
				const [address, tagName = '', tagValue = ''] = tagOrUrlList;
				try {
					switch (tagName) {
					  case '':
						if (isOptionList) {
							assert(newOption !== null);
							newOption.absoluteSegmentListUrl = ResolveRelativeUrl(address, absoluteListUrl);
							options.push(newOption);
							newOption = null;
						} else {
							reject2(newSegment !== null);
							newSegment.address = ResolveRelativeUrl(address, absoluteListUrl);
							newSegment.isGap = isGap;
							segments.push(newSegment);
							isGap = false;
							adSegmentCount += Boolean(newSegment.isAd);
							newSegment = null;
						}
						break;
	
					  case 'INF':
						{
							assert(!isOptionList);
							assert(nTargetDuration !== -1);
							assert(newSegment === null);
							newSegment = Object.create(null);
							const {duration, segmentName} = parseEXTINF(tagValue);
							newSegment.duration = duration;
							newSegment.isAd = Twitch.isAdSegment(segmentName);
							if (newSegment.isAd) {
								time = NaN;
							}
							newSegment.time = time;
							time++;
							if (newSegment.duration < 0) {
								log.logError(`[List] Segment ${sequenceNumber + segments.length} has negative duration ${tagValue}`);
								newSegment.duration = 0;
							}
							if (Math.round(newSegment.duration) > nTargetDuration) {
								log.logError(`[List] Segment ${sequenceNumber + segments.length} duration exceeds target duration by ${newSegment.duration - nTargetDuration}s`);
								if (newSegment.duration > nTargetDuration * 3) {
									newSegment.duration = 0;
								}
							}
							break;
						}
	
					  case '-X-DISCONTINUITY':
						assert(!isOptionList);
						assert(!tagValue);
						isGap = true;
						break;
	
					  case '-X-PROGRAM-DATE-TIME':
						assert(!isOptionList);
						break;
	
					  case '-X-KEY':
						assert(!isOptionList);
						debug.finishAndShowMessage('J0219', 'J0731', Twitch.getChannelUrl(true));
						break;
	
					  case '-X-MAP':
						{
							assert(!isOptionList);
							const mapAttributes = parseAttributeList(tagValue);
							assert(!mapAttributes.has('BYTERANGE'));
							const initUrl = mapAttributes.get('URI');
							assert(isNonEmptyString(initUrl));
							initialization = {
								address: ResolveRelativeUrl(initUrl, absoluteListUrl)
							};
							break;
						}
	
					  case '-X-BYTERANGE':
					  case '-X-GAP':
						assert(false);
						break;
	
					  case '-X-TARGETDURATION':
						assert(!isOptionList);
						assert(nTargetDuration === -1);
						nTargetDuration = parsePositiveInteger(tagValue);
						assert(nTargetDuration > 0 && nTargetDuration < 60);
						break;
	
					  case '-X-MEDIA-SEQUENCE':
						assert(!isOptionList);
						assert(sequenceNumber === 0);
						sequenceNumber = parsePositiveInteger(tagValue);
						break;
	
					  case '-X-ENDLIST':
						assert(!isOptionList);
						assert(!tagValue);
						isEndOfList = true;
						break;
	
					  case '-X-DISCONTINUITY-SEQUENCE':
						assert(!isOptionList);
						break;
	
					  case '-X-PLAYLIST-TYPE':
					  case '-X-I-FRAMES-ONLY':
						assert(false);
						break;
	
					  case '-X-TWITCH-LIVE-SEQUENCE':
						assert(!isOptionList);
						time = parsePositiveInteger(tagValue);
						break;
	
					  case '-X-DATERANGE':
						{
							assert(!isOptionList);
							const attributes = parseAttributeList(tagValue);
							try {
								switch (attributes.get('CLASS')) {
								  case 'twitch-stitched-ad':
									adType = attributes.get('X-TV-TWITCH-AD-ROLL-TYPE');
									clipCount = parsePositiveInteger(attributes.get('X-TV-TWITCH-AD-POD-LENGTH'));
									clipNumber = parsePositiveInteger(attributes.get('X-TV-TWITCH-AD-POD-POSITION'));
									clipDuration = parsePositiveNumber(attributes.get('DURATION') || '0');
									adToken = attributes.get('X-TV-TWITCH-AD-RADS-TOKEN') || '';
									clipId1 = attributes.get('X-TV-TWITCH-AD-ADVERTISER-ID') || '';
									clipId2 = attributes.get('X-TV-TWITCH-AD-CREATIVE-ID') || '';
									clipId3 = attributes.get('X-TV-TWITCH-AD-LINE-ITEM-ID') || '';
									clipId4 = attributes.get('X-TV-TWITCH-AD-ORDER-ID') || '';
									clipId5 = attributes.get('X-TV-TWITCH-AD-AD-SESSION-ID') || '';
									clipId6 = attributes.get('X-TV-TWITCH-AD-AD-FORMAT') || '';
									assert(adType);
								}
							} catch (exception) {
								adType = '';
								log.logError(`[List] Ad parsing error: ${tagValue}`);
							}
							break;
						}
	
					  case '-X-MEDIA':
						{
							assert(isOptionList);
							const attributes = parseAttributeList(tagValue);
							const typeName = attributes.get('TYPE');
							assert(typeName);
							assert(typeName !== 'VIDEO' && typeName !== 'AUDIO' || !attributes.has('URI'));
							if (typeName === 'VIDEO') {
								const groupName = attributes.get('GROUP-ID');
								const name = attributes.get('NAME');
								assert(groupName && name);
								assert(!mapRenditionGroups.has(groupName));
								mapRenditionGroups.set(groupName, name);
							} else {
								log.logError(`[List] Found #EXT-X-MEDIA TYPE=${typeName}`);
							}
							break;
						}
	
					  case '-X-STREAM-INF':
						{
							assert(isOptionList);
							assert(newOption === null);
							newOption = Object.create(null);
							const attributes = parseAttributeList(tagValue);
							newOption.bitrateKbps = parsePositiveInteger(attributes.get('BANDWIDTH'));
							assert(!attributes.has('AUDIO') && !attributes.has('SUBTITLES') && !attributes.has('CLOSED-CAPTIONS'));
							newOption.identifier = attributes.get('VIDEO') || '';
							newOption.codecString = attributes.get('CODECS') || '';
							break;
						}
	
					  case '-X-I-FRAME-STREAM-INF':
					  case '-X-SESSION-DATA':
					  case '-X-SESSION-KEY':
						assert(isOptionList);
						break;
	
					  case '-X-TWITCH-INFO':
						{
							assert(isOptionList);
							const attributes = parseAttributeList(tagValue);
							const seconds = parsePositiveNumber(attributes.get('SERVER-TIME'));
							assert(seconds > 1531267200 && seconds < 1846886400);
							const milliseconds = seconds * 1e3 + 50;
							globalExactTimeMs = milliseconds - performance.now();
							const timeDesync = milliseconds - Date.now();
							streamId = attributes.get('BROADCAST-ID');
							assert(streamId);
							try {
								const address = atob(attributes.get('C'));
								assert(address.startsWith('https://'));
								watchTrackingUrl = address;
							} catch (exception) {
								log.logError(`[List] Failed to parse view-tracking URL: ${exception}`);
							}
							log[Math.abs(timeDesync) > 5e3 ? 'logError' : 'logOk'](`[List] TimeDesync=${timeDesync}ms StreamId=${streamId}`);
							break;
						}
	
					  case '-X-VERSION':
						assert(versionNumber === 1);
						versionNumber = parsePositiveInteger(tagValue);
						assert(versionNumber >= 2 && versionNumber <= MAX_SUPPORTED_HLS_VERSION);
						break;
	
					  case '-X-START':
						log.logError(`[List] Found #EXT-X-START=${tagValue}`);
						break;
	
					  case 'M3U':
					  case '-X-DEFINE':
						assert(false);
					}
				} catch (exception) {
					if (exception instanceof Error && exception.message === 'БРАКОВАТЬ') {
						throw `List line parsing error:\n${convertExceptionToString(exception)}\n${address}`;
					}
				}
			}
			if (isOptionList) {
				assert(newOption === null);
				for (let option of options) {
					if (option.identifier) {
						assert(mapRenditionGroups.has(option.identifier));
						option.title = mapRenditionGroups.get(option.identifier);
					} else {
						option.identifier = `CoolCmd${option.bitrateKbps}`;
						option.title = `${i18n.formatNumber(option.bitrateKbps / 1e6, 1)} ${TW5.messages.getMessageText('J0114')}`;
					}
				}
				log.logInfo(`[List] Variant count in list: ${options.length}`);
				return Twitch.sortVariantList({
					streamId,
					sessionId: _sessionId++,
					watchTrackingUrl,
					options
				});
			} else {
				assert(newSegment === null);
				assert(nTargetDuration !== -1);
				const segmentList = {
					nTargetDuration,
					sequenceNumber,
					isEndOfList,
					isChaos: false,
					adSegmentCount,
					adType,
					clipCount,
					clipNumber,
					clipDuration,
					adToken,
					clipId1,
					clipId2,
					clipId3,
					clipId4,
					clipId5,
					clipId6,
					segments,
					initialization,
					isFMP4: initialization !== null
				};
				log.logInfo(`[List] Parsed segment list TargetDuration=${nTargetDuration} SequenceNumber=${sequenceNumber} EndOfList=${isEndOfList} SegmentCount=${segments.length} AdSegments=${adSegmentCount}`);
				if (adType) {
					log.logOk(`[List] Ad found AdType=${adType} AdToken=${adToken.slice(-10)} Clips=${clipCount} ClipNumber=${clipNumber} ClipDuration=${clipDuration} QuarterNumber=${quarterNumber} EndsWithAd=${thisListEndsWithAd(segmentList)}`);
				}
				stats.segmentListParsed(segmentList);
				return segmentList;
			}
		}
		function reject2(conditionValue) {
			if (!conditionValue) {
				throw new Error('БРАКОВАТЬ');
			}
		}
		function parseAttributeList(sourceText) {
			const attributes = new Map();
			const attribute = /([A-Z0-9-]+)=(?:"([^"]*)"|([^",]+))(?:,|$)/g;
			while (attribute.lastIndex !== sourceText.length) {
				const {lastIndex} = attribute;
				const attributeString = attribute.exec(sourceText);
				assert(attributeString.index === lastIndex);
				assert(!attributes.has(attributeString[1]));
				attributes.set(attributeString[1], attributeString[3] || attributeString[2]);
			}
			return attributes;
		}
		function parsePositiveInteger(sourceText) {
			const resultNumber = parseFloat(sourceText);
			assert(Number.isSafeInteger(resultNumber) && resultNumber >= 0);
			return resultNumber;
		}
		function parsePositiveNumber(sourceText) {
			const resultNumber = parseFloat(sourceText);
			assert(Number.isFinite(resultNumber) && resultNumber >= 0);
			return resultNumber;
		}
		function parseAnyNumber(sourceText) {
			const resultNumber = parseFloat(sourceText);
			assert(Number.isFinite(resultNumber));
			return resultNumber;
		}
		function parseEXTINF(sourceText) {
			let commaPosition = sourceText.indexOf(',');
			if (commaPosition === -1) {
				commaPosition = sourceText.length;
			}
			return {
				duration: parseAnyNumber(sourceText.slice(0, commaPosition)),
				segmentName: sourceText.slice(commaPosition + 1)
			};
		}
		function thisListEndsWithAd(list) {
			return list !== null && list.segments.length !== 0 && list.segments[list.segments.length - 1].isAd;
		}
		function setAdState(isAdPlaying) {
			if (_isAdPlaying !== isAdPlaying) {
				_isAdPlaying = isAdPlaying;
				if (isAdPlaying) {
					_adFreeListsObj.startInternal();
					events.sendEvent('list-ad-start');
				} else {
					_adFreeListsObj.stopInternal();
					events.sendEvent('list-ad-end');
				}
			}
			if (!isAdPlaying) {
				Twitch.sendAdTrackingData(null);
			}
		}
		let _addedStreamId;
		let _addedSessionId;
		let _addedVariantId;
		let _addedSequenceNumber;
		let _addedTimeMs;
		let _shouldAddGap;
		function clearAddStats() {
			_addedStreamId = '';
			_addedSessionId = NaN;
			_addedVariantId = '';
			_addedSequenceNumber = -1;
			_addedTimeMs = -1;
			_shouldAddGap = false;
		}
		clearAddStats();
		function enqueueSegments(newOptions, newSegments, selectedOption) {
			assert(!(_addedStreamId !== newOptions.streamId && _addedSessionId === newOptions.sessionId));
			if (newSegments.isChaos) {
				_shouldAddGap = true;
				stats.segmentsQueued(0, 0);
				return false;
			}
			let segmentsAddedCount = 0;
			let secondsAddedCount = 0;
			let addedSegmentIndex = newSegments.segments.length;
			let segmentsToAddCount = _addedStreamId !== newOptions.streamId ? 1 : 3;
			let secondsToAdd = settings.get('bufferSize');
			while (--addedSegmentIndex > 0) {
				if (!newSegments.segments[addedSegmentIndex].isAd && newSegments.segments[addedSegmentIndex].duration !== 0) {
					segmentsToAddCount--;
					secondsToAdd -= newSegments.segments[addedSegmentIndex].duration;
					if (segmentsToAddCount <= 0 && secondsToAdd <= 0) {
						break;
					}
				}
			}
			if (_addedStreamId !== newOptions.streamId) {
				log.logOk(`[List] Stream ID changed ${_addedStreamId} ==> ${newOptions.streamId}`);
				_addedTimeMs = -1;
				_shouldAddGap = true;
				for (let addedSegment; addedSegment = newSegments.segments[addedSegmentIndex]; addedSegmentIndex++) {
					enqueueSegment(addedSegment, newSegments.sequenceNumber + addedSegmentIndex);
				}
			} else if (_addedSessionId !== newOptions.sessionId) {
				log.logOk(`[List] Session ID changed ${_addedSessionId} ==> ${newOptions.sessionId}`);
				_shouldAddGap = true;
				for (let addedSegment; addedSegment = newSegments.segments[addedSegmentIndex]; addedSegmentIndex++) {
					if (addedSegment.time > _addedTimeMs) {
						enqueueSegment(addedSegment, newSegments.sequenceNumber + addedSegmentIndex);
					}
				}
			} else {
				if (_addedVariantId !== selectedOption.identifier) {
					log.logOk(`[List] Variant ID changed ${_addedVariantId} ==> ${selectedOption.identifier}`);
					_shouldAddGap = true;
				}
				for (let addedSegment; addedSegment = newSegments.segments[addedSegmentIndex]; addedSegmentIndex++) {
					if (newSegments.sequenceNumber + addedSegmentIndex > _addedSequenceNumber) {
						enqueueSegment(addedSegment, newSegments.sequenceNumber + addedSegmentIndex);
					}
				}
			}
			stats.segmentsQueued(segmentsAddedCount, secondsAddedCount);
			return segmentsAddedCount === 0;
			function enqueueSegment(segment, sequenceNumber) {
				startStream();
				if (segment.isAd) {
					log.logInfo(`[List] Not adding ad SequenceNumber=${sequenceNumber}`);
					return;
				}
				if (segment.duration === 0) {
					log.logError(`[List] Not adding segment SequenceNumber=${sequenceNumber} Time=${segment.time} Duration=0`);
					return;
				}
				if (_addedSessionId === newOptions.sessionId && _addedSequenceNumber + 1 < sequenceNumber) {
					log.logError(`[List] Skipped segments from ${_addedSequenceNumber + 1} to ${sequenceNumber - 1}`);
					stats.segmentsSkipped(sequenceNumber - _addedSequenceNumber - 1);
					_shouldAddGap = true;
				}
				const addedObj = globalQueue.add(new segmentItem(processingAwaitingLoad, segment.address, segment.duration, segment.isGap || _shouldAddGap));
				log[addedObj.isGap ? 'logOk' : 'logInfo'](`[List] Segment added ${addedObj.number} SequenceNumber=${sequenceNumber} Time=${segment.time} Duration=${addedObj.duration} Gap=${addedObj.isGap}`);
				segmentsAddedCount++;
				secondsAddedCount += addedObj.duration;
				_addedStreamId = newOptions.streamId;
				_addedSessionId = newOptions.sessionId;
				_addedVariantId = selectedOption.identifier;
				_addedSequenceNumber = sequenceNumber;
				if (!Number.isNaN(segment.time)) {
					_addedTimeMs = segment.time;
				}
				_shouldAddGap = false;
			}
		}
		function getSegmentListUpdateInterval(segmentList, isShortenedInterval) {
			let segmentCount = 0, listDurationMs = 0;
			let averageSegmentDurationMs, minSegmentDuration = Infinity, maxSegmentDuration = -Infinity;
			for (const {isAd, duration} of segmentList.segments) {
				if (!isAd && duration > 0) {
					segmentCount++;
					listDurationMs += duration;
					minSegmentDuration = Math.min(minSegmentDuration, duration);
					maxSegmentDuration = Math.max(maxSegmentDuration, duration);
				}
			}
			if (segmentCount !== 0) {
				averageSegmentDurationMs = listDurationMs / segmentCount;
				log.logInfo(`[List] SegmentDurations=${log.F2(minSegmentDuration)}<${log.F2(averageSegmentDurationMs)}<${log.F2(maxSegmentDuration)} ListDuration=${log.F1(listDurationMs)} NotToLoad=${segmentList.segments.length - segmentCount}`);
			} else {
				averageSegmentDurationMs = minSegmentDuration = maxSegmentDuration = Math.max(segmentList.nTargetDuration / 3, 1);
				log.logError(`[List] Estimated segment duration ${log.F1(averageSegmentDurationMs)}`);
			}
			return isShortenedInterval ? averageSegmentDurationMs / 2 * 1e3 : averageSegmentDurationMs * 1e3 - 16;
		}
		function getVariantListUpdateInterval() {
			assert(_state === streamEndState);
			if (_optionListUpdateInterval === -1) {
				_optionListUpdateInterval = 1e3;
			} else {
				_optionListUpdateInterval = Math.min(_optionListUpdateInterval + 1e3, 3e4);
			}
			return _optionListUpdateInterval;
		}
		function startStream() {
			if (_state !== streamStartState) {
				_state = streamStartState;
				globalQueue.add(new segmentItem(processingLoaded, streamStartState));
				events.sendEvent('stream-variant-selected', [ _listsWithAds.optionList.options, _listsWithAds.selectedOption ]);
			}
		}
		function endStream() {
			if (_state !== streamEndState) {
				_state = streamEndState;
				_optionListUpdateInterval = -1;
				globalQueue.add(new segmentItem(processingLoaded, streamEndState));
				events.sendEvent('stream-variant-selected', [ null, null ]);
			}
			_listsWithAds.clearAll();
			setAdState(false);
		}
		function setStreamVariant(selectedVariant) {
			if (_listsWithAds.optionList !== null) {
				_listsWithAds.saveStreamVariant(_listsWithAds.optionList.options[selectedVariant]);
				_listsWithAds.selectedOption = null;
				if (_state === streamStartState) {
					_listsWithAds.stopInternal();
					_listsWithAds.startInternal();
					if (!_isAdPlaying) {
						clearAddStats();
						globalQueue.add(new segmentItem(processingLoaded, variantChangeState));
						loader.loadNextSegment();
					}
				}
			}
		}
		function stop() {
			_state = stoppedState;
			_listsWithAds.stopInternal();
			clearAddStats();
			setAdState(false);
		}
		function start() {
			assert(_state === stoppedState);
			_listsWithAds.startInternal();
		}
		return {
			start,
			stop,
			setStreamVariant
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.variants = { create };
})();
