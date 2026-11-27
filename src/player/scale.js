// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		let _startTime = 0;
		let _endPosition = 0;
		let _watchedCount;
		function clampTime(time) {
			return limit(time, _startTime, _endPosition);
		}
		function update() {
			assert(Number.isFinite(_startTime) && Number.isFinite(_endPosition) && Number.isFinite(_watchedCount));
			element('scale-watched').style.transform = `scaleX(${((_watchedCount - _startTime) / (_endPosition - _startTime)).toFixed(4)})`;
		}
		const handleClick = wrapErrors(event => {
			if (control.getState() !== repeatState) {
				return;
			}
			const borderObject = event.currentTarget.getBoundingClientRect();
			const style = getComputedStyle(event.currentTarget);
			const scaleStart = Math.round(borderObject.left + Number.parseFloat(style.paddingLeft));
			const scaleEnd = Math.round(borderObject.right - Number.parseFloat(style.paddingRight));
			const pointer = event.clientX + 1;
			const seekToTime = clampTime((pointer - scaleStart) / (scaleEnd - scaleStart) * (_endPosition - _startTime) + _startTime);
			log.logOk(`[Timeline] Seeking to ${seekToTime}`);
			player.seekReplayBack(seekToTime);
		});
		function setStartAndEnd(startTime, endTime) {
			assert(startTime <= endTime);
			_startTime = startTime;
			_endPosition = endTime;
			document.getElementById('scale').addEventListener('click', handleClick);
		}
		function setWatched(watchedCount) {
			_watchedCount = clampTime(watchedCount);
			update();
		}
		function getStart() {
			return _startTime;
		}
		function getEnd() {
			return _endPosition;
		}
		return {
			setStartAndEnd,
			setWatched,
			getStart,
			getEnd
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.scale = { create };
})();
