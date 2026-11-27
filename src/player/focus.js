// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		let _state2 = getNewState();
		function getState() {
			return _state2;
		}
		function getNewState() {
			const isShown = !document.hidden;
			const isActive = isShown && document.hasFocus();
			return {
				isShown,
				isActive
			};
		}
		const handleEvent = wrapErrors(event => {
			log.logInfo(`[Focus] Event ${event.type}, old state ${log.O(_state2)}`);
			setTimeout(updateState);
		});
		const updateState = wrapErrors(() => {
			const nextState = getNewState();
			if (_state2.isShown !== nextState.isShown || _state2.isActive !== nextState.isActive) {
				log.logOk(`[Focus] New state ${log.O(nextState)}`);
				_state2 = nextState;
				events.sendEvent('focus-manager-state-changed', nextState);
			}
		});
		log.logInfo(`[Focus] Initial state ${log.O(_state2)}`);
		document.addEventListener('visibilitychange', handleEvent);
		window.addEventListener('focus', handleEvent);
		window.addEventListener('blur', handleEvent);
		return {
			getState
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.focus = { create };
})();
