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

        // Debug: log all extensions (enabled and disabled)
        // console.log('All extensions (enabled):', extensions.filter(e => e.enabled).map(e => ({name: e.name, id: e.id})));
        // console.log('All extensions (disabled):', extensions.filter(e => !e.enabled).map(e => ({name: e.name, id: e.id})));

        for (const ext of extensions) {
            if (ext.enabled) {
                if (ext.name.includes('BetterTTV') || ext.id === 'ajopnjidmegmdimjlfnijceegpefgped') {
                    bttvEnabled = true;
                    // console.log('Detected BTTV:', ext.name, ext.id);
                }
                if (ext.name.includes('FrankerFaceZ') || ext.id === 'fadndhdgpmmaapbmfcknlfgcflmmmieb') {
                    ffzEnabled = true;
                    // console.log('Detected FFZ:', ext.name, ext.id);
                }
            }
        }

        // console.log('BTTV enabled:', bttvEnabled, 'FFZ enabled:', ffzEnabled);

        if (bttvEnabled) {
            // BTTV emotes now work via FFZ integration (ffzap-bttv addon)
            // Injecting betterttv.js causes UI issues with emote menu overlay
            console.log('BTTV detected but skipping injection - using FFZ integration instead');
            // If you want standalone BTTV, uncomment below:
            // chrome.scripting.executeScript({
            //     target: { tabId: tabId, frameIds: [frameId] },
            //     files: ['betterttv.js'],
            //     world: 'MAIN'
            // }).then(() => console.log('BTTV injection initiated.'));
        }

        if (ffzEnabled) {
            chrome.scripting.executeScript({
                target: { tabId: tabId, frameIds: [frameId] },
                files: ['avalon.js'], // Inject local FFZ script
                world: 'MAIN' // Inject into main world
            }).then(() => console.log('FFZ injection initiated.'));
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

// Note: Service workers don't have 'beforeunload' event
// Keep-alive will be cleaned up when service worker is terminated naturally
