import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function read(relativePath) {
	return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

export function readJson(relativePath) {
	return JSON.parse(read(relativePath));
}

function makeChrome(messages, storageData, calls) {
	return {
		i18n: {
			getMessage(name, substitution) {
				const entry = messages[name];
				if (!entry || !entry.message) {
					return '';
				}
				let text = entry.message;
				if (substitution !== void 0) {
					text = text.replace(/\$(\d+)/g, (_, index) => substitution[Number(index) - 1] ?? '');
				}
				return text;
			}
		},
		runtime: {
			lastError: void 0,
			getURL(resource) {
				return 'chrome-extension://test/' + resource;
			}
		},
		storage: {
			local: {
				get(_keys, callback) {
					callback({ ...storageData });
				},
				set(values, callback) {
					calls.writes.push({ type: 'set', values: { ...values } });
					Object.assign(storageData, values);
					callback?.();
				},
				remove(keys, callback) {
					const names = Array.isArray(keys) ? keys : [keys];
					calls.writes.push({ type: 'remove', keys: [...names] });
					for (const key of names) delete storageData[key];
					callback?.();
				},
				clear(callback) {
					calls.writes.push({ type: 'clear' });
					for (const key of Object.keys(storageData)) {
						delete storageData[key];
					}
					callback?.();
				}
			}
		}
	};
}

// Loads common.js in a VM with browser APIs stubbed. Top-level declarations in
// common.js stay in the script's lexical scope, so a second script in the same
// context is used to expose the API under test.
export function loadCommon({ locale = 'en', storage = {} } = {}) {
	const messages = readJson(`_locales/${locale}/messages.json`);
	const storageData = { ...storage };
	const calls = { writes: [], logs: [], timers: [] };
	let nextTimer = 1;

	const context = {
		console: {
			log: (...args) => calls.logs.push(['log', ...args]),
			warn: (...args) => calls.logs.push(['warn', ...args]),
			error: (...args) => calls.logs.push(['error', ...args])
		},
		setTimeout(fn, delay) {
			const id = nextTimer++;
			calls.timers.push({ id, fn, delay });
			return id;
		},
		clearTimeout(id) {
			calls.timers = calls.timers.filter(timer => timer.id !== id);
		},
		performance: { now: () => 0 },
		navigator: {
			userAgent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
			userAgentData: {
				brands: [{ brand: 'Chromium', version: '120' }],
				mobile: false
			}
		},
		NodeList: class NodeList {},
		HTMLCollection: class HTMLCollection {},
		window: {
			PointerEvent: class PointerEvent {},
			addEventListener() {},
			location: { reload() {} }
		},
		document: {
			currentScript: void 0,
			getElementById() { return null; },
			querySelectorAll() { return []; },
			createElement() { return { parentNode: { appendChild() {} } }; }
		},
		chrome: makeChrome(messages, storageData, calls)
	};
	context.globalThis = context;

	vm.createContext(context);
	vm.runInContext(read('common.js'), context, { filename: 'common.js' });
	const api = vm.runInContext(`({
		settings,
		i18n,
		getPlayerUrl
	})`, context, { filename: 'test-probe.js' });

	return { ...api, calls, storageData, messages, context };
}
