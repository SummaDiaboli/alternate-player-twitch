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


// Listen for the message from the content script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.request === 'InsertThirdPartyExtensions') {
        // Pass both tabId and frameId
        insertThirdPartyExtensions(sender.tab.id, sender.frameId);
        sendResponse({status: "Injections started."});
        return true; // Indicates you will send a response asynchronously.
    }
});

// This is where the main logic will now live. The service worker determines which scripts to inject,
// and then uses chrome.scripting.executeScript to run them on the page.
async function insertThirdPartyExtensions(tabId, frameId) {
    try {
        const extensions = await chrome.management.getAll();
        let bttvEnabled = false;
        let ffzEnabled = false;

        for (const ext of extensions) {
            if (ext.enabled) {
                if (ext.name.includes('BetterTTV') || ext.id === 'ajopnjidmegmdimjlfnijceegpefgped') {
                    bttvEnabled = true;
                }
                if (ext.name.includes('FrankerFaceZ') || ext.id === 'fadndhdgpmmaapbmfcknlfgcflmmmieb') {
                    ffzEnabled = true;
                }
            }
        }

        

    } catch (error) {
        console.error('Error in insertThirdPartyExtensions:', error);
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
