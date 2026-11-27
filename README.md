# Alternate Player for Twitch.tv

A Chrome/Chromium browser extension that replaces the native Twitch player with a custom HLS-based player, giving you full control over buffering, stream quality, chat layout, and playback.

## Background

This project is based on the original **Alternate Player for Twitch.tv** extension. After Chrome and Chromium migrated to **Manifest V3**, the original extension stopped working. MV3 introduced breaking changes to the extension APIs, particularly around request header modification (replacing `webRequest` with `declarativeNetRequest`) and content security policy restrictions that blocked inline script injection.

I found the original source code online and took over maintenance, updating the extension to be fully MV3-compatible and restoring functionality that had broken during the transition.

## What it does

When you visit a Twitch channel page, the extension detects whether the channel is live and redirects you to its own player page instead of the standard Twitch player. This player:

- Fetches the HLS stream directly from Twitch's CDN
- Lets you pick your stream quality and variant manually
- Gives you detailed buffering and playback statistics
- Integrates Twitch chat with configurable layout options
- Supports auto-redirect, which can be toggled by right-clicking the extension button in the nav bar

## Features

- **Custom HLS player**: direct stream fetching with configurable buffering presets, including start playback threshold, buffer size, and concurrent segment downloads
- **Chat integration**: floating or panel chat with configurable position, size, and behaviour; links open in new tabs
- **Raid following**: optional setting that switches the player to the raid destination; raids are detected from the loaded Twitch chat panel
- **FFZ (FrankerFaceZ) support**: automatically injects FFZ into the chat frame when the FFZ extension is installed
- **BTTV (BetterTTV) support**: works via FFZ's ffzap-bttv addon when both are installed, avoiding double-injection conflicts
- **Volume boost**: optional setting to raise the volume above 100% (up to 200%) for quiet streams
- **Theming**: multiple built-in colour presets for the player UI
- **Statistics overlay**: detailed real-time stats including video/audio codec, bitrate, segment info, buffer health, stream delay, and dropped frames
- **Settings import/export**: save and restore your configuration
- **Auto-redirect toggle**: right-click the HTML5 button in the Twitch nav bar to enable or disable auto-redirect per session
- **Mobile Twitch support**: works on `m.twitch.tv` as well

## Installation (developer mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the repository folder

## File overview

| File | Purpose |
|---|---|
| `background.js` | MV3 service worker that detects FFZ/BTTV extensions and injects them into chat |
| `content.js` | Content script on twitch.tv that detects live channels, triggers the redirect, and reports chat raid navigation |
| `src/shared/*.js` | Shared utilities: namespace, messages, logging, settings, i18n, GQL helpers |
| `src/player/*.js` | Player features split from the main player script |
| `player.js` | Custom HLS player entry point, UI, and buffering engine |
| `player.html` | Player page shell |
| `gqltoken.js` | Intercepts Twitch GQL integrity tokens for authenticated stream requests |
| `betterttv.js` | BTTV integration script injected into the chat frame |
| `avalon.js` | Bundled FFZ script injected into the chat frame |
| `rules.json` | declarativeNetRequest rules for header spoofing and chat iframe CSP removal |
| `worker.js` | Web worker for HLS segment processing |
| `wasm.wasm` | WebAssembly module for stream processing |

## Notes

- The codebase uses Russian-language identifiers (Cyrillic variable and function names), inherited from the original source and preserved intentionally
- The extension requires the `management` permission to detect whether FFZ/BTTV are installed so it can inject the right scripts without conflicts