# Split Stream Feature - Goals & Implementation

## Branch: `feature/split-streams`

### Origin
- Branched from: `fix/mv3-and-ffz-detection`
- Base commit: `db1d4d3` (Add split stream URL support in common.js and content.js)

### Goal
Implement a split stream feature allowing users to watch multiple Twitch streams simultaneously in a single browser tab with grid layout, per-stream audio controls, and chat selection.

### User Requirements
1. **Hash-based URL routing**: Use `#channel` instead of `?channel=` for cleaner URLs
2. **Grid layout**: Support 2 simultaneous streams side-by-side
3. **Per-stream audio controls**: Mute/unmute individual streams
4. **Chat selector**: Choose which stream's chat to display, or have separate chat
5. **Trigger**: "Split" button in player UI to activate feature
6. **English naming**: All new code in English (split from Russian codebase refactoring)

### Implementation Plan

#### Phase 1: Foundation (COMPLETED)
- [x] Hash-based URL routing (`#channel` or `#chan1,chan2`)
- [x] `parsePlayerHash()` function in `common.js`
- [x] Update `getPlayerUrl()` and `getSplitPlayerUrl()` for hash URLs
- [x] Add split button to player UI

#### Phase 2: Basic Split View (COMPLETED)
- [x] `initializeVideoContainers()` function in `player.js`
- [x] Iframe-based approach for split streams (each iframe = independent player instance)
- [x] CSS Grid layout for 1 vs 2 stream views
- [x] Skip main player init when in split mode

#### Phase 3: Enhanced Controls (TODO)
- [ ] Per-stream audio controls (mute toggles per iframe)
- [ ] Chat selector dropdown to choose which stream's chat to show
- [ ] Option for separate chat windows per stream
- [ ] Visual indicators for which stream is active/focused

#### Phase 4: Polish (TODO)
- [ ] Replace `prompt()` dialog with proper UI dialog for entering second channel
- [ ] Remember split layout preference
- [ ] Keyboard shortcuts for toggling split view
- [ ] Settings panel integration for split stream options

### Current Implementation Details

#### URL Structure
```
Single stream:  chrome-extension://[ID]/player.html#channelname
Split streams: chrome-extension://[ID]/player.html#chan1,chan2
Legacy support: ?channel=name& ?channels=name1,name2
```

#### File Changes
- **`common.js`**: Added `parsePlayerHash()`, updated URL functions
- **`player.js`**: Added `initializeVideoContainers()`, `addSplitButton()`, null checks for iframe context
- **`player.css`**: Added `.video-container`, `.video-grid`, `.video-grid.split-2`, `.stream-iframe` styles
- **`player.html`**: Added split button to top panel

#### Technical Approach
- **Iframe-based**: Each stream gets its own iframe with full player instance
- **Benefit**: No need to refactor 6300-line `player.js` for multiple video elements
- **Trade-off**: Each iframe is independent (separate audio, chat, controls)

#### Known Issues
- [ ] `player.js` IIFEs may crash in iframe context (null DOM references) - partially fixed
- [ ] Need to test full flow: load single stream → click split → enter second channel → verify side-by-side
- [ ] Per-stream audio controls not yet implemented (iframes handle their own audio)
- [ ] Chat selector not implemented

### Testing Checklist
- [ ] Reload extension in Chrome
- [ ] Open Twitch channel (auto-redirects to player)
- [ ] Click Split button in top panel
- [ ] Enter second channel name
- [ ] Verify two iframes load side-by-side
- [ ] Verify each iframe has independent playback controls
- [ ] Test hash-based URLs directly (`#channel1,channel2`)
- [ ] Test legacy URL fallback (`?channels=chan1,chan2`)

### Next Steps
1. Test current implementation in Chrome
2. Fix any runtime errors in iframe context
3. Implement per-stream audio controls (Phase 3)
4. Implement chat selector (Phase 3)
5. Polish UI and add settings integration (Phase 4)
6. Merge to `fix/mv3-and-ffz-detection` when complete
