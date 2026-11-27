// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		function setItemAvailability(item, isAvailable) {
			element(item).tabIndex = isAvailable ? 0 : -1;
		}
		element('eye').addEventListener('contextmenu', event => {
			event.preventDefault();
			windowModule.toggle('main-menu');
		});
		events.addHandler('control-left-click', event => {
			if (event.target.classList.contains('menu-item')) {
				windowModule.close(false);
			}
		});
		return {
			setItemAvailability
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.menu = { create };
})();
