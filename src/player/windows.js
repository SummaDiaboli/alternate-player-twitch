// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		function getOpenState() {
			return document.body.getAttribute('data-window-opened') || '';
		}
		function openWindow2(windowId) {
			const windowElement = element(windowId);
			assert(windowElement.classList.contains('window'));
			windowElement.classList.add('window-open', 'window-animation');
			document.body.setAttribute('data-window-opened', windowId);
			events.sendEvent(`window-opened-${windowId}`);
		}
		function closePlayerWindow(windowId, isAnimated = true) {
			const windowElement = element(windowId);
			assert(windowElement.classList.contains('window'));
			windowElement.classList.remove('window-open');
			windowElement.classList.toggle('window-animation', isAnimated);
			document.body.removeAttribute('data-window-opened');
		}
		function open(windowId) {
			assert(isNonEmptyString(windowId));
			const openWindowId = getOpenState();
			if (windowId === openWindowId) {
				return false;
			}
			if (openWindowId) {
				closePlayerWindow(openWindowId);
			}
			openWindow2(windowId);
			return true;
		}
		function close(isAnimated = true) {
			const openWindowId = getOpenState();
			if (openWindowId) {
				closePlayerWindow(openWindowId, isAnimated);
			}
		}
		function toggle(windowId) {
			open(windowId) || closePlayerWindow(windowId);
		}
		function setupScrollIndicator(scroll) {
			const scrollElement = element(scroll);
			scrollElement.scrollTop = 0;
			updateScrollIndicator(scrollElement);
		}
		function updateScrollIndicator(scrollElement) {
			const shouldShow = !isElementFullyScrolled(scrollElement);
			showElement(element(`scroll-indicator-${scrollElement.id}`), shouldShow);
			scrollElement[shouldShow ? 'addEventListener' : 'removeEventListener']('scroll', handleScroll);
		}
		const handleScroll = wrapErrors(event => {
			updateScrollIndicator(event.target);
		});
		events.addHandler('control-left-click', ({target: clickElement}) => {
			const windowId = clickElement.getAttribute('data-window-toggle');
			if (windowId) {
				toggle(windowId);
				return;
			}
			const openWindowId = getOpenState();
			if (openWindowId && !element(openWindowId).contains(clickElement) && element('player').contains(clickElement)) {
				closePlayerWindow(openWindowId);
			}
		});
		return {
			open,
			close,
			toggle,
			setupScrollIndicator
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.windows = { create };
})();
