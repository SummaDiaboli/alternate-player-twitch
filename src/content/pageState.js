// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	function create() {
		function setPageUrl(address, shouldReplace = false) {
			location[shouldReplace ? 'replace' : 'assign'](address);
		}
		
		function canRedirectThisUrl(addressObject) {
			return !addressObject.search.includes(urlNoRedirect);
		}
		
		function getNonRedirectableUrl(addressObject) {
			return `${addressObject.protocol}//${addressObject.host}${addressObject.pathname}${addressObject.search.length > 1 ? `${addressObject.search}&${urlNoRedirect}` : `?${urlNoRedirect}`}${addressObject.hash}`;
		}
		
		function disableAutoRedirectForThisPage() {
			if (canRedirectThisUrl(location)) {
				history.replaceState(history.state, '', getNonRedirectableUrl(location));
			}
		}
		
		function parseAddress(addressObject) {
			let isMobileVersion = false;
			let page = 'UNKNOWN';
			let channelCode = '';
			let canRedirect = false;
			if (addressObject.protocol === 'https:' && (addressObject.host === 'www.twitch.tv' || addressObject.host === 'm.twitch.tv')) {
				isMobileVersion = addressObject.host === 'm.twitch.tv';
				const parts = addressObject.pathname.split('/');
				if (parts.length <= 3 && parts[1] && !parts[2]) {
					if (!parseAddress.notChannelCode.has(parts[1])) {
						page = 'POSSIBLE_LIVE_STREAM';
						channelCode = decodeURIComponent(parts[1]);
						canRedirect = canRedirectThisUrl(addressObject);
					}
				} else if ((parts[1] === 'embed' || parts[1] === 'popout') && parts[2] && parts[3] === 'chat') {
					page = 'CHANNEL_CHAT';
					channelCode = decodeURIComponent(parts[2]);
				}
			}
			log.logOk(`[content.js] Address parsed: Page=${page} ChannelCode=${channelCode} CanRedirect=${canRedirect}`);
			return {
				isMobileVersion,
				page,
				channelCode,
				canRedirect
			};
		}

		parseAddress.notChannelCode = new Set([ 'directory', 'embed', 'friends', 'inventory', 'login', 'logout', 'manager', 'messages', 'payments', 'popout', 'search', 'settings', 'signup', 'subscriptions', 'team' ]);

		return {
			parseAddress,
			setPageUrl,
			canRedirectThisUrl,
			getNonRedirectableUrl,
			disableAutoRedirectForThisPage
		};
	}

	TW5.content = TW5.content || {};
	TW5.content.pageState = { create };
})();
