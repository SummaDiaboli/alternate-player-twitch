// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		const MIN_DRAG_INTERVAL = 45;
		let _pointerId = NaN;
		let _params = null;
		let _lastDragTimeMs;
		let _initialX, _initialY;
		let _lastX, _lastY;
		function params3(pressedElement, draggedElement) {
			this.pressedElement = pressedElement;
			this.draggedElement = draggedElement;
			this.step = 1;
			this.isCancelled2 = false;
			this.hasXChanged = false;
			this.hasYChanged = false;
			this.deltaX = 0;
			this.deltaY = 0;
		}
		const handlePointerDown = createElementEventHandler(event => {
			if (!Number.isNaN(_pointerId) || event.button !== leftButton) {
				return;
			}
			const pressedElement = event.target.closest('[data-drag-handle]');
			if (pressedElement === null) {
				return;
			}
			_pointerId = event.pointerId;
			_params = new params3(pressedElement, element(pressedElement.getAttribute('data-drag-handle')));
			_lastDragTimeMs = 0;
			_initialX = _lastX = event.clientX;
			_initialY = _lastY = event.clientY;
			log.logOk(`[Drag] Starting drag of ${_params.draggedElement.id} X=${_initialX} Y=${_initialY} id=${_pointerId} type=${event.pointerType} primary=${event.isPrimary}`);
			document.addEventListener('pointermove', handlePointerMove, passiveHandler);
			document.addEventListener('pointerup', handlePointerUpAndCancel, passiveHandler);
			document.addEventListener('pointercancel', handlePointerUpAndCancel);
			events.addHandler('focus-manager-state-changed', handleTabLeave);
			fullscreenMode.getElement().style.setProperty('cursor', getComputedStyle(pressedElement).cursor, 'important');
			fullscreenMode.getElement().classList.add('drag-handle-intercept');
			_params.draggedElement.classList.add('drag-handle');
			events.sendEvent(`drag-handle-dragging-${_params.draggedElement.id}`, _params);
		});
		const handlePointerMove = wrapErrors(event => {
			if (_pointerId === event.pointerId) {
				if ((event.buttons & leftButtonPressed) == 0) {
					endDrag('button released');
				} else {
					const time = performance.now();
					if (time - _lastDragTimeMs >= MIN_DRAG_INTERVAL) {
						_lastDragTimeMs = time;
						_params.hasXChanged = _lastX !== event.clientX;
						_params.hasYChanged = _lastY !== event.clientY;
						if (_params.hasXChanged || _params.hasYChanged) {
							_lastX = event.clientX;
							_lastY = event.clientY;
							_params.step = 2;
							_params.deltaX = _lastX - _initialX;
							_params.deltaY = _lastY - _initialY;
							events.sendEvent(`drag-handle-dragging-${_params.draggedElement.id}`, _params);
						}
					}
				}
			}
		});
		const handlePointerUpAndCancel = wrapErrors(event => {
			if (_pointerId === event.pointerId) {
				endDrag(event.type);
			}
		});
		function handleTabLeave({isActive}) {
			if (!isActive) {
				endDrag('tab inactive');
			}
		}
		function cancelDrag(nodeId) {
			assert(nodeId === void 0 || isNonEmptyString(nodeId));
			if (!Number.isNaN(_pointerId) && (nodeId === void 0 || nodeId === _params.draggedElement.id)) {
				_params.isCancelled2 = true;
				endDrag('operation cancelled');
			}
		}
		function endDrag(reasonText) {
			if (_params.step !== 3) {
				log.logOk(`[Drag] Ending drag: ${reasonText} X=${_lastX} Y=${_lastY}`);
				_params.step = 3;
				events.sendEvent(`drag-handle-dragging-${_params.draggedElement.id}`, _params);
				fullscreenMode.getElement().style.removeProperty('cursor');
				fullscreenMode.getElement().classList.remove('drag-handle-intercept');
				_params.draggedElement.classList.remove('drag-handle');
				document.removeEventListener('pointermove', handlePointerMove, passiveHandler);
				document.removeEventListener('pointerup', handlePointerUpAndCancel, passiveHandler);
				document.removeEventListener('pointercancel', handlePointerUpAndCancel);
				events.removeHandler('focus-manager-state-changed', handleTabLeave);
				_pointerId = NaN;
				_params = null;
			}
		}
		document.addEventListener('pointerdown', handlePointerDown, passiveHandler);
		return {
			cancelDrag
		};
	})();

	TW5.player = TW5.player || {};
	TW5.player.dragger = { create };
})();
