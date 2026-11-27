// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		let _sRequestFullscreen = 'requestFullscreen';
		let _sExitFullscreen = 'exitFullscreen';
		let _sFullscreenElement = 'fullscreenElement';
		let _sFullscreenchange = 'fullscreenchange';
		if (!document.exitFullscreen) {
			_sRequestFullscreen = 'webkitRequestFullscreen';
			_sExitFullscreen = 'webkitExitFullscreen';
			_sFullscreenElement = 'webkitFullscreenElement';
			_sFullscreenchange = 'webkitfullscreenchange';
		}
		const handleModeChange2 = wrapErrors(() => {
			events.sendEvent('fullscreen-mode-changed', update());
		});
		const handleDoubleClick = wrapErrors(event => {
			if (event.button === leftButton) {
				event.preventDefault();
				toggle2();
			}
		});
		function getElement() {
			return element('player-and-chat');
		}
		function isEnabled2() {
			return !!document[_sFullscreenElement];
		}
		function update() {
			const isEnabled = isEnabled2();
			log.logOk(`[Fullscreen] Mode enabled: ${isEnabled}`);
			updateButton('toggle-fullscreen', isEnabled);
			return isEnabled;
		}
		function enable() {
			if (isEnabled2()) {
				return false;
			}
			log.logInfo('[Fullscreen] Enabling mode');
			autoHide.hide(false);
			pictureInPictureModule.disableControl();
			getElement()[_sRequestFullscreen]();
			return true;
		}
		function disable() {
			if (!isEnabled2()) {
				return false;
			}
			log.logInfo('[Fullscreen] Disabling mode');
			autoHide.hide(false);
			document[_sExitFullscreen]();
			return true;
		}
		function toggle2() {
			enable() || disable();
		}
		document.addEventListener(_sFullscreenchange, handleModeChange2);
		element('eye').addEventListener('dblclick', handleDoubleClick);
		update();
		return {
			isEnabled2,
			disable,
			toggle2,
			getElement
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.fullscreen = { create };
})();
