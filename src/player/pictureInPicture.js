// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		let _oMediaElement = null;
		const handleModeChange = wrapErrors(() => {
			refresh();
		});
		function isTurnedOn() {
			return Boolean(document.pictureInPictureElement);
		}
		function refresh() {
			const isEnabled = isTurnedOn();
			log.logOk(`[PictureInPicture] Mode enabled: ${isEnabled}`);
			updateButton('toggle-picture-in-picture', isEnabled);
		}
		function turnOn() {
			if (isTurnedOn()) {
				return false;
			}
			log.logInfo('[PictureInPicture] Enabling mode');
			fullscreenMode.disable();
			_oMediaElement.requestPictureInPicture();
			return true;
		}
		function disableControl() {
			if (!isTurnedOn()) {
				return false;
			}
			log.logInfo('[PictureInPicture] Disabling mode');
			document.exitPictureInPicture();
			return true;
		}
		function toggle() {
			_oMediaElement && !document.body.classList.contains('no-video') && (turnOn() || disableControl());
		}
		function startInternal(oMediaElement) {
			if (!document.pictureInPictureEnabled || oMediaElement.disablePictureInPicture) {
				log.logError(`[PictureInPicture] pictureInPictureEnabled=${document.pictureInPictureEnabled} disablePictureInPicture=${oMediaElement.disablePictureInPicture}`);
				return;
			}
			_oMediaElement = oMediaElement;
			oMediaElement.addEventListener('enterpictureinpicture', handleModeChange);
			oMediaElement.addEventListener('leavepictureinpicture', handleModeChange);
			refresh();
			showElement('toggle-picture-in-picture', true);
		}
		return {
			startInternal,
			disableControl,
			toggle
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.pictureInPicture = { create };
})();
