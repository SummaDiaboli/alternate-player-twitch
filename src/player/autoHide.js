// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		const MIN_MOVE_INTERVAL = 150;
		const movementThreshold = 3;
		const _autoHideElement = document.getElementById('player');
		let _timer = 0;
		let _hideAfterMs = 0;
		let _hideUntilMs = 0;
		let _screenX = 0, _screenY = 0;
		let _clientX = 0, _clientY = 0;
		let _speedSelectTimerId = 0;
		function show() {
			if (_timer === 0) {
				document.body.classList.remove('auto-hide');
				document.body.classList.add('panel-animation');
				_timer = setTimeout(handleTimer, settings.get('autoHideInterval') * 1e3);
				_hideAfterMs = _hideUntilMs = 0;
			} else {
				_hideAfterMs = performance.now() + settings.get('autoHideInterval') * 1e3;
			}
		}
		function hide(isAnimated = true) {
			if (_timer !== 0) {
				clearTimeout(_timer);
				_timer = 0;
				document.body.classList.add('auto-hide');
			}
			document.body.classList.toggle('panel-animation', isAnimated);
			if (!isAnimated) {
				document.body.clientTop;
				document.body.classList.add('panel-animation');
				_hideUntilMs = performance.now() + 500;
			}
		}
		const handleTimer = wrapErrors(() => {
			assert(_timer !== 0);
			const hideAfterMs = _hideAfterMs - performance.now();
			if (hideAfterMs > 50) {
				_timer = setTimeout(handleTimer, hideAfterMs);
				_hideAfterMs = 0;
			} else {
				hide();
			}
		});
		const handlePointerMovement = wrapErrors(({screenX, screenY, clientX, clientY}) => {
			_autoHideElement.removeEventListener('pointermove', handlePointerMovement, passiveHandler);
			setTimeout(interceptPointerMovement, MIN_MOVE_INTERVAL);
			if ((_screenX !== screenX || _screenY !== screenY) && (_clientX !== clientX || _clientY !== clientY) && (Math.abs(_clientX - clientX) >= movementThreshold || Math.abs(_clientY - clientY) >= movementThreshold) && performance.now() >= _hideUntilMs) {
				show();
			}
			_screenX = screenX;
			_screenY = screenY;
			_clientX = clientX;
			_clientY = clientY;
		});
		const interceptPointerMovement = wrapErrors(() => {
			_autoHideElement.addEventListener('pointermove', handlePointerMovement, passiveHandler);
		});
		const handleClickInternal = wrapErrors(() => {
			show();
		});
		const handlePointerLeave = wrapErrors(() => {
			hide();
		});
		const handleSpeedSelect = wrapErrors(event => {
			if (event.button === leftButton) {
				if (_speedSelectTimerId !== 0) {
					clearTimeout(_speedSelectTimerId);
				}
				_speedSelectTimerId = setTimeout(() => document.body.classList.remove('speed-select'), 5e3);
				document.body.classList.add('speed-select');
			}
		});
		function start() {
			interceptPointerMovement();
			_autoHideElement.addEventListener('click', handleClickInternal);
			_autoHideElement.addEventListener('mouseleave', handlePointerLeave);
			element('speed').addEventListener('pointerdown', handleSpeedSelect);
		}
		return {
			start,
			show,
			hide
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.autoHide = { create };
})();
