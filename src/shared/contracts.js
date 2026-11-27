// @ts-check
'use strict';

// Type-only contracts for first-party code. This file is never loaded by
// Chrome; it exists so JSDoc can describe the seams that cross scripts.

/**
 * @typedef {'Raid' | 'ThisChannelIsAlreadyOpen' | 'InsertThirdPartyExtensions'} RuntimeMessageName
 */

/**
 * @typedef {object} RuntimeMessage
 * @property {RuntimeMessageName} [request]
 * @property {string} [requestText]
 * @property {string} [channelCode]
 */

/**
 * @typedef {'auto' | 'en' | 'ru' | 'fr' | 'es' | 'de'} InterfaceLanguage
 */

/**
 * @typedef {'settingsVersion' | 'followRaids' | 'volume2' | 'volumeBoostEnabled' | 'chatState' | 'bufferSize' | 'interfaceLanguage'} SettingKey
 */

/**
 * @typedef {object} SettingsSnapshot
 * @property {number} settingsVersion
 * @property {boolean} followRaids
 * @property {number} volume2
 * @property {boolean} volumeBoostEnabled
 * @property {number} chatState
 * @property {InterfaceLanguage} interfaceLanguage
 */

/**
 * @typedef {string} MessageCode
 */

/**
 * Resolved DOM helper shape used by player-side code.
 * @typedef {(id: string) => any} ElementLookup
 */

/**
 * Player-side worker message after field translation.
 * @typedef {object} WorkerSegment
 * @property {*} dataValue
 * @property {boolean} isGap
 * @property {number} number
 * @property {number} duration
 */

/**
 * @typedef {object} WorkerResult
 * @property {number} [conversionTime]
 * @property {boolean} [isRejected]
 * @property {boolean} [hasVideoLoss]
 * @property {boolean} [hasAudioLoss]
 * @property {number} [audioBitrate]
 * @property {number} [frameRate]
 */
