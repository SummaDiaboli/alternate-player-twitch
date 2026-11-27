// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		let _chatElement = null;
	 //! <iframe>
			function getPanelPosition() {
			switch (getComputedStyle(document.getElementById('player-and-chat')).flexDirection) {
			  case 'column-reverse':
				return topSide;
	
			  case 'row':
				return rightSide;
	
			  case 'column':
				return bottomSide;
	
			  case 'row-reverse':
				return leftSide;
	
			  default:
				assert(false);
			}
		}
		function insertPanel() {
			if (_chatElement) {
				return;
			}
			const address = Twitch.openChat();
			log.logInfo(`[Chat] Inserting iframe ${address}`);
			_chatElement = document.createElement('iframe');
			_chatElement.src = address;
			_chatElement.id = 'chat';
			_chatElement.width = settings.get('chatPanelWidth');
			_chatElement.height = settings.get('chatPanelHeight');
			element('chat-size').insertAdjacentElement('afterend', _chatElement);
		}
		function removePanel() {
			if (_chatElement) {
				log.logInfo(`[Chat] Removing iframe ${_chatElement.src}`);
				Twitch.closeChat();
				_chatElement.remove();
				_chatElement = null;
			}
		}
		function applyUrl() {
			if (_chatElement) {
				log.logOk('[Chat] Changing iframe URL');
				removePanel();
				insertPanel();
			}
		}
		function applyPanelState() {
			const stateNumber = settings.get('chatState');
			log.logOk(`[Chat] New panel state: ${stateNumber}`);
			cancelPanelDrag();
			switch (stateNumber) {
			  case chatUnloaded:
				document.body.classList.add('hide-chat');
				removePanel();
				break;
	
			  case chatHidden:
				insertPanel();
				document.body.classList.add('hide-chat');
				break;
	
			  case chatPanel:
				insertPanel();
				document.body.classList.remove('hide-chat');
				break;
	
			  default:
				assert(false);
			}
			mediaQuery.updateSlowly();
		}
		function applyPanelPosition() {
			cancelPanelDrag();
			const classes = document.body.classList;
			if (settings.get('isChatAutoPosition')) {
				classes.add('auto-chat-position');
				classes.toggle('chat-top', settings.get('chatVerticalPosition') === topSide);
				classes.toggle('chat-left', settings.get('chatHorizontalPosition') === leftSide);
			} else {
				const position = settings.get('chatPanelPosition');
				classes.remove('auto-chat-position');
				classes.toggle('chat-top', position === topSide);
				classes.toggle('chat-right', position === rightSide);
				classes.toggle('chat-bottom', position === bottomSide);
				classes.toggle('chat-left', position === leftSide);
			}
			mediaQuery.updateSlowly();
		}
		function saveAndApplyClosedPanelState(newStateNumber) {
			settings.set('closedChatStateCode', newStateNumber);
			const stateNumber = settings.get('chatState');
			if ((stateNumber === chatUnloaded || stateNumber === chatHidden) && stateNumber !== newStateNumber) {
				settings.set('chatState', newStateNumber);
				applyPanelState();
			}
		}
		function togglePanelState() {
			const isFullscreen = fullscreenMode.isEnabled2();
			switch (settings.get('chatState')) {
			  case chatUnloaded:
			  case chatHidden:
				settings.set('chatState', chatPanel, isFullscreen);
				break;
	
			  case chatPanel:
				settings.set('chatState', isFullscreen ? chatHidden : settings.get('closedChatStateCode'), isFullscreen);
				break;
	
			  default:
				assert(false);
			}
			applyPanelState();
		}
		function togglePanelPosition() {
			if (settings.get('chatState') !== chatPanel) {
				return;
			}
			let position;
			if (settings.get('isChatAutoPosition')) {
				settings.set('isChatAutoPosition', false);
				position = getPanelPosition();
			} else {
				position = settings.get('chatPanelPosition');
			}
			switch (position) {
			  case topSide:
				settings.set('chatPanelPosition', rightSide);
				break;
	
			  case rightSide:
				settings.set('chatPanelPosition', bottomSide);
				break;
	
			  case bottomSide:
				settings.set('chatPanelPosition', leftSide);
				break;
	
			  case leftSide:
				settings.set('chatPanelPosition', topSide);
				break;
	
			  default:
				assert(false);
			}
			applyPanelPosition();
		}
		function handlePanelDrag(params) {
			if (params.isCancelled2) {
				return;
			}
			const position = getPanelPosition();
			if (params.step !== 1 && params._initialPosition !== position) {
				log.logError(`[Chat] Dragged panel position changed from ${params._initialPosition} to ${position}`);
				cancelPanelDrag();
				return;
			}
			switch (params.step) {
			  case 1:
				params._initialPosition = position;
				if (position === rightSide || position === leftSide) {
					params._initialSize = Number.parseInt(getComputedStyle(_chatElement).width, 10);
				} else {
					params._initialSize = Number.parseInt(getComputedStyle(_chatElement).height, 10);
				}
				break;
	
			  case 2:
				if (position === rightSide || position === leftSide) {
					if (params.hasXChanged) {
						const maxSizeValue = Number.parseInt(getComputedStyle(element('player-and-chat')).width, 10) - Number.parseInt(getComputedStyle(element('player')).minWidth, 10);
						_chatElement.width = Math.max(Math.min(position === leftSide ? params._initialSize + params.deltaX : params._initialSize - params.deltaX, maxSizeValue), 0);
						mediaQuery.updateSlowly();
					}
				} else if (params.hasYChanged) {
					const maxSizeValue = Number.parseInt(getComputedStyle(element('player-and-chat')).height, 10) - Number.parseInt(getComputedStyle(element('player')).minHeight, 10);
					_chatElement.height = Math.max(Math.min(position === topSide ? params._initialSize + params.deltaY : params._initialSize - params.deltaY, maxSizeValue), 0);
					mediaQuery.updateSlowly();
				}
				break;
	
			  case 3:
				if (position === rightSide || position === leftSide) {
					settings.set('chatPanelWidth', Number.parseInt(getComputedStyle(_chatElement).width, 10));
				} else {
					settings.set('chatPanelHeight', Number.parseInt(getComputedStyle(_chatElement).height, 10));
				}
				break;
	
			  default:
				assert(false);
			}
		}
		function cancelPanelDrag() {
			draggerModule.cancelDrag('chat-size');
		}
		handleFullscreenChange.normalModeState = -1;
		function handleFullscreenChange(isEnabled) {
			if (isEnabled) {
				if (handleFullscreenChange.normalModeState === -1) {
					handleFullscreenChange.normalModeState = settings.get('chatState');
					if (handleFullscreenChange.normalModeState === chatPanel) {
						settings.set('chatState', chatHidden, true);
						applyPanelState();
					}
				}
			} else if (handleFullscreenChange.normalModeState !== -1) {
				if (handleFullscreenChange.normalModeState === chatPanel) {
					settings.set('chatState', chatPanel);
					applyPanelState();
				} else if (settings.get('chatState') === chatHidden && settings.get('closedChatStateCode') === chatUnloaded) {
					settings.set('chatState', chatUnloaded);
					applyPanelState();
				}
				handleFullscreenChange.normalModeState = -1;
			}
		}
		function restore() {
			applyPanelState();
			applyPanelPosition();
			events.addHandler('drag-handle-drag-chat-size', handlePanelDrag);
			events.addHandler('fullscreen-mode-changed', handleFullscreenChange);
		}
		return {
			restore,
			applyPanelPosition,
			applyUrl,
			saveAndApplyClosedPanelState,
			togglePanelState,
			togglePanelPosition
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.chat = { create };
})();
