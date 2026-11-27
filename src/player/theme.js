// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		const colorButtonSelector = 'input[type="color"]';
		const colorSettingNames = new Map([
			[ 'background-color', 'backgroundColor' ],
			[ 'gradient-color', 'gradientColor' ],
			[ 'button-color', 'buttonColor' ],
			[ 'header-color', 'titleColor' ],
			[ 'selection-color', 'selectionColor' ]
		]);
		function getColorSettingName(buttonElement) {
			const name = colorSettingNames.get(buttonElement.id);
			assert(name);
			return name;
		}
		let _opacityInfo = null;
		const handleColorInput = wrapErrors(event => {
			if (event.target.matches(colorButtonSelector)) {
				updateStyles();
			}
		});
		const handleColorChange = wrapErrors(event => {
			if (event.target.matches(colorButtonSelector)) {
				settings.set(getColorSettingName(event.target), event.target.value);
			}
		});
		function handleThemePresetChange() {
			updateSettingsWindow();
			updateStyles();
		}
		function updateSettingsWindow() {
			for (let buttonElement of document.querySelectorAll(colorButtonSelector)) {
				buttonElement.value = settings.get(getColorSettingName(buttonElement));
			}
			_opacityInfo.update();
		}
		function updateStyles() {
			const style = document.documentElement.style;
			for (let buttonElement of document.querySelectorAll(colorButtonSelector)) {
				style.setProperty(`--${buttonElement.id}`, Number.parseInt(buttonElement.value.slice(1, 3), 16) + ',' + Number.parseInt(buttonElement.value.slice(3, 5), 16) + ',' + Number.parseInt(buttonElement.value.slice(5, 7), 16));
			}
			const opacity = round(1 - settings.get('opacityValue') / 100, 2);
			style.setProperty('--opacity', opacity);
			style.setProperty('--window-opacity', limit(opacity, .85, 1));
		}
		function applyUiSize() {
			document.documentElement.style.fontSize = `${16 * settings.get('uiSize') / 100}px`;
			mediaQuery.updateSlowly();
		}
		function start() {
			i18n.TranslateDocument(document);
			_opacityInfo = new numberInput('opacityValue', 5, 0, 'transparency');
			_opacityInfo.afterChange = updateStyles;
			document.addEventListener('input', handleColorInput);
			document.addEventListener('change', handleColorChange);
			events.addHandler('settings-appearance-preset-changed', handleThemePresetChange);
			handleThemePresetChange();
			new numberInput('uiSize', 1, 0, 'interface-size').afterChange = applyUiSize;
			applyUiSize();
			showElement(document.body, true);
		}
		return {
			start
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.theme = { create };
})();
