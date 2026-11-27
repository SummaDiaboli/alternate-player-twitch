// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
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

	TW5.player = TW5.player || {};
	TW5.player.audioDevices = { create };
})();
