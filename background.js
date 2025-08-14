'use strict';

// Service worker for Manifest V3
// Note: webRequest functionality has been moved to declarativeNetRequest rules in rules.json

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === 'install') {
		console.log('Extension installed');
	} else if (details.reason === 'update') {
		console.log('Extension updated');
	}
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.сЗапрос === 'ВставитьСторонниеРасширения') {
		handleThirdPartyExtensions(sendResponse);
		return true; // Keep message channel open for async response
	}
});

// Handle third party extensions detection
async function handleThirdPartyExtensions(sendResponse) {
	try {
		const extensions = await chrome.management.getAll();
		let thirdPartyExtensions = '';
		
		for (const ext of extensions) {
			if (ext.enabled) {
				// Check for BetterTTV
				if (ext.name.includes('BetterTTV') || ext.id === 'ajopnjidmegmdimjlfnijceegpefgped') {
					thirdPartyExtensions += 'BTTV ';
				}
				// Check for FrankerFaceZ
				if (ext.name.includes('FrankerFaceZ') || ext.id === 'fadndhdgpmmaapbmfcknlfgcflmmmieb') {
					thirdPartyExtensions += 'FFZ ';
				}
			}
		}
		
		sendResponse({
			сСторонниеРасширения: thirdPartyExtensions.trim()
		});
	} catch (error) {
		console.error('Error detecting third party extensions:', error);
		sendResponse({
			сСторонниеРасширения: ''
		});
	}
}

// Keep service worker alive for critical functionality
// This is a fallback mechanism for service worker lifecycle
let keepAliveInterval;

function startKeepAlive() {
	keepAliveInterval = setInterval(() => {
		chrome.runtime.getPlatformInfo(() => {
			// This is just to keep the service worker alive
		});
	}, 20000); // Every 20 seconds
}

function stopKeepAlive() {
	if (keepAliveInterval) {
		clearInterval(keepAliveInterval);
		keepAliveInterval = null;
	}
}

// Start keep alive when service worker starts
startKeepAlive();

// Clean up on service worker termination
self.addEventListener('beforeunload', () => {
	stopKeepAlive();
});
