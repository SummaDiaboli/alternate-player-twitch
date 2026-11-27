// @ts-nocheck: enabled until the entry is typed.
'use strict';

const keepChannelState = 2e4;

let globalParsedAddress = null;

let urlMode = '';

let globalLastCheck = 0;

let globalRequest = null;

let globalChannelCode = '';

let globalIsStreaming = false;

let globalLastUrl = '';

let globalIsAwaitingButtonInsert = false;

const debug = {
	finishAndShowMessage: finishWork2,
	exceptionCaught: finishWork2
};

function finishWork2(errorOrMessageCode) {
	if (!globalIsWorkFinished) {
		console.error(errorOrMessageCode);
		try {
			globalIsWorkFinished = true;
			log.logOk('[content.js] Work finished');
		} catch (_) {}
	}
	throw void 0;
}

function insertIntoPage(insertCallback) {
	// MV3 fix: Call function directly instead of injecting inline script (CSP violation)
	insertCallback();
}

function removeOldVersionLeftovers() {}

wrapErrors(() => {
	log.logOk(`[content.js] Started ${performance.now().toFixed()}ms ${location.href}`);
	const pageState = TW5.content.pageState.create();
	const navigation = TW5.content.navigation.create(pageState);
	const raid = TW5.content.raid.create(pageState);

	if (pageState.parseAddress(location).page === 'CHANNEL_CHAT') {
		raid.start();
		return;
	}
	removeOldVersionLeftovers();
	navigation.start();
})();
