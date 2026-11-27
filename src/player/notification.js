// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		const SHOW_NOTIFICATION = 2e3;
		let _timer = 0;
		function show(badgeId, isAnnoying) {
			assert(document.getElementById(badgeId) && typeof isAnnoying == 'boolean');
			const notificationElement = element('notification');
			notificationElement.classList.toggle('butt', isAnnoying);
			showElement(notificationElement, true);
			notificationElement.firstElementChild.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${badgeId}`);
			if (_timer !== 0) {
				clearTimeout(_timer);
			}
			_timer = setTimeout(hideNotification, SHOW_NOTIFICATION);
		}
		function showHappiness() {
			show('svg-success', false);
		}
		function showButt() {
			show('svg-fail', true);
		}
		const hideNotification = wrapErrors(() => {
			showElement('notification', false);
			_timer = 0;
		});
		return {
			show,
			showHappiness,
			showButt
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.notification = { create };
})();
