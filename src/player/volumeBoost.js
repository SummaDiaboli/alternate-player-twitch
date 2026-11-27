// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
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

	TW5.player = TW5.player || {};
	TW5.player.volumeBoost = { create };
})();
