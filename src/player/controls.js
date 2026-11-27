// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
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

	TW5.player = TW5.player || {};
	TW5.player.controls = { create };
})();
