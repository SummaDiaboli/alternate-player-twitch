// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		let _timer = -2;
		const refresh = wrapErrors(() => {
			assert(_timer !== 0);
			_timer = 0;
			const playerElement = element('player');
			const playerHeightPx = playerElement.clientHeight * 100 / settings.get('uiSize');
			assert(playerHeightPx > 0);
			playerElement.classList.toggle('collapse-main-menu', playerHeightPx <= 460);
			playerElement.classList.toggle('collapse-settings', playerHeightPx <= 412);
			const FONT_SIZE_MIN = 100;
			const FONT_SIZE_MAX = 124;
			const FONT_SIZE_STEP = 8;
			const panelStyle = element('top-panel').style;
			const fillerElement = element('placeholder');
			for (let fontSize = FONT_SIZE_MAX; ;fontSize -= FONT_SIZE_STEP) {
				panelStyle.fontSize = `${fontSize}%`;
				if (fontSize === FONT_SIZE_MIN || fillerElement.clientWidth > 0) {
					break;
				}
			}
		});
		function refreshFast() {
			if (_timer !== -1) {
				if (_timer > 0) {
					clearTimeout(_timer);
				}
				_timer = -1;
				requestAnimationFrame(refresh);
			}
		}
		function updateSlowly() {
			if (_timer === -2 || _timer === 0) {
				_timer = setTimeout(refresh, 200);
				assert(_timer > 0);
			}
		}
		window.addEventListener('resize', wrapErrors(() => {
			if (_timer !== -2) {
				updateSlowly();
			}
		}));
		return {
			refreshFast,
			updateSlowly
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.mediaQuery = { create };
})();
