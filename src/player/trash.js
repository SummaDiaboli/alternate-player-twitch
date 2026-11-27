// @ts-nocheck: checked after the module split.
'use strict';

(function () {
	const create = () => (() => {
		class dumpsterInMessageChannel {
			constructor() {
				this._messageChannel = null;
			}
			discard(junkValue) {
				if (isObject(junkValue)) {
					const junkBuffer = junkValue.buffer ? junkValue.buffer : junkValue;
					if (junkBuffer.byteLength) {
						log.logInfo(`[Trash] Discarding ${junkBuffer.byteLength} bytes`);
						if (this._messageChannel === null) {
							this._messageChannel = new MessageChannel();
							this._messageChannel.port2.close();
						}
						this._messageChannel.port1.postMessage(junkBuffer, [ junkBuffer ]);
					}
				}
			}
			burn() {}
		}
		class dumpsterInWorker {
			constructor() {
				this._worker = null;
				this._trashByteCount = 0;
				events.addHandler('control-state-changed', stateNumber => {
					if (stateNumber === streamEndState || stateNumber === stoppedState || stateNumber === repeatState) {
						this.burn();
					}
				});
			}
			discard(junkValue) {
				const DUMPSTER_CAPACITY = 1e7;
				if (isObject(junkValue)) {
					const junkBuffer = junkValue.buffer ? junkValue.buffer : junkValue;
					if (junkBuffer.byteLength) {
						log.logInfo(`[Trash] Discarding ${junkBuffer.byteLength} bytes`);
						if (this._worker === null) {
							this._worker = new Worker('/recycler.js');
						}
						this._trashByteCount += junkBuffer.byteLength;
						this._worker.postMessage(junkBuffer, [ junkBuffer ]);
						if (this._trashByteCount > DUMPSTER_CAPACITY) {
							this.burn();
						}
					}
				}
			}
			burn() {
				if (this._worker !== null) {
					log.logInfo(`[Trash] Disposing ${this._trashByteCount} bytes`);
					this._worker.postMessage(null);
					this._worker = null;
					this._trashByteCount = 0;
				}
			}
		}
		if (isMobileDevice()) {
			return {
				discard: placeholder,
				burn: placeholder
			};
		}
		return getBrowserEngineVersion() < 67 ? new dumpsterInWorker() : new dumpsterInMessageChannel();
	})();

	TW5.player = TW5.player || {};
	TW5.player.trash = { create };
})();
