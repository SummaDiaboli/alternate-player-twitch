// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		const showOnce = '2000.1.1';
		const alwaysShow = '2000.2.2';
		const fullHelp = '2000.3.3';
		const forTablet = '2000.4.4';
		const _newsModule = [ [ '2025.5.28', 'J1010', 'F1078' ], [ '2024.6.14', 'J1010', 'F1077' ], [ '2024.6.5', 'J1010', 'F1076' ], [ '2024.6.5', 'J1010', 'F1074' ], [ '2024.5.31', 'F1072', 'F1073' ], [ '2022.1.20', 'J1513', 'F1515' ], [ '2021.12.17', 'J1066', 'F1070', 'F1514' ], [ '2021.12.17', 'J1010', 'F1069' ], [ '2021.3.7', 'J1010', 'F1068' ], [ '2020.10.30', 'J1066', 'F1067' ], [ '2020.10.5', 'J1010', 'F1065' ], [ '2019.10.9', 'J1010', 'F1064' ], [ '2019.3.17', 'J1010', 'F1063' ], [ '2018.10.28', 'J1010', 'F1062' ], [ '2018.8.17', 'J1010', 'F1060' ], [ '2018.7.30', 'J1010', 'F1059' ], [ '2018.6.27', 'J1010', 'F1058' ], [ '2018.6.12', 'J1010', 'F1057' ], [ '2018.5.18', 'J1010', 'F1049' ], [ '2018.4.24', 'J1036', 'F1048' ], [ '2018.4.6', 'J1010', 'F1047' ], [ '2018.3.17', 'J1010', 'F1046' ], [ '2018.3.4', 'J1041', 'F1042' ], [ '2018.2.17', 'J1010', 'F1044' ], [ '2018.1.7', 'J1010', 'F1043' ], [ '2017.11.6', 'J1010', 'F1037', 'F1038' ], [ '2017.10.22', 'J1010', 'F1023' ], [ '2017.10.14', 'J1010', 'F1020' ], [ '2017.9.11', 'J1010', 'F1018' ], [ '2017.8.8', 'J1035', 'F1017' ], [ '2017.6.23', 'J1010', 'F1014' ], [ '2017.5.29', 'J1010', 'F1013' ], [ '2017.3.31', 'J1031', 'F1012' ], [ '2017.2.26', 'J1030', 'F1011' ], [ fullHelp, 'J1500', 'F1501', 'F1503', 'F1502', 'F1575', 'F1509', 'F1573', 'F1574', 'F1504', 'F1514', 'F1507' ], [ fullHelp, 'J1513', 'F1570', 'F1571', 'F1572', 'F1515', 'F1511', 'F1506', 'F1510' ], [ showOnce, 'J1054', 'F1501' ], [ forTablet, 'J1055', 'F1056' ], [ alwaysShow, 'J1003', 'F1000' ] ];
		function convertVersionToMilliseconds(versionName) {
			const partCount = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(versionName);
			partCount[1] |= 0;
			partCount[2] |= 0;
			partCount[3] |= 0;
			partCount[4] |= 0;
			return Date.UTC(partCount[1], partCount[2] - 1, partCount[3], 0, 0, 0, partCount[4]);
		}
		function hasNewsWithNewerVersion(versionName) {
			const versionNumber = convertVersionToMilliseconds(versionName);
			return _newsModule.some(news => convertVersionToMilliseconds(news[0]) > versionNumber);
		}
		function addNews(versionsOlderToAddCount, helpVersionToAdd) {
			assert(typeof versionsOlderToAddCount == 'number' && versionsOlderToAddCount >= 0);
			assert(helpVersionToAdd === '' || helpVersionToAdd.startsWith('2000'));
			assert(Number.isFinite(versionsOlderToAddCount) || helpVersionToAdd !== '');
			const addToElement = element('news-body');
			addToElement.textContent = '';
			for (let news of _newsModule) {
				const versionName = news[0];
				if (versionName.startsWith('2000')) {
					if (versionName === helpVersionToAdd || versionName === forTablet && isMobileDevice() || versionName === alwaysShow) {
						addNews2(addToElement, news, 0);
					}
				} else {
					const versionNumber = convertVersionToMilliseconds(versionName);
					if (versionNumber > versionsOlderToAddCount) {
						addNews2(addToElement, news, versionNumber);
					}
				}
			}
			windowModule.setupScrollIndicator(addToElement);
		}
		function addNews2(addToElement, news, newsDate) {
			if (addToElement.firstElementChild) {
				addToElement.appendChild(document.createElement('hr'));
			}
			const titleElement = document.createElement('h4');
			if (newsDate === 0) {
				titleElement.textContent = TW5.messages.getMessageText(news[1]);
			} else {
				titleElement.textContent = `${i18n.formatDate(newsDate)} · ${TW5.messages.getMessageText(news[1])}`;
			}
			addToElement.appendChild(titleElement);
			if (TW5.messages.getMessageText('M0010') !== 'ru') {
				const link = titleElement.appendChild(document.createElement('a'));
				link.className = 'translate-news';
				link.href = 'translate:';
				link.target = '_blank';
				link.title = TW5.messages.getMessageText('J0148');
			}
			for (let yMarker = 2; yMarker < news.length; ++yMarker) {
				i18n.InsertAdjacentHtmlMessage(addToElement, 'beforeend', news[yMarker]);
			}
		}
		function openWindow(shouldConfirmRead) {
			if (shouldConfirmRead) {
				i18n.InsertAdjacentHtmlMessage('close-news', 'content', 'F0619').title = TW5.messages.getMessageText('A0620');
				showElement('postpone-news', true);
			} else {
				i18n.InsertAdjacentHtmlMessage('close-news', 'content', 'F0663').title = '';
				showElement('postpone-news', false);
			}
			events.addHandler('control-left-click', handleLeftClick);
			windowModule.open('news');
		}
		function handleLeftClick(event) {
			if (event.callSign === 'close-news' && isElementShown('postpone-news')) {
				showElement('open-news', false);
				settings.set('previousVersionName', extensionVersion);
			} else if (event.target.href === 'translate:') {
				let textString = '';
				for (let textElement2 = event.target.parentElement; textElement2 && textElement2.nodeName !== 'HR'; textElement2 = textElement2.nextElementSibling) {
					textString += `${textElement2.textContent}\n\n`;
				}
				event.target.href = `https://translate.google.com/?op=translate&sl=${TW5.messages.getMessageText('M0010')}&text=${encodeURIComponent(textString)}`;
			}
		}
		function openHelp() {
			addNews(Infinity, fullHelp);
			openWindow(false);
		}
		function openNews() {
			const {currentValue: previousVersionName, initialValue: initialVersion} = settings.getSettingParam('previousVersionName');
			if (previousVersionName === initialVersion) {
				addNews(Infinity, showOnce);
				openWindow(false);
				showElement('open-news', false);
				settings.set('previousVersionName', extensionVersion);
			} else if (previousVersionName !== extensionVersion) {
				addNews(convertVersionToMilliseconds(previousVersionName), '');
				openWindow(true);
				element('open-news').classList.remove('unread');
			} else {
				addNews(0, '');
				openWindow(false);
			}
		}
		function assertExtensionUpdate() {
			const updateCheckInterval = 1e3 * 60 * 60 * 24 * 5;
			const UPDATE_INSTALLATION_IN_PROGRESS = 1e3 * 60 * 60 * 24 * 3;
			const now = Date.now();
			let lastCheck = settings.get('lastExtensionUpdateCheck');
			if (Math.abs(now - Math.abs(lastCheck)) < updateCheckInterval) {
				return;
			}
			wait(null, 900).then(() => {
				return loader.loadJson(null, `https://coolcmd.github.io/tw5/version.json?${now}`, 3e4, 'extension update', false);
			}).then(result => {
				let isUpdateAvailable = false;
				try {
					const {supportedVersion: {chrome: {extensionVersion2, browserVersion}}} = result;
					assert(isNonEmptyString(extensionVersion2) && Number.isSafeInteger(browserVersion));
					isUpdateAvailable = getBrowserEngineVersion() >= browserVersion && convertVersionToMilliseconds(extensionVersion) < convertVersionToMilliseconds(extensionVersion2);
				} catch (exception) {
					throw String(exception);
				}
				if (!isUpdateAvailable) {
					lastCheck = now;
				} else if (lastCheck >= 0) {
					lastCheck = -(now - (updateCheckInterval - UPDATE_INSTALLATION_IN_PROGRESS));
				} else {
					lastCheck = -now;
					windowModule.open('extension-update');
				}
				settings.set('lastExtensionUpdateCheck', lastCheck);
				settings.flushChanges();
			}).catch(wrapErrors(reasonValue => {
				if (typeof reasonValue == 'string') {
					log.logError(`[News] Failed to check for extension update. ${reasonValue}`);
					settings.set('lastExtensionUpdateCheck', lastCheck < 0 ? -now : now);
					settings.flushChanges();
				} else {
					throw reasonValue;
				}
			}));
		}
		function start() {
			const {currentValue: previousVersionName, initialValue: initialVersion} = settings.getSettingParam('previousVersionName');
			if (previousVersionName !== extensionVersion) {
				log.logOk(`[News] Extension version changed from ${previousVersionName} to ${extensionVersion}`);
				if (previousVersionName === initialVersion || hasNewsWithNewerVersion(previousVersionName)) {
					showElement('open-news', true).classList.add('unread');
				} else {
					settings.set('previousVersionName', extensionVersion);
				}
			}
			assertExtensionUpdate();
		}
		return {
			start,
			openNews,
			openHelp
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.news = { create };
})();
