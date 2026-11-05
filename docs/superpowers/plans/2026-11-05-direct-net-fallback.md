# Direct Network Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Net Tracker to automatically detect when the user is on direct internet without a VPN, displaying `⚪ DIRECT` instead of falsely triggering `🔴 NO NET` and outage notifications.

**Architecture:** Extend the check loop to test direct unblocked targets (`google.com`, `aparat.com`) whenever primary VPN targets (`bbc.com`, `youtube.com`) fail. In pure state logic, represent direct internet entries in the sliding window so that `NO NET` is strictly reserved for instances where both VPN and direct checks fail for 3 consecutive rounds, while silent transitions occur when switching between VPN and direct internet.

**Tech Stack:** GNOME Shell 42 Extension (GJS / JavaScript), GLib / Gio Subprocess, pure JS state machine.

**Spec:** `docs/superpowers/specs/2026-11-05-direct-net-fallback-design.md`

## Global Constraints
- Target platform: GNOME Shell 42 (Ubuntu 22.04), GJS runtime.
- Pure logic in `state.js` must have zero `imports.gi` dependencies to keep `test.js` runnable with plain `gjs test.js`.
- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`).
- Evidence before assertions: run verification commands and verify outputs.

## Review Focus
1. **VPN disconnect transition:** Moving from VPN (`[140, 140, 140]`) to direct internet (`[140, 140, 'direct']`) must immediately show `⚪ DIRECT` without sending any notification.
2. **Direct to VPN transition:** Moving from direct (`['direct', 'direct']`) back to VPN (`[130]`) must immediately show `🟢 130 ms` without sending any false "Back to normal" unless previously in an outage.
3. **Flapping / dropped packet on direct internet:** When on direct internet, a single dropped check (`['direct', null, 'direct']`) must remain `⚪ DIRECT` and not show orange or red alarms.
4. **Real network outage:** If both VPN and direct checks fail 3 times in a row (`[null, null, null]`), it must transition to `🔴 NO NET` and fire the "Network dead" notification.
5. **Recovery from total outage to direct internet:** If network was dead (`red`) and comes back to direct internet (`grey`), it should clear the outage (`t.bad = false`) and notify "Back to normal".

---

### Task 1: Update pure state machine and tests (`state.js`, `test.js`)

**Files:**
- Modify: `state.js`
- Test: `test.js`

- [ ] **Step 1: Write failing tests in `test.js` for direct network status and transitions**
  Add unit tests for:
  - `S.status(['direct'])` -> `{ color: 'grey', label: 'DIRECT' }`
  - `S.status([140, 'direct'])` -> `{ color: 'grey', label: 'DIRECT' }`
  - `S.status(['direct', null, 'direct'])` -> `{ color: 'grey', label: 'DIRECT' }`
  - `S.status(['direct', null, null, null])` -> `{ color: 'red', label: 'NO NET' }`
  - Notification sequence transitions:
    - Normal VPN to direct: no notifications fired.
    - Direct to normal VPN: no notifications fired.
    - Red to direct: fires "Back to normal".
- [ ] **Step 2: Run `gjs test.js` and confirm test failure**
- [ ] **Step 3: Implement direct status handling in `state.js`**
  - Update `status(w)` to recognize `'direct'` entries in window `w`.
  - If latest entry is `'direct'`, or if all recent non-null entries in `w` are `'direct'`, return `{ color: 'grey', label: 'DIRECT' }`.
  - Ensure `w.slice(-3).every(r => r === null)` correctly marks `NO NET` only when 3 consecutive `null` entries occur.
  - Update `step(t, st, now)` so transitions between VPN (green/yellow) and Direct (grey) do not fire notifications, while recovery from `t.bad` to `grey` fires "Back to normal".
- [ ] **Step 4: Run `gjs test.js` and confirm all tests pass**
- [ ] **Step 5: Commit changes**
  `feat: add direct network status and recovery logic to state machine`

---

### Task 2: Implement direct network fallback check in `extension.js`

**Files:**
- Modify: `extension.js`

- [ ] **Step 1: Refactor host pinging to support separate VPN and Direct host lists**
  - Define `VPN_HOSTS = ['bbc.com', 'youtube.com']` and `DIRECT_HOSTS = ['google.com', 'aparat.com']`.
  - Update `_ping(hosts, c)` to take a list of hosts.
- [ ] **Step 2: Implement fallback logic in `_check()`**
  - First call `await this._ping(VPN_HOSTS, c)`.
  - If latency `ms !== null`: record `ms` in `_win`.
  - If `ms === null`: call `await this._ping(DIRECT_HOSTS, c)`.
  - If direct latency `directMs !== null`: record `'direct'` in `_win`.
  - If direct also fails: record `null` in `_win`.
- [ ] **Step 3: Verify extension logic by manual syntax/static check**
  - Verify with `gjs -c extension.js` or dry-run import.
- [ ] **Step 4: Commit changes**
  `feat: check direct fallback hosts when VPN targets fail`

---

### Task 3: Update metadata, docs, and verify on user system

**Files:**
- Modify: `metadata.json`
- Modify: `README.md`
- Run: `./install.sh`

- [ ] **Step 1: Update `metadata.json` and `README.md`**
  - Update `metadata.json` description/version if appropriate.
  - Update `README.md` to explain Smart Mode and the `⚪ DIRECT` state.
- [ ] **Step 2: Run test suite**
  - Run `gjs test.js` to ensure 100% test pass.
- [ ] **Step 3: Reinstall/reload extension for user system**
  - Run `./install.sh` and toggle extension via `gnome-extensions disable net-tracker@ramin && gnome-extensions enable net-tracker@ramin`.
  - Confirm `gnome-extensions info net-tracker@ramin` shows `State: ENABLED`.
- [ ] **Step 4: Commit changes**
  `docs: update README and metadata for direct network fallback`
