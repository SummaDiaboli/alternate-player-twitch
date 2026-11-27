// @ts-check
'use strict';

{
	function interceptFunction() {
		const originalFunction = window.fetch;
		window.fetch = function(addressValue, params2) {
			const promise2 = originalFunction(addressValue, params2);
			const requestHeaders = /** @type {{ Authorization?: unknown }} */ (params2?.headers);
			if (addressValue === 'https://gql.twitch.tv/integrity' && params2 && params2.method && params2.method.toUpperCase() === 'POST' && params2.headers && requestHeaders.Authorization) {
				promise2.then(reply => {
					if (reply.ok && reply.status === 200) {
						return reply.clone().json().then(({token: token, expiration: expiresAfterMs}) => {
							if (typeof token == 'string' && token && Number.isSafeInteger(expiresAfterMs)) {
								const currentTime2 = Date.now();
								expiresAfterMs = Math.min(Math.max(expiresAfterMs - 3 * 60 * 1e3, currentTime2 + 1 * 60 * 60 * 1e3), currentTime2 + 24 * 60 * 60 * 1e3);
								document.cookie = `tw5~gqltoken=${encodeURIComponent(JSON.stringify({
									token,
									expiresAfterMs
								}))}; path=/tw5~storage/; samesite=none; secure; max-age=86400`;
							}
						});
					}
				}).catch(reason2 => {});
			}
			return promise2;
		};
	}
	// MV3 fix: Call function directly instead of injecting inline script (CSP violation)
	interceptFunction();
}