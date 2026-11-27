// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		let _handlersMap = new Map();
		function addHandler(eventName, handler) {
			assert(isNonEmptyString(eventName));
			assert(typeof handler == 'function' || isObject(handler));
			let eventHandlers = _handlersMap.get(eventName);
			if (eventHandlers === void 0) {
				eventHandlers = new Set();
				_handlersMap.set(eventName, eventHandlers);
			}
			eventHandlers.add(handler);
		}
		function removeHandler(eventName, handler) {
			assert(isNonEmptyString(eventName));
			assert(typeof handler == 'function' || isObject(handler));
			const eventHandlers = _handlersMap.get(eventName);
			if (eventHandlers !== void 0) {
				eventHandlers.delete(handler);
				if (eventHandlers.size === 0) {
					_handlersMap.delete(eventName);
				}
			}
		}
		function sendEvent(eventName, dataValue) {
			assert(isNonEmptyString(eventName));
			log.logInfo(`[Events] Event occurred: ${eventName}`);
			const eventHandlers = _handlersMap.get(eventName);
			if (eventHandlers !== void 0) {
				assert(eventHandlers.size !== 0);
				let event;
				for (let handler of eventHandlers.values()) {
					if (typeof handler == 'function') {
						handler(dataValue, eventName);
					} else {
						if (event === void 0) {
							event = {
								type: eventName,
								data: dataValue
							};
						}
						handler.handleEvent(event);
					}
				}
			}
		}
		return {
			addHandler,
			removeHandler,
			sendEvent
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.events = { create };
})();
