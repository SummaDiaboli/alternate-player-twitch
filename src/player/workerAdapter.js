// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const workerSegmentFields = [
		[ 'dataValue', 'пДанные' ],
		[ 'isGap', 'лРазрыв' ],
		[ 'number', 'чНомер' ],
		[ 'duration', 'чДлительность' ]
	];
	const workerDataFieldNames = new Map([
		[ 'чПреобразованЗа', 'conversionTime' ],
		[ 'лЗабраковано', 'isRejected' ],
		[ 'лПотериВидео', 'hasVideoLoss' ],
		[ 'лПотериЗвука', 'hasAudioLoss' ],
		[ 'чМинДлительностьВидеоСемпла', 'minVideoSampleDuration' ],
		[ 'чМаксДлительностьВидеоСемпла', 'maxVideoSampleDurationMs' ],
		[ 'чСредняяДлительностьВидеоСемпла', 'avgVideoSampleDuration' ],
		[ 'чБитрейтЗвука', 'audioBitrate' ],
		[ 'чПозицияКодирования', 'encodePositionMs' ],
		[ 'чПозицияТрансляции', 'streamPosition' ],
		[ 'чВремяКодирования', 'encodingTime' ],
		[ 'мбМедиасегмент', 'mediaSegmentData' ],
		[ 'лЕстьВидео', 'hasVideo' ],
		[ 'лЕстьЗвук', 'hasAudio' ],
		[ 'мбСегментИнициализации', 'isInitSegment' ],
		[ 'сКодеки', 'codecString' ],
		[ 'чЧастотаКадров', 'frameRate' ],
		[ 'чДиапазон', 'range' ],
		[ 'лЧересстрочное', 'isInterlaced' ]
	]);
	const legacyWorkerLogSeverityNames = new Map([
		[ 'Вот', 'logInfo' ],
		[ 'Окак', 'logOk' ],
		[ 'Ой', 'logError' ]
	]);
	function toWorkerSegment(segment) {
		const workerSegment = {};
		for (const [ playerName, workerName ] of workerSegmentFields) {
			workerSegment[workerName] = segment[playerName];
		}
		return workerSegment;
	}
	function fromWorkerSegment(workerSegment) {
		const segment = {};
		for (const [ playerName, workerName ] of workerSegmentFields) {
			segment[playerName] = workerSegment[workerName];
		}
		return segment;
	}
	function fromWorkerData(workerData) {
		if (!isObject(workerData)) {
			return workerData;
		}
		const data = {};
		for (const [ workerName, value ] of Object.entries(workerData)) {
			const mapped = workerDataFieldNames.get(workerName);
			data[mapped === undefined ? workerName : mapped] = value;
		}
		return data;
	}
	function getWorkerLogSeverityName(importance) {
		const mapped = legacyWorkerLogSeverityNames.get(importance);
		const name = mapped === undefined ? importance : mapped;
		assert(name === 'logInfo' || name === 'logOk' || name === 'logError');
		return name;
	}

	TW5.player = TW5.player || {};
	TW5.player.workerAdapter = { toWorkerSegment, fromWorkerSegment, fromWorkerData, getWorkerLogSeverityName };
})();
