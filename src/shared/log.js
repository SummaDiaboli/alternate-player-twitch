// @ts-nocheck: checked after the module split.
'use strict';

const log = (() => {
	const maxRecordLength = 1500;
	let _logParts = null;
	let _lastRecordNumber = -1;
	function add(importanceName, record) {
		if (_logParts) {
			assert(typeof importanceName == 'string' && typeof record == 'string');
			record = clampStringLength(`${importanceName} ${(performance.now() / 1e3).toFixed(3)} ${record}`, maxRecordLength);
			if (++_lastRecordNumber === _logParts.length) {
				_lastRecordNumber = 0;
			}
			_logParts[_lastRecordNumber] = record;
		}
	}
	function getReportData() {
		if (!_logParts) {
			return null;
		}
		const nextRecordNumber = _lastRecordNumber + 1;
		if (nextRecordNumber === _logParts.length) {
			return _logParts;
		}
		if (_logParts[nextRecordNumber] === void 0) {
			return _logParts.slice(0, nextRecordNumber);
		}
		return _logParts.slice(nextRecordNumber).concat(_logParts.slice(0, nextRecordNumber));
	}
	function logInfo(record) {
		assert(arguments.length === 1);
		add(' ', record);
	}
	function logOk(record) {
		assert(arguments.length === 1);
		add('~', record);
	}
	function logError(record) {
		assert(arguments.length === 1);
		add('@', record);
	}
	function O(objectValue) {
		switch (type(objectValue)) {
		  case 'object':
			return JSON.stringify(objectValue);

		  case 'function':
			return `[function ${objectValue.name}]`;

		  case 'symbol':
			return '[symbol]';

		  default:
			return String(objectValue);
		}
	}
	function F(precision) {
		return numericValue => typeof numericValue == 'number' ? numericValue.toFixed(precision) : 'NaN';
	}
	if (!isContentScript) {
		_logParts = new Array(1500);
		logInfo(`[Log] Log started ${performance.now().toFixed()}ms`);
	}
	return {
		logInfo,
		logOk,
		logError,
		O,
		F0: F(0),
		F1: F(1),
		F2: F(2),
		F3: F(3),
		getReportData
	};
})();


TW5.log = log;
