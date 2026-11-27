// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		const checkIntervalMs = 970;
		const MIN_TIME_DEVIATION = -30;
		const MAX_TIME_DEVIATION = 200;
		const MAX_DATE_DEVIATION = 40;
		let _maxDeviationMs = 0;
		let _timer = 0;
		let _timeMs;
		let _timestampMs;
		const assertHeartbeat = wrapErrors(() => {
			const time = performance.now();
			const dateValue2 = Date.now();
			const timeDriftMs = time - _timeMs - checkIntervalMs;
			const dateDeviation = dateValue2 - _timestampMs - (time - _timeMs);
			if (timeDriftMs < MIN_TIME_DEVIATION || timeDriftMs > MAX_TIME_DEVIATION || Math.abs(dateDeviation) > MAX_DATE_DEVIATION) {
				log.logError(`[Pulse] ${log.F0(timeDriftMs)} ${log.F0(dateDeviation)}`);
			}
			_maxDeviationMs = Math.max(_maxDeviationMs, timeDriftMs);
			_timeMs = time;
			_timestampMs = dateValue2;
			_timer = setTimeout(assertHeartbeat, checkIntervalMs);
		});
		function handleStateChange(stateNumber) {
			if (stateNumber === streamEndState || stateNumber === stoppedState || stateNumber === repeatState) {
				if (_timer !== 0) {
					log.logInfo('[Pulse] Timer stopped');
					clearTimeout(_timer);
					_timer = 0;
				}
			} else if (_timer === 0) {
				log.logInfo('[Pulse] Timer started');
				_timeMs = performance.now();
				_timestampMs = Date.now();
				_timer = setTimeout(assertHeartbeat, checkIntervalMs);
			}
		}
		function getReportData() {
			return _maxDeviationMs;
		}
		events.addHandler('control-state-changed', handleStateChange);
		return {
			getReportData
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.pulse = { create };
})();
